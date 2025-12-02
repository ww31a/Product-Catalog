import express from "express";
import { getDeadStock,getInStockAlert,getLowStockAlert,getOutOfStockAlert,getStockSummary, getBestSellingProducts }
 from "../controllers/adminInventory.controller.js";

import { verifyAdmin } from "../middlewares/verifyadmin.js";

const inventoryRouter = express.Router();

//stock change endpoints
// inventoryRouter.post('/:productId/increase', increaseStock);

// inventoryRouter.post('/:productId/decrease', decreaseStock);

// inventoryRouter.post('/api/inventory/:productId/adjust',directStockChange);

//stock history enpoints
// inventoryRouter.post('/:productId/history',stockHistory);

// inventoryRouter.get('/history', getAllHistory);

//inventory Reports endpoints
inventoryRouter.get('/reports/low-stock',verifyAdmin,getLowStockAlert);

inventoryRouter.get('/reports/out-of-stock',verifyAdmin,getOutOfStockAlert);

inventoryRouter.get('/reports/in-stock',verifyAdmin,getInStockAlert);

// inventoryRouter.get('/report/value',getTotalInventoryValue);

//stock change summary
inventoryRouter.get('/reports/summary',verifyAdmin,getStockSummary);

inventoryRouter.get('/reports/dead-stock',verifyAdmin,getDeadStock)

inventoryRouter.get('/reports/best-selling',verifyAdmin,getBestSellingProducts)

export default inventoryRouter;