import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js'
import User from "../models/user.module.js";

export const userRegister = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "User already exists" });

    const hash = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hash,
    });

    res.status(201).json({
      message: "User registered successfully. Please login to continue.",
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const userLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();


    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken({
      id: user._id,
      role: "user",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      role: "user",
      name: user.name
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
