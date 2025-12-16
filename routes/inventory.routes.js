import express from "express";
import { getDeadStock,getInStockAlert,getLowStockAlert,getOutOfStockAlert,getStockSummary, getBestSellingProducts }
 from "../controllers/sellerInventory.controller.js";

import { verifySeller } from "../middlewares/verifySeller.js";

const inventoryRouter = express.Router();

//stock change endpoints
// inventoryRouter.post('/:productId/increase', increaseStock);

// inventoryRouter.post('/:productId/decrease', decreaseStock);

// inventoryRouter.post('/api/inventory/:productId/adjust',directStockChange);

//stock history enpoints
// inventoryRouter.post('/:productId/history',stockHistory);

// inventoryRouter.get('/history', getAllHistory);

//inventory Reports endpoints
inventoryRouter.get('/reports/low-stock',verifySeller,getLowStockAlert);

inventoryRouter.get('/reports/out-of-stock',verifySeller,getOutOfStockAlert);

inventoryRouter.get('/reports/in-stock',verifySeller,getInStockAlert);

// inventoryRouter.get('/report/value',getTotalInventoryValue);

//stock change summary
inventoryRouter.get('/reports/summary',verifySeller,getStockSummary);

inventoryRouter.get('/reports/dead-stock',verifySeller,getDeadStock)

inventoryRouter.get('/reports/best-selling',verifySeller,getBestSellingProducts)

export default inventoryRouter;