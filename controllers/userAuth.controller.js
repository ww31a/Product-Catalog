import bcrypt from "bcrypt";
import crypto from "crypto";
import { generateToken } from '../utils/generateToken.js';
import { mergeGuestCartIntoUserCart } from "../utils/mergeCart.js";
import AppUserService from "../services/appUser.service.js";
import UserService from "../services/user.service.js";
import { sendVerificationCode } from "../config/email.js";

// ✅ SECURE OTP Generator using crypto
const generateSecureOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// ✅ OTP expiration time (15 minutes)
const OTP_EXPIRY_MINUTES = 15;
const getOTPExpiryTime = () => new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);


export const userRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    // Pre-check
    const exists = await AppUserService.findByEmail(email);
    if (exists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash password + generate OTP
    const hash = await bcrypt.hash(password, 10);
    const verificationCode = generateSecureOTP();

    // Create AppUser
    const newUser = await AppUserService.create({
      name,
      email,
      password: hash,
      roles: ["user"],
      isVerified: false,
      verificationCode,
      verificationCodeType: "EMAIL_VERIFY",
      verificationCodeExpiresAt: getOTPExpiryTime()
    });

    // Create User profile
    await UserService.create({ userId: newUser._id });

    // Send verification email
    try {
      await sendVerificationCode(email, verificationCode);
      return res.status(201).json({
        success: true,
        message: "User registered successfully. Check your email for verification code.",
        expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      return res.status(201).json({
        success: true,
        message: "Registered. Email service temporarily unavailable — use 'Resend Code'.",
        emailFailed: true
      });
    }

  } catch (err) {
    console.error("userRegister error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const verifyEmail = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || !email) return res.status(400).json({ success: false, message: "Email and OTP required" });

    const user = await AppUserService.findByEmail(email.toLowerCase());
    if (
      !user ||
      user.verificationCodeType !== "EMAIL_VERIFY" ||
      user.verificationCode !== otp
    ) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    if (new Date() > user.verificationCodeExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired", expired: true });
    }

    // Mark verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeType = undefined;
    user.verificationCodeExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Please login.",
      redirectToLogin: true
    });

  } catch (err) {
    console.error("verifyEmail error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const userLogin = async (req, res) => {
  try {
    const { password, guestCart } = req.body;
    const email = req.body.email.toLowerCase();

    const user = await AppUserService.findByEmailWithRole(email, "user");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Please verify email before login", requiresVerification: true });
    }

    const userProfile = await UserService.findByUserId(user._id);
    if (!userProfile) return res.status(403).json({ success: false, message: "User profile not initialized" });

    // Merge guest cart
    if (Array.isArray(guestCart) && guestCart.length > 0) {
      await mergeGuestCartIntoUserCart(user._id, guestCart);
    }

    // Generate LOGIN_2FA OTP
    const otp = generateSecureOTP();
    user.verificationCode = otp;
    user.verificationCodeType = "LOGIN_2FA";
    user.verificationCodeExpiresAt = getOTPExpiryTime();
    await user.save();

    await sendVerificationCode(email, otp);

    return res.status(200).json({
      success: true,
      requires2FA: true,
      message: "Verification code sent to your email",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    });

  } catch (err) {
    console.error("userLogin error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const verifyUserLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

    const user = await AppUserService.findByEmail(email.toLowerCase());
    if (
      !user ||
      user.verificationCodeType !== "LOGIN_2FA" ||
      user.verificationCode !== otp
    ) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    if (new Date() > user.verificationCodeExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired", expired: true });
    }

    // Clear OTP
    user.verificationCode = undefined;
    user.verificationCodeType = undefined;
    user.verificationCodeExpiresAt = undefined;
    await user.save();

    // Issue JWT
    const token = generateToken({ id: user._id, role: "user", roles: user.roles });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "user",
      name: user.name
    });

  } catch (err) {
    console.error("verifyUserLoginOTP error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const resendVerificationCode = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const user = await AppUserService.findByEmail(email);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.isVerified && user.verificationCodeType === "EMAIL_VERIFY") {
      return res.status(400).json({ success: false, message: "Email already verified" });
    }

    const otp = generateSecureOTP();
    user.verificationCode = otp;
    user.verificationCodeExpiresAt = getOTPExpiryTime();
    await user.save();

    await sendVerificationCode(email, otp);

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    });

  } catch (err) {
    console.error("resendVerificationCode error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
