import { Router } from "express";
import limiter from "../middlewares/ratelimit.js";
import { getAllSellers, deleteSeller, getPlatformOverview, getTopSellers, getAllUsers,
    getAllProducts, getAllOrders, bulkDeleteSellers
 } from "../controllers/superAdminManage.controller.js";
import { getSuperAdminProfile, changePassword, superAdminLogin } from "../controllers/superAdminAuth.controller.js";
import { verifySuperAdmin } from "../middlewares/verifySuperAdmin.js";
import { validateBody } from '../middlewares/validateBody.js';
import { passwordSchema } from "../utils/JoiValidation.js";

const superAdminRouter = Router();

/**
 * @swagger
 * tags:
 *   name: SuperAdmin
 *   description: SuperAdmin management and authentication endpoints
 */

/**
 * @swagger
 * /api/superadmin/login:
 *   post:
 *     summary: Login as super admin
 *     tags: [SuperAdmin]
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
superAdminRouter.post("/login", limiter, superAdminLogin);

/**
 * @swagger
 * /api/superadmin/profile:
 *   get:
 *     summary: Get super admin profile
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns super admin profile
 *       401:
 *         description: Unauthorized
 */
superAdminRouter.get("/profile", verifySuperAdmin, getSuperAdminProfile);

/**
 * @swagger
 * /api/superadmin/change-password:
 *   put:
 *     summary: Change super admin password
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *             required:
 *               - oldPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 */
superAdminRouter.put("/change-password", verifySuperAdmin, validateBody(passwordSchema), changePassword);

/**
 * @swagger
 * /api/superadmin/all-sellers:
 *   get:
 *     summary: Get all sellers
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sellers
 */
superAdminRouter.get('/all-sellers', verifySuperAdmin, getAllSellers);

/**
 * @swagger
 * /api/superadmin/all-users:
 *   get:
 *     summary: Get all users
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
superAdminRouter.get('/all-users', verifySuperAdmin, getAllUsers);

/**
 * @swagger
 * /api/superadmin/all-products:
 *   get:
 *     summary: Get all products
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all products
 */
superAdminRouter.get('/all-products', verifySuperAdmin, getAllProducts);

/**
 * @swagger
 * /api/superadmin/all-orders:
 *   get:
 *     summary: Get all orders
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 */
superAdminRouter.get('/all-orders', verifySuperAdmin, getAllOrders);

/**
 * @swagger
 * /api/superadmin/overview:
 *   get:
 *     summary: Get platform overview
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns platform overview metrics
 */
superAdminRouter.get('/overview', verifySuperAdmin, getPlatformOverview);

/**
 * @swagger
 * /api/superadmin/top-sellers:
 *   get:
 *     summary: Get top sellers
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns top sellers
 */
superAdminRouter.get('/top-sellers', verifySuperAdmin, getTopSellers);

/**
 * @swagger
 * /api/superadmin/delete-seller/{sellerId}:
 *   delete:
 *     summary: Delete a seller by ID
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Seller deleted successfully
 */
superAdminRouter.delete('/delete-seller/:sellerId', verifySuperAdmin, deleteSeller);

/**
 * @swagger
 * /api/superadmin/bulk-delete-seller:
 *   post:
 *     summary: Bulk delete sellers
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sellerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - sellerIds
 *     responses:
 *       200:
 *         description: Sellers deleted successfully
 */
superAdminRouter.post('/bulk-delete-seller', verifySuperAdmin, bulkDeleteSellers);

export default superAdminRouter;
