import { Router } from "express";
import { authLimiter } from "../middlewares/ratelimit.js";
import { userLogin, userRegister, verifyEmail, verifyUserLoginOTP, resendVerificationCode } from "../controllers/userAuth.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { signupSchema } from "../utils/JoiValidation.js";

import { withLogging } from "../middlewares/withLogging.js";

const userAuthRouter = Router();

userAuthRouter.post('/signup', authLimiter, withLogging('SIGNUP', validateBody(signupSchema)), userRegister)
userAuthRouter.post('/login', authLimiter, withLogging('LOGIN', userLogin))
userAuthRouter.post('/verify-email', authLimiter, withLogging('VERIFY_EMAIL', verifyEmail))
userAuthRouter.post('/verify-login-otp', authLimiter, withLogging('VERIFY_LOGIN_2FA', verifyUserLoginOTP))
userAuthRouter.post('/resend-otp', authLimiter, withLogging('RESEND_OTP', resendVerificationCode))


export default userAuthRouter;