import express from "express";
import {
  getDeadStock,
  getInStockAlert,
  getLowStockAlert,
  getOutOfStockAlert,
  getStockSummary,
  getBestSellingProducts,
  // increaseStock,
  // decreaseStock,
  // directStockChange,
  // stockHistory,
  // getAllHistory,
  // getTotalInventoryValue,
} from "../controllers/sellerInventory.controller.js";

import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

const inventoryRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Inventory Reports
 *   description: Inventory reporting endpoints for sellers
 */

/**
 * @swagger
 * /api/inventory/reports/low-stock:
 *   get:
 *     summary: Get products with low stock
 *     tags: [Inventory Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of low-stock products
 */
inventoryRouter.get(
  "/reports/low-stock",
  verifyAuth,
  authorizeRoles("seller"),
  getLowStockAlert
);

/**
 * @swagger
 * /api/inventory/reports/out-of-stock:
 *   get:
 *     summary: Get products that are out of stock
 *     tags: [Inventory Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of out-of-stock products
 */
inventoryRouter.get(
  "/reports/out-of-stock",
  verifyAuth,
  authorizeRoles("seller"),
  getOutOfStockAlert
);

/**
 * @swagger
 * /api/inventory/reports/in-stock:
 *   get:
 *     summary: Get products that are in stock
 *     tags: [Inventory Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of in-stock products
 */
inventoryRouter.get(
  "/reports/in-stock",
  verifyAuth,
  authorizeRoles("seller"),
  getInStockAlert
);

/**
 * @swagger
 * /api/inventory/reports/summary:
 *   get:
 *     summary: Get stock summary
 *     tags: [Inventory Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Summary of stock levels
 */
inventoryRouter.get(
  "/reports/summary",
  verifyAuth,
  authorizeRoles("seller"),
  getStockSummary
);

/**
 * @swagger
 * /api/inventory/reports/dead-stock:
 *   get:
 *     summary: Get dead stock products
 *     tags: [Inventory Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of dead stock products
 */
inventoryRouter.get(
  "/reports/dead-stock",
  verifyAuth,
  authorizeRoles("seller"),
  getDeadStock
);

/**
 * @swagger
 * /api/inventory/reports/best-selling:
 *   get:
 *     summary: Get best-selling products
 *     tags: [Inventory Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of best-selling products
 */
inventoryRouter.get(
  "/reports/best-selling",
  verifyAuth,
  authorizeRoles("seller"),
  getBestSellingProducts
);

/**
 * Uncomment and document these later as needed
 *
 * /api/inventory/:productId/increase
 * /api/inventory/:productId/decrease
 * /api/inventory/:productId/adjust
 * /api/inventory/:productId/history
 * /api/inventory/history
 * /api/inventory/report/value
 */

export default inventoryRouter;
