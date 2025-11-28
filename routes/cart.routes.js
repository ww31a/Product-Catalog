import express from "express";
import { modifyCartQuantity,getUserCart,removeFromCart, addToCart } from "../controllers/cart.controller.js";
import { verifyUser } from "../middlewares/verifyUser.js";


const cartRouter = express.Router();

cartRouter.get('/',verifyUser,getUserCart)

cartRouter.post('/modify',verifyUser,modifyCartQuantity)

cartRouter.delete('/remove/:itemId',verifyUser,removeFromCart)

cartRouter.post('/add',verifyUser,addToCart)


export default cartRouter;