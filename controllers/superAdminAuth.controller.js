import bcrypt from "bcrypt";
import { generateToken } from "../utils/generateToken.js";
import SuperAdmin from '../models/superAdmin.module.js';

export const superAdminLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();

    const superAdmin = await SuperAdmin.findOne({ email });
    if (!superAdmin) {
      return res.status(404).json({ success: false, message: "Super Admin not found" });
    }

    const match = await bcrypt.compare(password, superAdmin.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken({
      id: superAdmin._id,
      role: "superadmin",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "superadmin",
      name: superAdmin.name,
    });
  } catch (err) {
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

    const superAdmin = await SuperAdmin.findById(superAdminId);
    if (!superAdmin) {
      return res.status(404).json({ success: false, message: "Super Admin not found" });
    }

    const match = await bcrypt.compare(currentPassword, superAdmin.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    superAdmin.password = hash;
    await superAdmin.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSuperAdminProfile = async (req, res) => {
  try {
    const superAdminId = req.user.id;

    const superAdmin = await SuperAdmin.findById(superAdminId).select("-password");
    if (!superAdmin) {
      return res.status(404).json({ success: false, message: "Super Admin not found" });
    }

    res.status(200).json({
      success: true,
      ...superAdmin.toObject() // sends all fields directly
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
