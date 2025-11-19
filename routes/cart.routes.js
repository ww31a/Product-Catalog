import express from "express";
import { modifyCart,getUserCart,removeFromCart } from "../controllers/cart.controller.js";
import { verifyUser } from "../middlewares/verifyUser.js";


const cartRouter = express.Router();

cartRouter.get('/',verifyUser,getUserCart)

cartRouter.post('/modify',verifyUser,modifyCart)

cartRouter.delete('/remove/:itemId',verifyUser,removeFromCart)


export default cartRouter;