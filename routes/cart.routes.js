import express from "express";
import { modifyCartQuantity, getUserCart, removeFromCart, addToCart } from "../controllers/cart.controller.js";
import { actionLimiter } from "../middlewares/ratelimit.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";


import { withLogging } from "../middlewares/withLogging.js";


const cartRouter = express.Router();

cartRouter.get('/', withLogging('Auth', verifyAuth), authorizeRoles("user"), withLogging('VIEW_CART', getUserCart))

cartRouter.post('/modify', withLogging('Auth', verifyAuth), authorizeRoles("user"), actionLimiter(), withLogging('MODIFY_CART', modifyCartQuantity))

cartRouter.delete('/remove/:itemId', withLogging('Auth', verifyAuth), authorizeRoles("user"), actionLimiter(), withLogging('REMOVE_FROM_CART', removeFromCart))

cartRouter.post('/add', withLogging('Auth', verifyAuth), authorizeRoles("user"), actionLimiter(), withLogging('ADD_TO_CART', addToCart))


export default cartRouter;