import { Router } from "express";
import { sellerLogin, sellerRegister } from '../controllers/sellerAuth.controller.js';
import limiter from "../middlewares/ratelimit.js";
import { validateBody } from "../middlewares/validateBody.js";
import { signupSchema } from "../utils/JoiValidation.js";

const sellerAuthRouter = Router();

/**
 * @swagger
 * tags:
 *   name: SellerAuth
 *   description: Seller authentication endpoints
 */

/**
 * @swagger
 * /api/seller/auth/signup:
 *   post:
 *     summary: Register a new seller
 *     tags: [SellerAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *             required:
 *               - name
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: Seller registered successfully
 *       400:
 *         description: Validation error or email already exists
 */
sellerAuthRouter.post('/signup', limiter, validateBody(signupSchema), sellerRegister);

/**
 * @swagger
 * /api/seller/auth/login:
 *   post:
 *     summary: Login as a seller
 *     tags: [SellerAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
sellerAuthRouter.post('/login', limiter, sellerLogin);

export default sellerAuthRouter;
