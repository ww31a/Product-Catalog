import express from "express";
import { getMe } from "../controllers/me.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { withLogging } from "../middlewares/withLogging.js";

const meRouter = express.Router();

meRouter.get("/", verifyAuth, withLogging('VIEW_MY_PROFILE', getMe));

export default meRouter;
