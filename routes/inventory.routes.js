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
inventoryRouter.get('/reports/low-stock', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getLowStockAlert);

inventoryRouter.get('/reports/out-of-stock', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getOutOfStockAlert);

inventoryRouter.get('/reports/in-stock', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getInStockAlert);


//stock change summary
inventoryRouter.get('/reports/summary', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getStockSummary);

inventoryRouter.get('/reports/dead-stock', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getDeadStock)

inventoryRouter.get('/reports/best-selling', withLogging('Auth', verifyAuth), withLogging('AuthRole', authorizeRoles("seller")), getBestSellingProducts)

export default inventoryRouter;