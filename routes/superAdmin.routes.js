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
superAdminRouter.get("/profile", withLogging('AuthSuper', verifySuperAdmin), getSuperAdminProfile);
superAdminRouter.put("/change-password", withLogging('AuthSuper', verifySuperAdmin), authLimiter, withLogging('Validation', validateBody(passwordSchema)), changePassword);

superAdminRouter.get('/all-sellers', withLogging('AuthSuper', verifySuperAdmin), getAllSellers);
superAdminRouter.get('/all-users', withLogging('AuthSuper', verifySuperAdmin), getAllUsers);
superAdminRouter.get('/all-products', withLogging('AuthSuper', verifySuperAdmin), getAllProducts);
superAdminRouter.get('/all-orders', withLogging('AuthSuper', verifySuperAdmin), getAllOrders);
superAdminRouter.get('/overview', withLogging('AuthSuper', verifySuperAdmin), getPlatformOverview);
superAdminRouter.get('/top-sellers', withLogging('AuthSuper', verifySuperAdmin), getTopSellers); //not used

superAdminRouter.delete('/delete-seller/:sellerId', withLogging('AuthSuper', verifySuperAdmin), deleteSeller); //not used
superAdminRouter.post('/bulk-delete-seller', withLogging('AuthSuper', verifySuperAdmin), bulkDeleteSellers); //not useed

// Public route
superAdminRouter.post("/login", authLimiter, superAdminLogin);

export default superAdminRouter;