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

import { withLogging } from "../middlewares/withLogging.js";

const activityRouter = Router();

// Endpoint for users/sellers to see their own activity
activityRouter.get("/me", verifyAuth, withLogging('VIEW_MY_ACTIVITY', getMyActivity));

// All other activity routes are restricted to Super Admin
activityRouter.get("/users", verifySuperAdmin, withLogging('ADMIN_VIEW_USER_ACTIVITY', getUserActivity));
activityRouter.get("/sellers", verifySuperAdmin, withLogging('ADMIN_VIEW_SELLER_ACTIVITY', getSellerActivity));
activityRouter.get("/admins", verifySuperAdmin, withLogging('ADMIN_VIEW_ADMIN_ACTIVITY', getAdminActivity));
activityRouter.get("/all", verifySuperAdmin, withLogging('ADMIN_VIEW_ALL_ACTIVITY_LOGS', getActivityLogs));

export default activityRouter;
