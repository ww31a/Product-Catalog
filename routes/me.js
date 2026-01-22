import express from "express";
import { getMe } from "../controllers/me.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
const meRouter = express.Router();

meRouter.get("/",verifyAuth , getMe);

export default meRouter;
