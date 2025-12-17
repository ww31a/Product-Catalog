import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js';
import AppUser from "../models/appUser.module.js";

export const sellerRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    // Check if seller already exists
    const exists = await AppUser.findOne({ email });
    if (exists) {
      return res.status(400).json({
        message: "Seller already exists"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    // Create new AppUser with role 'seller'
    const newSeller = await AppUser.create({
      name,
      email,
      password: hash,
      roles: ["seller"]
    });

    res.status(201).json({
      message: "Seller registered successfully. Please login to continue."
    });

  } catch (err) {
    console.error("sellerRegister error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const sellerLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();

    // Find seller with role 'seller'
    const seller = await AppUser.findOne({ email, roles: "seller" });
    if (!seller) {
      return res.status(404).json({
        message: "Seller not found"
      });
    }

    // Compare password
    const match = await bcrypt.compare(password, seller.password);
    if (!match) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // Generate JWT with roles array (backward compatible)
    const token = generateToken({
      id: seller._id,
      role: "seller",       // legacy
      roles: seller.roles   // future-proof
    });

    res.status(200).json({
      message: "Login successful",
      token,
      role: "seller", // legacy field for frontend
      name: seller.name
    });

  } catch (err) {
    console.error("sellerLogin error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
