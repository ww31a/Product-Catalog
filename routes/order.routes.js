import express from "express";
import { placeOrderCOD,placeOrderStripe, verifyStripe, getUserOrders, cancelOrder } from "../controllers/order.controller.js";
import { verifyAdmin } from "../middlewares/verifyadmin.js";
import { verifyUser } from "../middlewares/verifyUser.js";
import { validateBody } from "../middlewares/validateBody.js";
import {orderSchema} from '../utils/JoiValidation.js'
import { getAdminOrders, updateOrderStatus } from "../controllers/adminOrders.controller.js";
const orderRouter = express.Router();


// orderRouter.get('/list',verifyAdmin,allOrder);

orderRouter.get('/admin',verifyAdmin,getAdminOrders)
orderRouter.put('/admin/status',verifyAdmin,updateOrderStatus)

orderRouter.post('/place',verifyUser,validateBody(orderSchema),placeOrderCOD)
orderRouter.post('/stripe',verifyUser,validateBody(orderSchema),placeOrderStripe)

orderRouter.post('/cancel',verifyUser,cancelOrder)
orderRouter.get('/',verifyUser,getUserOrders)
orderRouter.post('/verifystripe',verifyUser,verifyStripe)


export default orderRouter;