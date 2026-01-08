import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js';
import { mergeGuestCartIntoUserCart } from "../utils/mergeCart.js";
import AppUserService from "../services/appUser.service.js";
import UserService from "../services/user.service.js";
import { sendVerificationCode } from "../config/email.js";

export const userRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    // 1. Check if AppUser already exists
    const exists = await AppUserService.findByEmail(email);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // 2. Hash password and generate verification code
    const hash = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Test email sending FIRST (before creating user)
    try {
      await sendVerificationCode(email, verificationCode);
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later."
      });
    }

    // 4. Create AppUser with isVerified: false (only after email succeeds)
    const newUser = await AppUserService.create({
      name,
      email,
      password: hash,
      roles: ["user"],
      verificationCode,
      isVerified: false
    });

    // 5. Create User profile (CRITICAL)
    await UserService.create({
      userId: newUser._id
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please check your email for verification code."
    });

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
    const { otp, email } = req.body; // ✅ FIXED: Get email from request
    
    if (!otp || !email) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required"
      });
    }

    // ✅ FIXED: Find user by BOTH email and verification code
    const user = await AppUserService.findByEmailAndCode(email.toLowerCase(), otp);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    // ✅ FIXED: Verify this is a user, not a seller
    if (!user.roles.includes("user")) {
      return res.status(403).json({
        success: false,
        message: "Invalid user type"
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    // ✅ FIXED: Don't return token - redirect to login instead
    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Please login to continue.",
      redirectToLogin: true // Frontend should redirect to login page
    });

  } catch (err) {
    console.error("verifyEmail error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Optional: Resend verification code
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

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    await user.save();

    // Send new code
    await sendVerificationCode(user.email, verificationCode);

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email"
    });

  } catch (err) {
    console.error("resendVerificationCode error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};