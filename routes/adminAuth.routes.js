import { Router } from "express";
import { adminLogin } from "../controllers/adminAuth.controller.js";
import limiter from "../middlewares/ratelimit.js";
const adminAuthRouter = Router();

adminAuthRouter.post('/login',limiter, adminLogin)


export default adminAuthRouter;