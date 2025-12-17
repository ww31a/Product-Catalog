import express from "express";
import { placeOrderCOD,placeOrderStripe, verifyStripe, getUserOrders, cancelOrder } from "../controllers/order.controller.js";
import { verifySeller } from "../middlewares/verifySeller.js";
import { verifyUser } from "../middlewares/verifyUser.js";
import { validateBody } from "../middlewares/validateBody.js";
import {orderSchema} from '../utils/JoiValidation.js'
import { getSellerOrders, updateOrderStatus } from "../controllers/sellerOrders.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
const orderRouter = express.Router();


// orderRouter.get('/list',verifySeller,allOrder);

orderRouter.get('/seller',verifyAuth, authorizeRoles("seller"),getSellerOrders)
orderRouter.put('/seller/status',verifySeller,updateOrderStatus)

orderRouter.post('/place',verifyAuth, authorizeRoles("seller"),validateBody(orderSchema),placeOrderCOD)
orderRouter.post('/stripe',verifyAuth, authorizeRoles("seller"),validateBody(orderSchema),placeOrderStripe)

orderRouter.post('/cancel',verifyAuth, authorizeRoles("seller"),cancelOrder)
orderRouter.get('/',verifyAuth, authorizeRoles("seller"),getUserOrders)
orderRouter.post('/verifystripe',verifyAuth, authorizeRoles("seller"),verifyStripe)


export default orderRouter;