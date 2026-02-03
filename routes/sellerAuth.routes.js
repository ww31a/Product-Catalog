import { Router } from "express";
import { sellerLogin, sellerRegister, verifySellerEmail, verifySellerLoginOTP, resendSellerVerificationCode } from '../controllers/sellerAuth.controller.js'
import { authLimiter } from "../middlewares/ratelimit.js";
import { validateBody } from "../middlewares/validateBody.js";
import { signupSchema } from "../utils/JoiValidation.js";
const sellerAuthRouter = Router();


import { withLogging } from "../middlewares/withLogging.js";

sellerAuthRouter.post('/signup', authLimiter, validateBody(signupSchema), withLogging('SELLER_SIGNUP', sellerRegister))
sellerAuthRouter.post('/login', authLimiter, withLogging('SELLER_LOGIN', sellerLogin))
sellerAuthRouter.post('/verify-email', authLimiter, withLogging('SELLER_VERIFY_EMAIL', verifySellerEmail))
sellerAuthRouter.post('/verify-login-otp', authLimiter, withLogging('SELLER_VERIFY_OTP', verifySellerLoginOTP))
sellerAuthRouter.post('/resend-otp', authLimiter, withLogging('SELLER_RESEND_OTP', resendSellerVerificationCode))



export default sellerAuthRouter;