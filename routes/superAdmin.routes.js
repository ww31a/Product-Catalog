import { Router } from "express";
import limiter from "../middlewares/ratelimit.js";
import { getAllAdmins,deleteAdmin,getPlatformOverview,getTopSellers,getAllUsers,
    getAllProducts,getAllOrders
 } from "../controllers/superAdminManage.controller.js";

import { getSuperAdminProfile,changePassword,superAdminLogin } from "../controllers/superAdminAuth.controller.js";
import { verifySuperAdmin } from "../middlewares/verifySuperAdmin.js";

const superAdminRouter = Router();

// Protected routes
superAdminRouter.get("/profile", verifySuperAdmin, getSuperAdminProfile);
superAdminRouter.put("/change-password", verifySuperAdmin, changePassword);

superAdminRouter.get('/all-admins',verifySuperAdmin,getAllAdmins);
superAdminRouter.get('/all-users',verifySuperAdmin,getAllUsers);
superAdminRouter.get('/all-products',verifySuperAdmin,getAllProducts);
superAdminRouter.get('/all-orders',verifySuperAdmin,getAllOrders);
superAdminRouter.get('/overview',verifySuperAdmin,getPlatformOverview);
superAdminRouter.get('/top-sellers',verifySuperAdmin,getTopSellers);

superAdminRouter.delete('/delete-admin/:adminId',verifySuperAdmin,deleteAdmin);
superAdminRouter.post('/bulk-delete',verifySuperAdmin,deleteAdmin);

// Public route
superAdminRouter.post("/login",limiter, superAdminLogin);

export default superAdminRouter;