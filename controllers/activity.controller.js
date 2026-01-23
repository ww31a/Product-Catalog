import ActivityLog from "../models/ActivityLog.module.js";

/**
 * Get activity logs with filtering and pagination (Super Admin)
 * O(log n) with proper indexes
 */
export const getActivityLogs = async (req, res) => {
    try {
        const {
            role,
            action,
            userId,
            email,
            status,
            startDate,
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        const query = {};

        // Build query with indexed fields
        if (role) query.role = role;
        if (action) query.action = action;
        if (userId) query.user = userId;
        if (email) query.email = email;
        if (status) query.status = status;

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        // Use Promise.all for parallel execution (optimization)
        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .select("-userAgent -metadata.__v") // Exclude heavy/unnecessary fields
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .lean(), // Return plain JS objects (faster than Mongoose docs)
            ActivityLog.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get user-specific activity logs (Admin view)
 * O(log n) with role index
 */
export const getUserActivity = async (req, res) => {
    try {
        const { page = 1, limit = 20, action, startDate, endDate } = req.query;

        const result = await ActivityLog.getActivityByRole("User", {
            page,
            limit,
            action,
            startDate,
            endDate
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get seller-specific activity logs (Admin view)
 * O(log n) with role index
 */
export const getSellerActivity = async (req, res) => {
    try {
        const { page = 1, limit = 20, action, startDate, endDate } = req.query;

        const result = await ActivityLog.getActivityByRole("Seller", {
            page,
            limit,
            action,
            startDate,
            endDate
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get admin action logs (Admin view)
 * O(log n) with role index
 */
export const getAdminActivity = async (req, res) => {
    try {
        const { page = 1, limit = 20, action, startDate, endDate } = req.query;

        const result = await ActivityLog.getActivityByRole("Admin", {
            page,
            limit,
            action,
            startDate,
            endDate
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get current user's own activity
 * O(log n) with user index
 */
export const getMyActivity = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { page = 1, limit = 20, startDate, endDate } = req.query;

        const result = await ActivityLog.getUserActivity(userId, {
            page,
            limit,
            startDate,
            endDate
        });

        res.status(200).json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get failed/suspicious activity (Security monitoring)
 * O(log n) with status index
 */
export const getFailedActivity = async (req, res) => {
    try {
        const { page = 1, limit = 20, startDate, endDate } = req.query;

        const result = await ActivityLog.getFailedActions({
            page,
            limit,
            startDate,
            endDate
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};