import { Router } from "express";
import limiter from "../middlewares/ratelimit.js";
import { userLogin, userRegister } from "../controllers/userAuth.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { signupSchema } from "../utils/JoiValidation.js";

const userAuthRouter = Router();

/**
 * @swagger
 * /api/user/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [User Auth]
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
 *         description: User registered successfully
 *       400:
 *         description: Validation error or bad request
 */
userAuthRouter.post('/signup', limiter, validateBody(signupSchema), userRegister);

/**
 * @swagger
 * /api/user/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [User Auth]
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
 *         description: User logged in successfully
 *       401:
 *         description: Invalid credentials
 */
userAuthRouter.post('/login', limiter, userLogin);

export default userAuthRouter;
