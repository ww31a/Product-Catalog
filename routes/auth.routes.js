import { Router } from "express";
import { adminLogin } from "../controllers/auth.controller.js";
import limiter from "../middlewares/ratelimit.js";
const authrouter = Router();

authrouter.post('/login',limiter, adminLogin)


export default authrouter;