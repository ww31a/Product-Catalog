import express from "express";
import { modifyCartQuantity, getUserCart, removeFromCart, addToCart } from "../controllers/cart.controller.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

const cartRouter = express.Router();

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the current user's cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *       401:
 *         description: Unauthorized
 */
cartRouter.get('/', verifyAuth, authorizeRoles("user"), getUserCart);

/**
 * @swagger
 * /api/cart/modify:
 *   post:
 *     summary: Modify the quantity of a cart item
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Bad request
 */
cartRouter.post('/modify', verifyAuth, authorizeRoles("user"), modifyCartQuantity);

/**
 * @swagger
 * /api/cart/remove/{itemId}:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the item to remove
 *     responses:
 *       200:
 *         description: Item removed successfully
 *       404:
 *         description: Item not found
 */
cartRouter.delete('/remove/:itemId', verifyAuth, authorizeRoles("user"), removeFromCart);

/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add an item to the cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item added to cart successfully
 *       400:
 *         description: Bad request
 */
cartRouter.post('/add', verifyAuth, authorizeRoles("user"), addToCart);

export default cartRouter;
