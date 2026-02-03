import express from "express";
import { getMe } from "../controllers/me.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";

import { withLogging } from "../middlewares/withLogging.js";

const meRouter = express.Router();

meRouter.get("/", withLogging('Auth', verifyAuth), getMe);

export default meRouter;
