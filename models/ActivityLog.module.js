import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["ACTIVITY"], // Only activity logs in DB now
            default: "ACTIVITY",
        },
        level: {
            type: String,
            default: "info",
            enum: ["info", "error", "warn", "debug"],
        },
        ip: {
            type: String,
            index: true, // For security queries
        },
        userAgent: {
            type: String,
        },
        // Activity Specific Fields
        email: {
            type: String,
            index: true, // For user lookup
        },
        action: {
            type: String,
            required: true,
            index: true,
        },
        target: {
            type: String,
            index: true, // For resource tracking
        },
        role: {
            type: String,
            enum: ["User", "Seller", "Admin", "System"],
            index: true,
        },
        status: {
            type: String,
            enum: ["success", "failure", "pending"],
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "userTypeModel",
            required: false,
            index: true, // Critical for user queries
        },
        userTypeModel: {
            type: String,
            required: false,
            enum: ["AppUser", "SuperAdmin"],
        },
        message: {
            type: String,
            required: false,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: { createdAt: "timestamp", updatedAt: false },
        minimize: false
    }
);

// ==================== OPTIMIZED INDEXES ====================

// 1. Primary time-based query (most common)
activityLogSchema.index({ timestamp: -1 });

// 2. User activity lookup (O(log n) instead of O(n))
activityLogSchema.index({ user: 1, timestamp: -1 });

// 3. Email-based queries (for admin searches)
activityLogSchema.index({ email: 1, timestamp: -1 });

// 4. Action-based queries (audit trails)
activityLogSchema.index({ action: 1, timestamp: -1 });

// 5. Role-based filtering (admin dashboards)
activityLogSchema.index({ role: 1, timestamp: -1 });

// 6. Compound index for complex admin queries
activityLogSchema.index({
    role: 1,
    action: 1,
    timestamp: -1
});

// 7. Status filtering (failed actions, security)
activityLogSchema.index({ status: 1, timestamp: -1 });

// ==================== TTL INDEX (Auto-cleanup) ====================
// Automatically delete logs older than 90 days (optional)
// Uncomment if you want automatic cleanup
// activityLogSchema.index(
//     { timestamp: 1 }, 
//     { expireAfterSeconds: 60 * 60 * 24 * 90 } // 90 days
// );

// ==================== STATIC METHODS ====================

/**
 * Get user activity (optimized - no populate)
 * O(log n) due to index on user + timestamp
 */
activityLogSchema.statics.getUserActivity = async function (userId, { page = 1, limit = 20, startDate, endDate } = {}) {
    const query = { user: userId };

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
        this.find(query)
            .select("-userAgent -metadata") // Exclude heavy fields
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean(), // Use lean() for better performance (plain JS objects)
        this.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get activity by role (optimized)
 * O(log n) due to compound index
 */
activityLogSchema.statics.getActivityByRole = async function (role, { page = 1, limit = 20, action, startDate, endDate } = {}) {
    const query = { role };

    if (action) query.action = action;

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
        this.find(query)
            .select("-userAgent -metadata")
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;                                                                                                                                                                                                                         