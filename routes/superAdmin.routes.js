import { Router } from "express";
import limiter from "../middlewares/ratelimit.js";
import { getAllAdmins,deleteAdmin,getPlatformOverview,getTopSellers,getAllUsers,
    getAllProducts,getAllOrders
 } from "../controllers/superAdminManage.controller.js";

const superAdminRouter = Router();

superAdminRouter.post('/login',limiter)


export default superAdminRouter;