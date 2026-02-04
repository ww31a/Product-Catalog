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
activityRouter.get("/me", withLogging('Auth', verifyAuth), getMyActivity);

// All other activity routes are restricted to Super Admin
activityRouter.get("/users", withLogging('AuthSuper', verifySuperAdmin), getUserActivity);
activityRouter.get("/sellers", withLogging('AuthSuper', verifySuperAdmin), getSellerActivity);
activityRouter.get("/admins", withLogging('AuthSuper', verifySuperAdmin), getAdminActivity);
activityRouter.get("/all", withLogging('AuthSuper', verifySuperAdmin), getActivityLogs);

export default activityRouter;
