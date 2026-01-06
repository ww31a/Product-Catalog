import express from "express";
import { modifyCartQuantity,getUserCart,removeFromCart, addToCart } from "../controllers/cart.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";


const cartRouter = express.Router();

cartRouter.get('/',verifyAuth, authorizeRoles("user"),getUserCart)

cartRouter.post('/modify',verifyAuth, authorizeRoles("user"),modifyCartQuantity)

cartRouter.delete('/remove/:itemId',verifyAuth, authorizeRoles("user"),removeFromCart)

cartRouter.post('/add',verifyAuth, authorizeRoles("user"),addToCart)


export default cartRouter;