import express from "express";
import {
  placeOrderCOD,
  placeOrderStripe,
  verifyStripe,
  getUserOrders,
  cancelOrder,
} from "../controllers/order.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { orderSchema } from "../utils/JoiValidation.js";
import { getSellerOrders, updateOrderStatus } from "../controllers/sellerOrders.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

const orderRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /api/order/seller:
 *   get:
 *     summary: Get orders for a seller
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of seller orders
 */
orderRouter.get("/seller", verifyAuth, authorizeRoles("seller"), getSellerOrders);

/**
 * @swagger
 * /api/order/seller/status:
 *   put:
 *     summary: Update order status by seller
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 */
orderRouter.put("/seller/status", verifyAuth, authorizeRoles("seller"), updateOrderStatus);

/**
 * @swagger
 * /api/order/place:
 *   post:
 *     summary: Place a COD order
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       200:
 *         description: COD order placed successfully
 */
orderRouter.post("/place", verifyAuth, authorizeRoles("user"), validateBody(orderSchema), placeOrderCOD);

/**
 * @swagger
 * /api/order/stripe:
 *   post:
 *     summary: Place an order with Stripe payment
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       200:
 *         description: Stripe order created successfully
 */
orderRouter.post("/stripe", verifyAuth, authorizeRoles("user"), validateBody(orderSchema), placeOrderStripe);

/**
 * @swagger
 * /api/order/cancel:
 *   post:
 *     summary: Cancel an order by user
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 */
orderRouter.post("/cancel", verifyAuth, authorizeRoles("user"), cancelOrder);

/**
 * @swagger
 * /api/order:
 *   get:
 *     summary: Get orders of the logged-in user
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user orders
 */
orderRouter.get("/", verifyAuth, authorizeRoles("user"), getUserOrders);

/**
 * @swagger
 * /api/order/verifystripe:
 *   post:
 *     summary: Verify Stripe payment
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stripe payment verified successfully
 */
orderRouter.post("/verifystripe", verifyAuth, authorizeRoles("user"), verifyStripe);

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - items
 *         - address
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *         address:
 *           type: string
 */

export default orderRouter;
