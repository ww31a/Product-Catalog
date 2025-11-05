import { Router } from "express";
import { adminLogin, adminLogout } from "../controllers/auth.controller.js";
const authrouter = Router();

authrouter.post('/login', adminLogin)
authrouter.post('/logout', adminLogout)

export default authrouter;