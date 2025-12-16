import { registerAdmin,loginAdmin } from "../service/adminAuth.service.js";
export const adminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await registerAdmin(name, email, password);
    res.status(201).json(result);
  } catch (err) {
    const statusCode = err.message === "Admin already exists" ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginAdmin(email, password);
    res.status(200).json(result);
  } catch (err) {
    let statusCode = 500;
    if (err.message === "Admin not found") statusCode = 404;
    if (err.message === "Invalid credentials") statusCode = 400;
    res.status(statusCode).json({ success: false, message: err.message });
  }
};