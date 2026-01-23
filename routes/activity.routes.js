import { Router } from "express";
import {
    getUserActivity,
    getSellerActivity,
    getAdminActivity,
    getActivityLogs,
    getMyActivity
} from "../controllers/activity.controller.js";
import { verifySuperAdmin } from "../middlewares/verifySuperAdmin.js";
import { verifyAuth } from "../middlewares/verifyAuth.js";

const activityRouter = Router();

// Endpoint for users/sellers to see their own activity
activityRouter.get("/me", verifyAuth, getMyActivity);

// All other activity routes are restricted to Super Admin
activityRouter.get("/users", verifySuperAdmin, getUserActivity);
activityRouter.get("/sellers", verifySuperAdmin, getSellerActivity);
activityRouter.get("/admins", verifySuperAdmin, getAdminActivity);
activityRouter.get("/all", verifySuperAdmin, getActivityLogs);

export default activityRouter;
