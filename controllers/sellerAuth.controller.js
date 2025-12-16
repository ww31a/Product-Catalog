import Seller from "../models/seller.module.js";
import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js'


export const sellerRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();


    const exists = await Seller.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "seller already exists" });

    const hash = await bcrypt.hash(password, 10);

    await Seller.create({
      name,
      email,
      password: hash,
    });

    res.status(201).json({
      message: "seller registered successfully. Please login to continue.",
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const sellerLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();


    const seller = await Seller.findOne({ email });
    if (!seller)
      return res.status(404).json({ message: "seller not found" });

    const match = await bcrypt.compare(password, seller.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken({
      id: seller._id,
      role: "seller",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      role: "seller",
      name: seller.name
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
