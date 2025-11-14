import { Router } from "express";
import limiter from "../middlewares/ratelimit.js";
const userAuthRouter = Router();

userAuthRouter.post('/signup',limiter, userSignUp)
userAuthRouter.post('/login',limiter, userLogin)


export default userAuthRouter;