import Admin from "../models/admin.module.js";
import bcrypt from "bcrypt";
import { generateToken } from '../utils/generateToken.js';

export const registerAdmin = async (name, email, password) => {
  const normalizedEmail = email.toLowerCase();

  const exists = await Admin.findOne({ email: normalizedEmail });
  if (exists) {
    throw new Error("Admin already exists");
  }

  const hash = await bcrypt.hash(password, 10);

  await Admin.create({
    name,
    email: normalizedEmail,
    password: hash,
  });

  return { success: true, message: "Admin registered successfully. Please login to continue." };
};

export const loginAdmin = async (email, password) => {
  const normalizedEmail = email.toLowerCase();

  const admin = await Admin.findOne({ email: normalizedEmail });
  if (!admin) {
    throw new Error("Admin not found");
  }

  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken({
    id: admin._id,
    role: "admin",
  });

  return {
    success: true,
    message: "Login successful",
    token,
    role: "admin",
    name: admin.name,
  };
};