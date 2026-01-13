import { Router } from "express";
import {sellerLogin, sellerRegister, verifySellerEmail,verifySellerLoginOTP,resendSellerVerificationCode} from '../controllers/sellerAuth.controller.js'
import limiter from "../middlewares/ratelimit.js";
import { validateBody } from "../middlewares/validateBody.js";
import {signupSchema} from "../utils/JoiValidation.js";
const sellerAuthRouter = Router();


sellerAuthRouter.post('/signup',limiter,validateBody(signupSchema), sellerRegister)
sellerAuthRouter.post('/login',limiter, sellerLogin)
sellerAuthRouter.post('/verify-email',limiter, verifySellerEmail)
sellerAuthRouter.post('/verify-login-otp',limiter, verifySellerLoginOTP)
sellerAuthRouter.post('/resend-otp',limiter,resendSellerVerificationCode)



export default sellerAuthRouter;