import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js';
import { mergeGuestCartIntoUserCart } from "../utils/mergeCart.js";
import AppUserService from "../services/appUser.service.js";
import UserService from "../services/user.service.js";

export const userRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    // 1. Check if AppUser already exists
    const exists = await AppUserService.findByEmail(email);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // 2. Hash password
    const hash = await bcrypt.hash(password, 10);

    // 3. Create AppUser
    const newUser = await AppUserService.create({
      name,
      email,
      password: hash,
      roles: ["user"]
    });

    // 4. Create User profile (CRITICAL)
    await UserService.create({
      userId: newUser._id
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please login to continue."
    });

  } catch (err) {
    console.error("userRegister error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const userLogin = async (req, res) => {
  try {
    const { password, guestCart } = req.body;
    const email = req.body.email.toLowerCase();

    // 1. Find AppUser with user role
    const user = await AppUserService.findByEmailWithRole(email, "user");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 2. Validate password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // 3. Ensure User profile exists (CRITICAL)
    const userProfile = await UserService.findByUserId(user._id);
    if (!userProfile) {
      return res.status(403).json({
        success: false,
        message: "User profile not initialized"
      });
    }

    // 4. Merge guest cart safely
    if (Array.isArray(guestCart) && guestCart.length > 0) {
      await mergeGuestCartIntoUserCart(user._id, guestCart);
    }

    // 5. Generate JWT
    const token = generateToken({
      id: user._id,
      role: "user",     // legacy
      roles: user.roles // future-proof
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "user",
      name: user.name
    });

  } catch (err) {
    console.error("userLogin error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};