import express from "express";
import { modifyCartQuantity, getUserCart, removeFromCart, addToCart } from "../controllers/cart.controller.js";
import { actionLimiter } from "../middlewares/ratelimit.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

import { withLogging } from "../middlewares/withLogging.js";



const cartRouter = express.Router();

cartRouter.get('/', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("user")), getUserCart)

cartRouter.post('/modify', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("user")), actionLimiter(), modifyCartQuantity)

cartRouter.delete('/remove/:itemId', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("user")), actionLimiter(), removeFromCart)

cartRouter.post('/add', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("user")), actionLimiter(), addToCart)


export default cartRouter;