import express from "express";
import { placeOrderCOD,placeOrderStripe,allOrder,userOrders, verifyStripe } from "../controllers/order.controller.js";
import { verifyAdmin } from "../middlewares/verifyadmin.js";
import { verifyUser } from "../middlewares/verifyUser.js";

const orderRouter = express.Router();


orderRouter.get('/list',verifyAdmin,allOrder);


orderRouter.post('/place',verifyUser,placeOrderCOD)
orderRouter.post('/stripe',verifyUser,placeOrderStripe)


orderRouter.get('/userorders',verifyUser,userOrders)
orderRouter.post('/verifystripe',verifyUser,verifyStripe)


export default orderRouter;