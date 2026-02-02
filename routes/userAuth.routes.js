import { Router } from "express";
import { authLimiter } from "../middlewares/ratelimit.js";
import { userLogin, userRegister, verifyEmail, verifyUserLoginOTP, resendVerificationCode } from "../controllers/userAuth.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { signupSchema } from "../utils/JoiValidation.js";

import { withLogging } from "../middlewares/withLogging.js";

const userAuthRouter = Router();

userAuthRouter.post('/signup', authLimiter, withLogging('Validation', validateBody(signupSchema)), userRegister)
userAuthRouter.post('/login', authLimiter, userLogin)
userAuthRouter.post('/verify-email', authLimiter, verifyEmail)
userAuthRouter.post('/verify-login-otp', authLimiter, verifyUserLoginOTP)
userAuthRouter.post('/resend-otp', authLimiter, resendVerificationCode)


export default userAuthRouter;