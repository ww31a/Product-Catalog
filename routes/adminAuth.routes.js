import { Router } from "express";
import { adminLogin, adminRegister } from "../controllers/adminAuth.controller.js";
import limiter from "../middlewares/ratelimit.js";
import { validateBody } from "../middlewares/validateBody.js";
import {signupSchema} from "../utils/JoiValidation.js";
const adminAuthRouter = Router();


adminAuthRouter.post('/signup',limiter,validateBody(signupSchema), adminRegister)
adminAuthRouter.post('/login',limiter, adminLogin)


export default adminAuthRouter;