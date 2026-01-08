import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js';
import AppUserService from "../services/appUser.service.js";
import sellerService from "../services/seller.service.js";
import { sendVerificationCode } from "../config/email.js";


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

    // 2. Hash password and generate verification code
    const hash = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Test email sending FIRST (before creating seller)
    try {
      await sendVerificationCode(email, verificationCode);
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later."
      });
    }

    // 4. Create AppUser with role 'seller' and isVerified: false
    const newSeller = await AppUserService.create({
      name,
      email,
      password: hash,
      roles: ["seller"],
      verificationCode,
      isVerified: false
    });

    console.log("AppUser ID:", newSeller._id);

    // 5. Create Seller profile (CRITICAL)
    const newSellerProfile = await sellerService.create({
      userId: newSeller._id,
    });

    console.log("Seller profile created:", newSellerProfile);

    return res.status(201).json({
      success: true,
      message: "Seller registered successfully. Please check your email for verification code."
    });

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
    // Accept both 'code' and 'otp' field names
    const {  otp, email } = req.body;
    
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

    // Verify this is a seller, not a user
    if (!seller.roles.includes("seller")) {
      return res.status(403).json({
        success: false,
        message: "Invalid seller account"
      });
    }

    // Mark seller as verified
    seller.isVerified = true;
    seller.verificationCode = undefined;
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

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    seller.verificationCode = verificationCode;
    await seller.save();

    // Send new code
    await sendVerificationCode(seller.email, verificationCode);

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email"
    });

  } catch (err) {
    console.error("resendSellerVerificationCode error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};