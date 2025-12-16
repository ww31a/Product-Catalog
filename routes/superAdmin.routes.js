import { Router } from "express";
import limiter from "../middlewares/ratelimit.js";
import { getAllSellers,deleteSeller,getPlatformOverview,getTopSellers,getAllUsers,
    getAllProducts,getAllOrders,
    bulkDeleteSellers
 } from "../controllers/superAdminManage.controller.js";

import { getSuperAdminProfile,changePassword,superAdminLogin } from "../controllers/superAdminAuth.controller.js";
import { verifySuperAdmin } from "../middlewares/verifySuperAdmin.js";
import {validateBody} from '../middlewares/validateBody.js'
import { passwordSchema } from "../utils/JoiValidation.js";

const superAdminRouter = Router();

// Protected routes
superAdminRouter.get("/profile", verifySuperAdmin, getSuperAdminProfile);
superAdminRouter.put("/change-password", verifySuperAdmin,validateBody(passwordSchema), changePassword);

superAdminRouter.get('/all-sellers',verifySuperAdmin,getAllSellers);
superAdminRouter.get('/all-users',verifySuperAdmin,getAllUsers);
superAdminRouter.get('/all-products',verifySuperAdmin,getAllProducts);
superAdminRouter.get('/all-orders',verifySuperAdmin,getAllOrders);
superAdminRouter.get('/overview',verifySuperAdmin,getPlatformOverview);
superAdminRouter.get('/top-sellers',verifySuperAdmin,getTopSellers); //not used

superAdminRouter.delete('/delete-seller/:sellerId',verifySuperAdmin,deleteSeller); //not used
superAdminRouter.post('/bulk-delete-seller',verifySuperAdmin,bulkDeleteSellers); //not useed

// Public route
superAdminRouter.post("/login",limiter, superAdminLogin);

export default superAdminRouter;