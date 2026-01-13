import bcrypt from "bcrypt";
import crypto from "crypto";
import { generateToken } from '../utils/generateToken.js';
import AppUserService from "../services/appUser.service.js";
import sellerService from "../services/seller.service.js";
import { sendVerificationCode } from "../config/email.js";

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
        message: "Seller already exists"
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
    } catch {
      return res.status(201).json({
        success: true,
        message: "Registered. Email failed — use resend option.",
        emailFailed: true
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registered successfully. Check your email.",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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
        message: "Invalid or expired verification code"
      });
    }

    if (new Date() > seller.verificationCodeExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired",
        expired: true
      });
    }

    seller.isVerified = true;
    seller.verificationCode = undefined;
    seller.verificationCodeType = undefined;
    seller.verificationCodeExpiresAt = undefined;
    await seller.save();

    return res.status(200).json({
      success: true,
      message: "Email verified. Please login.",
      redirectToLogin: true
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const sellerLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();

    const seller = await AppUserService.findByEmailWithRole(email, "seller");
    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const match = await bcrypt.compare(password, seller.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    if (!seller.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Verify email before login",
        requiresVerification: true
      });
    }

    const otp = generateSecureOTP();
    seller.verificationCode = otp;
    seller.verificationCodeType = "LOGIN_2FA";
    seller.verificationCodeExpiresAt = getOTPExpiryTime();
    await seller.save();

    await sendVerificationCode(email, otp);

    return res.status(200).json({
      success: true,
      requires2FA: true,
      message: "Verification code sent to email",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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
        message: "Invalid or expired verification code"
      });
    }

    if (new Date() > seller.verificationCodeExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired",
        expired: true
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

    return res.status(200).json({
      success: true,
      token,
      role: "seller",
      name: seller.name
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};



export const resendSellerVerificationCode = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();

    const seller = await AppUserService.findByEmail(email);
    if (!seller || !seller.roles.includes("seller")) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    if (seller.isVerified && seller.verificationCodeType === "EMAIL_VERIFY") {
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    const otp = generateSecureOTP();
    seller.verificationCode = otp;
    seller.verificationCodeExpiresAt = getOTPExpiryTime();
    await seller.save();

    await sendVerificationCode(email, otp);

    return res.status(200).json({
      success: true,
      message: "Verification code sent",
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
