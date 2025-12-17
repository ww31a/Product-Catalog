import express from "express";
import { getDeadStock,getInStockAlert,getLowStockAlert,getOutOfStockAlert,getStockSummary, getBestSellingProducts }
 from "../controllers/sellerInventory.controller.js";

import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

const inventoryRouter = express.Router();

//stock change endpoints
// inventoryRouter.post('/:productId/increase', increaseStock);

// inventoryRouter.post('/:productId/decrease', decreaseStock);

// inventoryRouter.post('/api/inventory/:productId/adjust',directStockChange);

//stock history enpoints
// inventoryRouter.post('/:productId/history',stockHistory);

// inventoryRouter.get('/history', getAllHistory);

//inventory Reports endpoints
inventoryRouter.get('/reports/low-stock',verifyAuth, authorizeRoles("seller"),getLowStockAlert);

inventoryRouter.get('/reports/out-of-stock',verifyAuth, authorizeRoles("seller"),getOutOfStockAlert);

inventoryRouter.get('/reports/in-stock',verifyAuth, authorizeRoles("seller"),getInStockAlert);

// inventoryRouter.get('/report/value',getTotalInventoryValue);

//stock change summary
inventoryRouter.get('/reports/summary',verifyAuth, authorizeRoles("seller"),getStockSummary);

inventoryRouter.get('/reports/dead-stock',verifyAuth, authorizeRoles("seller"),getDeadStock)

inventoryRouter.get('/reports/best-selling',verifyAuth, authorizeRoles("seller"),getBestSellingProducts)

export default inventoryRouter;