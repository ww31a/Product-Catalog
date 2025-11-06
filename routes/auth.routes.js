import { Router } from "express";
import { adminLogin, adminLogout } from "../controllers/auth.controller.js";
import limiter from "../middlewares/ratelimit.js";
import { checkToken } from "../controllers/checkadmin.controller.js";
const authrouter = Router();

authrouter.post('/login',limiter, adminLogin)
authrouter.post('/logout', adminLogout)

authrouter.get("/me",checkToken);

export default authrouter;