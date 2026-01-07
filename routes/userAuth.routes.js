import { Router } from "express";
import limiter from "../middlewares/ratelimit.js";
import { userLogin, userRegister, verifyEmail } from "../controllers/userAuth.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import {signupSchema} from "../utils/JoiValidation.js";

const userAuthRouter = Router();

userAuthRouter.post('/signup',limiter,validateBody(signupSchema),userRegister)
userAuthRouter.post('/login',limiter, userLogin)
userAuthRouter.post('/verify-email',verifyEmail)


export default userAuthRouter;