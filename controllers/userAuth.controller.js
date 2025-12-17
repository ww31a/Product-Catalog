import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js';
import AppUser from "../models/AppUser.module.js";
import User from "../models/user.module.js";
import { mergeGuestCartIntoUserCart } from "../utils/mergeCart.js";

export const userRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    // Check if user already exists
    const exists = await AppUser.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    // Create new AppUser with role 'user'
    const newUser = await AppUser.create({
      name,
      email,
      password: hash,
      roles: ["user"]
    });

    await User.create({
      userId: newUser._id,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please login to continue."
    });

  } catch (err) {
    console.error("userRegister error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const userLogin = async (req, res) => {
  try {
    const { password, guestCart } = req.body;
    const email = req.body.email.toLowerCase();

    // Find user with role 'user'
    const user = await AppUser.findOne({ email, roles: "user" });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Merge guest cart if exists
    if (guestCart?.length > 0) {
      await mergeGuestCartIntoUserCart(user._id, guestCart);
    }

    // Generate JWT with roles array (backward compatible)
    const token = generateToken({
      id: user._id,
      role: "user", // legacy for old frontend
      roles: user.roles
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "user",
      name: user.name
    });

  } catch (err) {
    console.error("userLogin error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
