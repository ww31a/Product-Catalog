import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js';
import AppUserService from "../services/appUser.service.js";
import sellerService from "../services/seller.service.js";


export const sellerRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    // Check if seller already exists
    const exists = await AppUserService.findByEmail(email);
    if (exists) {
      return res.status(400).json({
        message: "Seller already exists"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    // Create new AppUser with role 'seller'
    const newSeller = await AppUserService.create({
      name,
      email,
      password: hash,
      roles: ["seller"]
    });

    console.log("AppUser ID:", newSeller._id);

    const newSellerProfile = await sellerService.create({
      userId: newSeller._id,
    })

    console.log("Seller profile created:", newSellerProfile);


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

    // 3. Ensure Seller profile exists and is linked correctly
    const sellerProfile = await sellerService.findByUserId(seller._id);
    if (!sellerProfile || sellerProfile.userId.toString() !== seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Seller profile not initialized or mislinked"
      });
    }

    // 4. Generate JWT
    const token = generateToken({
      id: seller._id,
      role: "seller",        // legacy
      roles: seller.roles    // future-proof
    });

    // 5. Respond
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
