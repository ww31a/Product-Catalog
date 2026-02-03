import { Router } from "express";
import { authLimiter } from "../middlewares/ratelimit.js";
import {
    getAllSellers, deleteSeller, getPlatformOverview, getTopSellers, getAllUsers,
    getAllProducts, getAllOrders,
    bulkDeleteSellers
} from "../controllers/superAdminManage.controller.js";

import { getSuperAdminProfile, changePassword, superAdminLogin } from "../controllers/superAdminAuth.controller.js";
import { verifySuperAdmin } from "../middlewares/verifySuperAdmin.js";
import { validateBody } from '../middlewares/validateBody.js'
import { passwordSchema } from "../utils/JoiValidation.js";

import { withLogging } from "../middlewares/withLogging.js";

const superAdminRouter = Router();

// Protected routes
superAdminRouter.get("/profile", verifySuperAdmin, withLogging('SUPERADMIN_PROFILE', getSuperAdminProfile));
superAdminRouter.put("/change-password", verifySuperAdmin, authLimiter, validateBody(passwordSchema), withLogging('SUPERADMIN_CHANGE_PASSWORD', changePassword));

superAdminRouter.get('/all-sellers', verifySuperAdmin, withLogging('SUPERADMIN_LIST_SELLERS', getAllSellers));
superAdminRouter.get('/all-users', verifySuperAdmin, withLogging('SUPERADMIN_LIST_USERS', getAllUsers));
superAdminRouter.get('/all-products', verifySuperAdmin, withLogging('SUPERADMIN_LIST_PRODUCTS', getAllProducts));
superAdminRouter.get('/all-orders', verifySuperAdmin, withLogging('SUPERADMIN_LIST_ORDERS', getAllOrders));
superAdminRouter.get('/overview', verifySuperAdmin, withLogging('SUPERADMIN_OVERVIEW', getPlatformOverview));
superAdminRouter.get('/top-sellers', verifySuperAdmin, withLogging('SUPERADMIN_TOP_SELLERS', getTopSellers)); //not used

superAdminRouter.delete('/delete-seller/:sellerId', verifySuperAdmin, withLogging('SUPERADMIN_DELETE_SELLER', deleteSeller)); //not used
superAdminRouter.post('/bulk-delete-seller', verifySuperAdmin, withLogging('SUPERADMIN_BULK_DELETE_SELLER', bulkDeleteSellers)); //not useed

// Public route
superAdminRouter.post("/login", authLimiter, withLogging('SUPERADMIN_LOGIN', superAdminLogin));

export default superAdminRouter;