import express from "express";
import { getDeadStock, getInStockAlert, getLowStockAlert, getOutOfStockAlert, getStockSummary, getBestSellingProducts }
    from "../controllers/sellerInventory.controller.js";

import { verifyAuth } from "../middlewares/verifyAuth.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.js";

import { withLogging } from "../middlewares/withLogging.js";

const inventoryRouter = express.Router();

//stock change endpoints
// inventoryRouter.post('/:productId/increase', increaseStock);

// inventoryRouter.post('/:productId/decrease', decreaseStock);

// inventoryRouter.post('/api/inventory/:productId/adjust',directStockChange);

//stock history enpoints
// inventoryRouter.post('/:productId/history',stockHistory);

// inventoryRouter.get('/history', getAllHistory);

// inventoryRouter.get('/report/value',getTotalInventoryValue);


//inventory Reports endpoints
inventoryRouter.get('/reports/low-stock', verifyAuth, authorizeRoles("seller"), withLogging('SELLER_REPORT_LOW_STOCK', getLowStockAlert));

inventoryRouter.get('/reports/out-of-stock', verifyAuth, authorizeRoles("seller"), withLogging('SELLER_REPORT_OUT_OF_STOCK', getOutOfStockAlert));

inventoryRouter.get('/reports/in-stock', verifyAuth, authorizeRoles("seller"), withLogging('SELLER_REPORT_IN_STOCK', getInStockAlert));


//stock change summary
inventoryRouter.get('/reports/summary', verifyAuth, authorizeRoles("seller"), withLogging('SELLER_REPORT_SUMMARY', getStockSummary));

inventoryRouter.get('/reports/dead-stock', verifyAuth, authorizeRoles("seller"), withLogging('SELLER_REPORT_DEAD_STOCK', getDeadStock))

inventoryRouter.get('/reports/best-selling', verifyAuth, authorizeRoles("seller"), withLogging('SELLER_REPORT_BEST_SELLING', getBestSellingProducts))

export default inventoryRouter;