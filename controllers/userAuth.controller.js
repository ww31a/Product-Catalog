import bcrypt from "bcrypt";
import crypto from "crypto";
import { generateToken } from '../utils/generateToken.js';
import { mergeGuestCartIntoUserCart } from "../utils/mergeCart.js";
import AppUserService from "../services/appUser.service.js";
import UserService from "../services/user.service.js";
import { sendVerificationCode } from "../config/email.js";

// ✅ SECURE OTP Generator using crypto
const generateSecureOTP = () => {
  // Generate cryptographically secure random 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

// ✅ OTP expiration time (15 minutes)
const OTP_EXPIRY_MINUTES = 15;

const getOTPExpiryTime = () => {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
};

export const userRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    // 1. Optional pre-check
    const exists = await AppUserService.findByEmail(email);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // 2. Hash password and generate secure verification code
    const hash = await bcrypt.hash(password, 10);
    const verificationCode = generateSecureOTP();
    const verificationCodeExpiresAt = getOTPExpiryTime();

    // 3. Create AppUser FIRST
    let newUser;
    try {
      newUser = await AppUserService.create({
        name,
        email,
        password: hash,
        roles: ["user"],
        verificationCode,
        verificationCodeExpiresAt,
        isVerified: false
      });
      console.log("AppUser ID:", newUser._id);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists"
        });
      }
      throw err;
    }

    // 4. Create User profile
    const newUserProfile = await UserService.create({ userId: newUser._id });
    console.log("User profile created:", newUserProfile);

    // 5. Send verification email (don't block registration if it fails)
    try {
      await sendVerificationCode(email, verificationCode);
      return res.status(201).json({
        success: true,
        message: "User registered successfully. Please check your email for verification code.",
        expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      return res.status(201).json({
        success: true,
        message: "User registered successfully. Email service temporarily unavailable - please use 'Resend Code' option.",
        emailFailed: true
      });
    }

  } catch (err) {
    console.error("userRegister error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


export const userLogin = async (req, res) => {
  try {
    const { password, guestCart } = req.body;
    const email = req.body.email.toLowerCase();

    // 1. Find AppUser with user role
    const user = await AppUserService.findByEmailWithRole(email, "user");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 2. Validate password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // 3. Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        requiresVerification: true
      });
    }

    // 4. Ensure User profile exists (CRITICAL)
    const userProfile = await UserService.findByUserId(user._id);
    if (!userProfile) {
      return res.status(403).json({
        success: false,
        message: "User profile not initialized"
      });
    }

    // 5. Merge guest cart safely
    if (Array.isArray(guestCart) && guestCart.length > 0) {
      await mergeGuestCartIntoUserCart(user._id, guestCart);
    }

    // 6. Generate JWT
    const token = generateToken({
      id: user._id,
      role: "user",
      roles: user.roles
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "user",
      name: user.name
    });

  } catch (err) {
    console.error("userLogin error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required"
      });
    }

    // Find user by BOTH email and verification code
    const user = await AppUserService.findByEmailAndCode(email.toLowerCase(), otp);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    // ✅ CHECK OTP EXPIRATION
    if (user.verificationCodeExpiresAt && new Date() > user.verificationCodeExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
        expired: true
      });
    }

    // Verify this is a user, not a seller
    if (!user.roles.includes("user")) {
      return res.status(403).json({
        success: false,
        message: "Invalid user type"
      });
    }

    // ✅ Mark user as verified and clear OTP data
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Please login to continue.",
      redirectToLogin: true
    });

  } catch (err) {
    console.error("verifyEmail error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const resendVerificationCode = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();

    const user = await AppUserService.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    // ✅ Generate new secure verification code with expiry
    const verificationCode = generateSecureOTP();
    const verificationCodeExpiresAt = getOTPExpiryTime();
    
    user.verificationCode = verificationCode;
    user.verificationCodeExpiresAt = verificationCodeExpiresAt;
    await user.save();

    // Send new code
    await sendVerificationCode(user.email, verificationCode);

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    });

  } catch (err) {
    console.error("resendVerificationCode error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};