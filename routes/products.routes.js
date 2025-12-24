import express from "express";
import upload from "../middlewares/upload.js";
import { 
  getAllProducts, 
  getProductByID 
} from "../controllers/publicProducts.controller.js";
import { 
  addProduct, 
  bulkDeleteProducts, 
  deleteProduct, 
  getSellerProductByID, 
  getSellerProducts, 
  updateProduct, 
  updateStock 
} from "../controllers/sellerProducts.controller.js";
import { validateBody } from '../middlewares/validateBody.js'
import { productSchema, updateProductSchema } from "../utils/JoiValidation.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management endpoints
 */

/**
 * @swagger
 * /api/products/seller:
 *   get:
 *     summary: Get all products of the logged-in seller
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of seller products
 */
router.get("/seller", verifyAuth, authorizeRoles("seller"), getSellerProducts);

/**
 * @swagger
 * /api/products/seller/product/{id}:
 *   get:
 *     summary: Get single product of the logged-in seller by ID
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Product ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Seller product details
 */
router.get("/seller/product/:id", verifyAuth, authorizeRoles("seller"), getSellerProductByID);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Add a new product (seller only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product added successfully
 */
router.post("/", verifyAuth, authorizeRoles("seller"), upload.single("image"), validateBody(productSchema), addProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product (seller only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 */
router.put("/:id", verifyAuth, authorizeRoles("seller"), upload.single("image"), validateBody(updateProductSchema), updateProduct);

/**
 * @swagger
 * /api/products/{id}/stock:
 *   patch:
 *     summary: Update stock quantity for a product (seller only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: quantity
 *         in: query
 *         description: New stock quantity
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Stock updated successfully
 */
router.patch("/:id/stock", verifyAuth, authorizeRoles("seller"), updateStock);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (seller only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
router.delete("/:id", verifyAuth, authorizeRoles("seller"), deleteProduct);

/**
 * @swagger
 * /api/products/seller/bulk-delete:
 *   post:
 *     summary: Bulk delete products (seller only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Products deleted successfully
 */
router.post("/seller/bulk-delete", verifyAuth, authorizeRoles("seller"), bulkDeleteProducts);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all public products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get("/", getAllProducts);

/**
 * @swagger
 * /api/products/product/{id}:
 *   get:
 *     summary: Get a single public product by ID
 *     tags: [Products]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
router.get("/product/:id", getProductByID);

export default router;
