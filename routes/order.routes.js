import express from "express";
import { placeOrderCOD, placeOrderStripe, verifyStripe, getUserOrders, cancelOrder } from "../controllers/order.controller.js";
import { actionLimiter } from "../middlewares/ratelimit.js";
import { validateBody } from "../middlewares/validateBody.js";
import { orderSchema } from '../utils/JoiValidation.js'
import { getSellerOrders, updateOrderStatus } from "../controllers/sellerOrders.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";
import { withLogging } from "../middlewares/withLogging.js";
const orderRouter = express.Router();


// orderRouter.get('/list',verifyAuth, authorizeRoles("seller"),allOrder);

orderRouter.get('/seller', withLogging('Auth', verifyAuth), authorizeRoles("seller"), getSellerOrders)
orderRouter.put('/seller/status', withLogging('Auth', verifyAuth), authorizeRoles("seller"), updateOrderStatus)

orderRouter.post('/place', withLogging('Auth', verifyAuth), authorizeRoles("user"), actionLimiter(), withLogging('Validation', validateBody(orderSchema)), placeOrderCOD)
orderRouter.post('/stripe', withLogging('Auth', verifyAuth), authorizeRoles("user"), actionLimiter(), withLogging('Validation', validateBody(orderSchema)), placeOrderStripe)

orderRouter.post('/cancel', withLogging('Auth', verifyAuth), authorizeRoles("user"), actionLimiter(), cancelOrder)
orderRouter.get('/', withLogging('Auth', verifyAuth), authorizeRoles("user"), getUserOrders)
orderRouter.post('/verifystripe', withLogging('Auth', verifyAuth), authorizeRoles("user"), verifyStripe)


export default orderRouter;