import express from "express";
import { modifyCartQuantity, getUserCart, removeFromCart, addToCart } from "../controllers/cart.controller.js";
import { actionLimiter } from "../middlewares/ratelimit.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";


const cartRouter = express.Router();

cartRouter.get('/', verifyAuth, authorizeRoles("user"), getUserCart)

cartRouter.post('/modify', verifyAuth, authorizeRoles("user"), actionLimiter(), modifyCartQuantity)

cartRouter.delete('/remove/:itemId', verifyAuth, authorizeRoles("user"), actionLimiter(), removeFromCart)

cartRouter.post('/add', verifyAuth, authorizeRoles("user"), actionLimiter(), addToCart)


export default cartRouter;