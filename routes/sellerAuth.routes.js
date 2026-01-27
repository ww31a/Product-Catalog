import { Router } from "express";
import { sellerLogin, sellerRegister, verifySellerEmail, verifySellerLoginOTP, resendSellerVerificationCode } from '../controllers/sellerAuth.controller.js'
import { authLimiter } from "../middlewares/ratelimit.js";
import { validateBody } from "../middlewares/validateBody.js";
import { signupSchema } from "../utils/JoiValidation.js";
const sellerAuthRouter = Router();


sellerAuthRouter.post('/signup', authLimiter, validateBody(signupSchema), sellerRegister)
sellerAuthRouter.post('/login', authLimiter, sellerLogin)
sellerAuthRouter.post('/verify-email', authLimiter, verifySellerEmail)
sellerAuthRouter.post('/verify-login-otp', authLimiter, verifySellerLoginOTP)
sellerAuthRouter.post('/resend-otp', authLimiter, resendSellerVerificationCode)



export default sellerAuthRouter;