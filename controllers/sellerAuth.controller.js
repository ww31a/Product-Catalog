import bcrypt from "bcrypt";
import crypto from "crypto";
import { generateToken } from '../utils/generateToken.js';
import AppUserService from "../services/appUser.service.js";
import sellerService from "../services/seller.service.js";
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

export const sellerRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    // 1. Check if seller already exists
    const exists = await AppUserService.findByEmail(email);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Seller already exists"
      });
    }

    // 2. Hash password and generate secure verification code
    const hash = await bcrypt.hash(password, 10);
    const verificationCode = generateSecureOTP();
    const verificationCodeExpiresAt = getOTPExpiryTime();

    // 3. Create AppUser FIRST (so we don't lose data if email fails)
    let newSeller;
    try {
      newSeller = await AppUserService.create({
        name,
        email,
        password: hash,
        roles: ["seller"],
        verificationCode,
        verificationCodeExpiresAt,
        isVerified: false
      });
      console.log("AppUser ID:", newSeller._id);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Seller with this email already exists"
        });
      }
      throw err;
    }

    // 4. Create Seller profile
    const newSellerProfile = await sellerService.create({
      userId: newSeller._id,
    });
    console.log("Seller profile created:", newSellerProfile);

    // 5. Try to send email (don't block registration if email fails)
    try {
      await sendVerificationCode(email, verificationCode);
      return res.status(201).json({
        success: true,
        message: "Seller registered successfully. Please check your email for verification code.",
        expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      // Seller is created, just email failed
      return res.status(201).json({
        success: true,
        message: "Seller registered successfully. Email service temporarily unavailable - please use 'Resend Code' option.",
        emailFailed: true
      });
    }

  } catch (err) {
    console.error("sellerRegister error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const sellerLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();

    // 1. Find AppUser with seller role
    const seller = await AppUserService.findByEmailWithRole(email, "seller");
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    // 2. Validate password
    const match = await bcrypt.compare(password, seller.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // 3. Check if email is verified
    if (!seller.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        requiresVerification: true
      });
    }

    // 4. Ensure Seller profile exists and is linked correctly
    const sellerProfile = await sellerService.findByUserId(seller._id);
    if (!sellerProfile || sellerProfile.userId.toString() !== seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Seller profile not initialized or mislinked"
      });
    }

    // 5. Generate JWT
    const token = generateToken({
      id: seller._id,
      role: "seller",
      roles: seller.roles
    });

    // 6. Respond
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "seller",
      name: seller.name
    });

  } catch (err) {
    console.error("sellerLogin error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const verifySellerEmail = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required"
      });
    }

    // Find seller by BOTH email and verification code
    const seller = await AppUserService.findByEmailAndCode(email.toLowerCase(), otp);

    if (!seller) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    // ✅ CHECK OTP EXPIRATION
    if (seller.verificationCodeExpiresAt && new Date() > seller.verificationCodeExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
        expired: true
      });
    }

    // Verify this is a seller, not a user
    if (!seller.roles.includes("seller")) {
      return res.status(403).json({
        success: false,
        message: "Invalid seller account"
      });
    }

    // ✅ Mark seller as verified and clear OTP data
    seller.isVerified = true;
    seller.verificationCode = undefined;
    seller.verificationCodeExpiresAt = undefined;
    await seller.save();

    // Don't return token - redirect to login instead
    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Please login to continue.",
      redirectToLogin: true
    });

  } catch (err) {
    console.error("verifySellerEmail error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const resendSellerVerificationCode = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();

    const seller = await AppUserService.findByEmail(email);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    // Verify this is a seller account
    if (!seller.roles.includes("seller")) {
      return res.status(403).json({
        success: false,
        message: "Invalid seller account"
      });
    }

    if (seller.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    // ✅ Generate new secure verification code with expiry
    const verificationCode = generateSecureOTP();
    const verificationCodeExpiresAt = getOTPExpiryTime();
    
    seller.verificationCode = verificationCode;
    seller.verificationCodeExpiresAt = verificationCodeExpiresAt;
    await seller.save();

    // Send new code
    try {
      await sendVerificationCode(email, verificationCode);
    } catch (emailError) {
      return res.status(500).json({
        success: false, 
        message: "Cannot send verification code"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    });

  } catch (err) {
    console.error("resendSellerVerificationCode error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};