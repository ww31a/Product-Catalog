import bcrypt from "bcrypt";
import crypto from "crypto";
import { generateToken } from '../utils/generateToken.js';
import AppUserService from "../services/appUser.service.js";
import sellerService from "../services/seller.service.js";
import { sendVerificationCode } from "../config/email.js";
import { logActivity, logError, logSecurity } from "../utils/logger.js";

const generateSecureOTP = () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

const OTP_EXPIRY_MINUTES = 15;

const getOTPExpiryTime = () => {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
};

export const sellerRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    const exists = await AppUserService.findByEmail(email);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Seller already exists",
        requestId: req.requestId
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const verificationCode = generateSecureOTP();

    const seller = await AppUserService.create({
      name,
      email,
      password: hash,
      roles: ["seller"],
      isVerified: false,
      verificationCode,
      verificationCodeType: "EMAIL_VERIFY",
      verificationCodeExpiresAt: getOTPExpiryTime()
    });

    await sellerService.create({ userId: seller._id });

    try {
      await sendVerificationCode(email, verificationCode);

      logActivity({
        email,
        action: "REGISTER",
        role: "Seller",
        status: "success",
        target: seller._id.toString(),
        user: seller._id,
        userTypeModel: "AppUser",
        message: `New seller registered: ${email}`,
        metadata: { requestId: req.requestId },
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });

      return res.status(201).json({
        success: true,
        message: "Registered successfully. Check your email.",
        expiresIn: `${OTP_EXPIRY_MINUTES} minutes`,
        requestId: req.requestId
      });
    } catch (emailError) {
      logError({
        error: emailError,
        context: "Email Service Failure during Seller Registration",
        metadata: { email, requestId: req.requestId }
      });
      return res.status(201).json({
        success: true,
        message: "Registered. Email failed — use resend option.",
        emailFailed: true,
        requestId: req.requestId
      });
    }

  } catch (err) {
    logError({
      error: err,
      context: "Seller Registration",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to register seller", requestId: req.requestId });
  }
};

export const verifySellerEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const seller = await AppUserService.findByEmail(email.toLowerCase());
    if (
      !seller ||
      seller.verificationCodeType !== "EMAIL_VERIFY" ||
      seller.verificationCode !== otp
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
        requestId: req.requestId
      });
    }

    if (new Date() > seller.verificationCodeExpiresAt) {
      logSecurity({
        event: "OTP_EXPIRED",
        severity: "warn",
        user: seller._id,
        ip: req.ip,
        message: `Email verification OTP expired for seller: ${seller.email}`,
        metadata: { requestId: req.requestId }
      });
      return res.status(400).json({
        success: false,
        message: "Verification code expired",
        expired: true,
        requestId: req.requestId
      });
    }

    seller.isVerified = true;
    seller.verificationCode = undefined;
    seller.verificationCodeType = undefined;
    seller.verificationCodeExpiresAt = undefined;
    await seller.save();

    logActivity({
      email: seller.email,
      action: "EMAIL_VERIFY",
      role: "Seller",
      status: "success",
      target: seller._id.toString(),
      user: seller._id,
      userTypeModel: "AppUser",
      message: `Seller email verified: ${seller.email}`,
      metadata: { requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.status(200).json({
      success: true,
      message: "Email verified. Please login.",
      redirectToLogin: true,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "Seller Email Verification",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to verify email", requestId: req.requestId });
  }
};

export const sellerLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();

    const seller = await AppUserService.findByEmailWithRole(email, "seller");
    if (!seller) {
      logSecurity({
        event: "LOGIN_FAILED",
        severity: "warn",
        ip: req.ip,
        message: `Login attempt for non-existent seller: ${email}`,
        metadata: { requestId: req.requestId }
      });
      return res.status(404).json({ success: false, message: "Seller not found", requestId: req.requestId });
    }

    const match = await bcrypt.compare(password, seller.password);
    if (!match) {
      logSecurity({
        event: "LOGIN_FAILED",
        severity: "warn",
        user: seller._id,
        ip: req.ip,
        message: `Invalid password for seller: ${email}`,
        metadata: { requestId: req.requestId }
      });
      return res.status(400).json({ success: false, message: "Invalid credentials", requestId: req.requestId });
    }

    if (!seller.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Verify email before login",
        requiresVerification: true,
        requestId: req.requestId
      });
    }

    const otp = generateSecureOTP();
    seller.verificationCode = otp;
    seller.verificationCodeType = "LOGIN_2FA";
    seller.verificationCodeExpiresAt = getOTPExpiryTime();
    await seller.save();

    try {
      await sendVerificationCode(email, otp);
    } catch (emailError) {
      logError({
        error: emailError,
        context: "Email Service Failure during Seller Login OTP",
        metadata: { email, requestId: req.requestId }
      });
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
      message: "Verification code sent to email",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "Seller Login Initiation",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to initiate login", requestId: req.requestId });
  }
};

export const verifySellerLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const seller = await AppUserService.findByEmail(email.toLowerCase());

    if (
      !seller ||
      seller.verificationCodeType !== "LOGIN_2FA" ||
      seller.verificationCode !== otp
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
        requestId: req.requestId
      });
    }

    if (new Date() > seller.verificationCodeExpiresAt) {
      logSecurity({
        event: "LOGIN_OTP_EXPIRED",
        severity: "warn",
        user: seller._id,
        ip: req.ip,
        message: `Login OTP expired for seller: ${seller.email}`,
        metadata: { requestId: req.requestId }
      });
      return res.status(400).json({
        success: false,
        message: "Verification code expired",
        expired: true,
        requestId: req.requestId
      });
    }

    seller.verificationCode = undefined;
    seller.verificationCodeType = undefined;
    seller.verificationCodeExpiresAt = undefined;
    await seller.save();

    const token = generateToken({
      id: seller._id,
      role: "seller",
      roles: seller.roles
    });

    logActivity({
      email: seller.email,
      action: "LOGIN",
      role: "Seller",
      status: "success",
      target: seller._id.toString(),
      user: seller._id,
      userTypeModel: "AppUser",
      message: `Seller logged in successfully: ${seller.email}`,
      metadata: { requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.status(200).json({
      success: true,
      token,
      role: "seller",
      name: seller.name,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "Seller Login OTP Verification",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to verify login OTP", requestId: req.requestId });
  }
};

export const resendSellerVerificationCode = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();

    const seller = await AppUserService.findByEmail(email);
    if (!seller || !seller.roles.includes("seller")) {
      return res.status(404).json({ success: false, message: "Seller not found", requestId: req.requestId });
    }

    if (seller.isVerified && seller.verificationCodeType === "EMAIL_VERIFY") {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
        requestId: req.requestId
      });
    }

    const otp = generateSecureOTP();
    seller.verificationCode = otp;
    seller.verificationCodeExpiresAt = getOTPExpiryTime();
    await seller.save();

    await sendVerificationCode(email, otp);

    logActivity({
      email,
      action: "RESEND_CODE",
      role: "Seller",
      status: "success",
      user: seller._id,
      userTypeModel: "AppUser",
      message: `Verification code resent to seller: ${email}`,
      metadata: { requestId: req.requestId },
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.status(200).json({
      success: true,
      message: "Verification code sent",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`,
      requestId: req.requestId
    });

  } catch (err) {
    logError({
      error: err,
      context: "Resend Seller Verification Code",
      metadata: { email: req.body.email, requestId: req.requestId }
    });
    return res.status(500).json({ success: false, error: true, message: "Failed to resend verification code", requestId: req.requestId });
  }
};
