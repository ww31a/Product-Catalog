import bcrypt from "bcrypt";
import { generateToken } from "../utils/generateToken.js";
import SuperAdminService from '../services/superAdmin.service.js';
import { logActivity, logError, logSecurity } from "../utils/logger.js";

export const superAdminLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();

    const superAdmin = await SuperAdminService.findByEmail(email);
    if (!superAdmin) {
      logSecurity({
        event: "ADMIN_LOGIN_FAILED",
        severity: "warn",
        ip: req.ip,
        message: `Admin login attempt for non-existent email: ${email}`,
      });
      return res.status(404).json({ success: false, message: "Super Admin not found" });
    }

    const match = await bcrypt.compare(password, superAdmin.password);
    if (!match) {
      logSecurity({
        event: "ADMIN_LOGIN_FAILED",
        severity: "warn",
        user: superAdmin._id,
        ip: req.ip,
        message: `Admin login failed (invalid password) for: ${email}`,
      });
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken({
      id: superAdmin._id,
      role: "superadmin",
    });

    logActivity({
      email: superAdmin.email,
      action: "LOGIN",
      role: "Admin",
      status: "success",
      target: superAdmin._id.toString(),
      user: superAdmin._id,
      userTypeModel: "SuperAdmin",
      message: `Admin logged in: ${superAdmin.email}`,
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "superadmin",
      name: superAdmin.name,
    });
  } catch (err) {
    logError({
      error: err,
      context: "Super Admin Login",
      metadata: { email: req.body.email }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const superAdminId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
    }

    const superAdmin = await SuperAdminService.findById(superAdminId);
    if (!superAdmin) {
      return res.status(404).json({ success: false, message: "Super Admin not found" });
    }

    const match = await bcrypt.compare(currentPassword, superAdmin.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, superAdmin.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ success: false, message: "New password cannot be the same as current password" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await SuperAdminService.updatePassword(superAdminId, hash);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });

    logActivity({
      email: superAdmin.email,
      action: "PASSWORD_CHANGE",
      role: "Admin",
      status: "success",
      target: superAdminId.toString(),
      user: superAdminId,
      userTypeModel: "SuperAdmin",
      message: `Admin password changed`,
      ip: req.ip,
      userAgent: req.get("User-Agent")
    });
  } catch (err) {
    logError({
      error: err,
      context: "Super Admin Password Change",
      metadata: { adminId: req.user.id }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSuperAdminProfile = async (req, res) => {
  try {
    const superAdminId = req.user.id;

    const superAdmin = await SuperAdminService.findByIdWithSelect(superAdminId, "-password");
    if (!superAdmin) {
      return res.status(404).json({ success: false, message: "Super Admin not found" });
    }

    res.status(200).json({
      success: true,
      ...superAdmin.toObject() // sends all fields directly
    });
  } catch (err) {
    logError({
      error: err,
      context: "Get Super Admin Profile",
      metadata: { adminId: req.user.id }
    });
    res.status(500).json({ success: false, message: err.message });
  }
};