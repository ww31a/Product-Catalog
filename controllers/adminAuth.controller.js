import Admin from "../models/admin.module.js";
import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js'


export const adminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await Admin.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Admin already exists" });

    const hash = await bcrypt.hash(password, 10);

    await Admin.create({
      name,
      email,
      password: hash,
    });

    res.status(201).json({
      message: "Admin registered successfully. Please login to continue.",
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken({
      id: admin._id,
      role: "admin",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      role: "admin"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
