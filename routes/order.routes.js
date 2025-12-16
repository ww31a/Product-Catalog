import express from "express";
import { placeOrderCOD,placeOrderStripe, verifyStripe, getUserOrders, cancelOrder } from "../controllers/order.controller.js";
import { verifySeller } from "../middlewares/verifySeller.js";
import { verifyUser } from "../middlewares/verifyUser.js";
import { validateBody } from "../middlewares/validateBody.js";
import {orderSchema} from '../utils/JoiValidation.js'
import { getSellerOrders, updateOrderStatus } from "../controllers/sellerOrders.controller.js";
const orderRouter = express.Router();


// orderRouter.get('/list',verifySeller,allOrder);

orderRouter.get('/seller',verifySeller,getSellerOrders)
orderRouter.put('/seller/status',verifySeller,updateOrderStatus)

orderRouter.post('/place',verifyUser,validateBody(orderSchema),placeOrderCOD)
orderRouter.post('/stripe',verifyUser,validateBody(orderSchema),placeOrderStripe)

orderRouter.post('/cancel',verifyUser,cancelOrder)
orderRouter.get('/',verifyUser,getUserOrders)
orderRouter.post('/verifystripe',verifyUser,verifyStripe)


export default orderRouter;