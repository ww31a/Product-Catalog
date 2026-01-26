import express from "express";
import { placeOrderCOD, placeOrderStripe, verifyStripe, getUserOrders, cancelOrder } from "../controllers/order.controller.js";
import limiter from "../middlewares/ratelimit.js";
import { validateBody } from "../middlewares/validateBody.js";
import { orderSchema } from '../utils/JoiValidation.js'
import { getSellerOrders, updateOrderStatus } from "../controllers/sellerOrders.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
const orderRouter = express.Router();


// orderRouter.get('/list',verifyAuth, authorizeRoles("seller"),allOrder);

orderRouter.get('/seller', verifyAuth, authorizeRoles("seller"), getSellerOrders)
orderRouter.put('/seller/status', verifyAuth, authorizeRoles("seller"), updateOrderStatus)

orderRouter.post('/place', verifyAuth, authorizeRoles("user"), limiter, validateBody(orderSchema), placeOrderCOD)
orderRouter.post('/stripe', verifyAuth, authorizeRoles("user"), limiter, validateBody(orderSchema), placeOrderStripe)

orderRouter.post('/cancel', verifyAuth, authorizeRoles("user"), cancelOrder)
orderRouter.get('/', verifyAuth, authorizeRoles("user"), getUserOrders)
orderRouter.post('/verifystripe', verifyAuth, authorizeRoles("user"), verifyStripe)


export default orderRouter;