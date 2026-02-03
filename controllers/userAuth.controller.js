import bcrypt from "bcrypt";
import crypto from "crypto";
import { generateToken } from '../utils/generateToken.js';
import { mergeGuestCartIntoUserCart } from "../utils/mergeCart.js";
import AppUserService from "../services/appUser.service.js";
import UserService from "../services/user.service.js";
import { sendVerificationCode } from "../config/email.js";
import { logActivity, logError, logSecurity } from "../utils/logger.js";
import { logQuery } from "../utils/logQuery.js";

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
    const exists = await logQuery(req, 'AppUserService.findByEmail', () => AppUserService.findByEmail(email));
    if (exists) {
      return res.status(400).json({ success: false, message: "User already exists", requestId: req.requestId });
    }

    // Hash password + generate OTP
    const hash = await bcrypt.hash(password, 10);
    const verificationCode = generateSecureOTP();

    // Create AppUser
    const newUser = await logQuery(req, 'AppUserService.create', () => AppUserService.create({
      name,
      email,
      password: hash,
      roles: ["user"],
      isVerified: false,
      verificationCode,
      verificationCodeType: "EMAIL_VERIFY",
      verificationCodeExpiresAt: getOTPExpiryTime()
    }));

    // Create User profile
    await logQuery(req, 'UserService.create', () => UserService.create({ userId: newUser._id }));

    // Send verification email
    try {
      await sendVerificationCode(email, verificationCode);

      logActivity({
        email,
        action: "REGISTER",
        role: "User",
        status: "success",
        target: newUser._id.toString(),
        user: newUser._id,
        userTypeModel: "AppUser",
        message: `New user registered: ${email}`,
        metadata: { requestId: req.requestId },
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });

      return res.status(201).json({
        success: true,
        message: "User registered successfully. Check your email for verification code.",
        expiresIn: `${OTP_EXPIRY_MINUTES} minutes`,
        requestId: req.requestId
      });
    } catch (emailError) {
      logError({
        error: emailError,
        context: "Email Service Failure during Registration",
        metadata: { email, requestId: req.requestId }
      });
      return res.status(201).json({
        success: true,
        message: "Registered. Email service temporarily unavailable — use 'Resend Code'.",
        emailFailed: true,
        requestId: req.requestId
      });
    }

  } catch (err) {
    logError({
      error: err,
      context: "User Registration",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to register user", requestId: req.requestId });
  }
};


export const verifyEmail = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || !email) return res.status(400).json({ success: false, message: "Email and OTP required", requestId: req.requestId });

    const user = await logQuery(req, 'AppUserService.findByEmail', () => AppUserService.findByEmail(email.toLowerCase()));
    if (
      !user ||
      user.verificationCodeType !== "EMAIL_VERIFY" ||
      user.verificationCode !== otp
    ) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code", requestId: req.requestId });
    }

    if (new Date() > user.verificationCodeExpiresAt) {
      logSecurity({
        event: "OTP_EXPIRED",
        severity: "warn",
        user: user._id,
        ip: req.ip,
        message: `Email verification OTP expired for ${user.email}`,
        metadata: { requestId: req.requestId }
      });
      return res.status(400).json({ success: false, message: "OTP expired", expired: true, requestId: req.requestId });
    }

    // Mark verified
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeType = undefined;
    user.verificationCodeExpiresAt = undefined;
    await logQuery(req, 'User.save (verifyEmail)', () => user.save());

    logActivity({
      email: user.email,
      action: "EMAIL_VERIFY",
      role: "User",
      status: "success",
      target: user._id.toString(),
      user: user._id,
      userTypeModel: "AppUser",
      message: `User email verified: ${user.email}`,
      metadata: { requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Please login.",
      redirectToLogin: true,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "Email Verification",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to verify email", requestId: req.requestId });
  }
};


export const userLogin = async (req, res) => {
  try {
    const { password, guestCart } = req.body;
    const email = req.body.email.toLowerCase();

    const user = await logQuery(req, 'AppUserService.findByEmailWithRole', () => AppUserService.findByEmailWithRole(email, "user"));
    if (!user) {
      logSecurity({
        event: "LOGIN_FAILED",
        severity: "warn",
        ip: req.ip,
        message: `Login attempt for non-existent user: ${email}`,
        metadata: { requestId: req.requestId }
      });
      return res.status(404).json({ success: false, message: "User not found", requestId: req.requestId });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logSecurity({
        event: "LOGIN_FAILED",
        severity: "warn",
        user: user._id,
        ip: req.ip,
        message: `Invalid password for user: ${email}`,
        metadata: { requestId: req.requestId }
      });
      return res.status(400).json({ success: false, message: "Invalid credentials", requestId: req.requestId });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Please verify email before login", requiresVerification: true, requestId: req.requestId });
    }

    const userProfile = await logQuery(req, 'UserService.findByUserId', () => UserService.findByUserId(user._id));
    if (!userProfile) return res.status(403).json({ success: false, message: "User profile not initialized", requestId: req.requestId });

    // Merge guest cart
    if (Array.isArray(guestCart) && guestCart.length > 0) {
      await logQuery(req, 'mergeGuestCartIntoUserCart', () => mergeGuestCartIntoUserCart(user._id, guestCart));
    }

    // Generate LOGIN_2FA OTP
    const otp = generateSecureOTP();
    user.verificationCode = otp;
    user.verificationCodeType = "LOGIN_2FA";
    user.verificationCodeExpiresAt = getOTPExpiryTime();
    await logQuery(req, 'User.save (userLogin)', () => user.save());

    try {
      await sendVerificationCode(email, otp);
    } catch (emailError) {
      logError({
        error: emailError,
        context: "Email Service Failure during Login OTP",
        metadata: { email, requestId: req.requestId }
      });
      // We still return 200 because the user is registered/authed, but tell them to resend
      return res.status(200).json({
        success: true,
        requires2FA: true,
        message: "Authentication successful, but email delivery failed. Please use 'Resend Code'.",
        emailFailed: true,
        requestId: req.requestId
      });
    }

    return res.status(200).json({
      success: true,
      requires2FA: true,
      message: "Verification code sent to your email",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "User Login Initiation",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to initiate login", requestId: req.requestId });
  }
};


export const verifyUserLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required", requestId: req.requestId });

    const user = await logQuery(req, 'AppUserService.findByEmail', () => AppUserService.findByEmail(email.toLowerCase()));
    if (
      !user ||
      user.verificationCodeType !== "LOGIN_2FA" ||
      user.verificationCode !== otp
    ) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code", requestId: req.requestId });
    }

    if (new Date() > user.verificationCodeExpiresAt) {
      logSecurity({
        event: "LOGIN_OTP_EXPIRED",
        severity: "warn",
        user: user._id,
        ip: req.ip,
        message: `Login OTP expired for ${user.email}`,
        metadata: { requestId: req.requestId }
      });
      return res.status(400).json({ success: false, message: "OTP expired", expired: true, requestId: req.requestId });
    }

    // Clear OTP
    user.verificationCode = undefined;
    user.verificationCodeType = undefined;
    user.verificationCodeExpiresAt = undefined;
    await logQuery(req, 'User.save (verifyUserLoginOTP)', () => user.save());

    // Issue JWT
    const token = generateToken({ id: user._id, role: "user", roles: user.roles });

    logActivity({
      email: user.email,
      action: "LOGIN",
      role: "User",
      status: "success",
      target: user._id.toString(),
      user: user._id,
      userTypeModel: "AppUser",
      message: `User logged in successfully: ${user.email}`,
      metadata: { requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "user",
      name: user.name,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "Login OTP Verification",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to verify login OTP", requestId: req.requestId });
  }
};


export const resendVerificationCode = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const user = await logQuery(req, 'AppUserService.findByEmail', () => AppUserService.findByEmail(email));

    if (!user) return res.status(404).json({ success: false, message: "User not found", requestId: req.requestId });

    if (user.isVerified && user.verificationCodeType === "EMAIL_VERIFY") {
      return res.status(400).json({ success: false, message: "Email already verified", requestId: req.requestId });
    }

    const otp = generateSecureOTP();
    user.verificationCode = otp;
    user.verificationCodeExpiresAt = getOTPExpiryTime();
    await logQuery(req, 'User.save (resendVerificationCode)', () => user.save());

    await sendVerificationCode(email, otp);

    logActivity({
      email,
      action: "RESEND_CODE",
      role: "User",
      status: "success",
      user: user._id,
      userTypeModel: "AppUser",
      message: `Verification code resent to: ${email}`,
      metadata: { requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "Resend Verification Code",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to resend verification code", requestId: req.requestId });
  }
};
