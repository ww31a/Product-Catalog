import winston from "winston";
import Transport from "winston-transport";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import ActivityLog from "../models/ActivityLog.module.js";

// Custom Transport for MongoDB (Activity Logs Only)
class ActivityDatabaseTransport extends Transport {
    constructor(opts) {
        super(opts);
    }

    async log(info, callback) {
        setImmediate(() => this.emit("logged", info));

        try {
            const {
                level,
                message,
                type,
                ip,
                userAgent,
                email,
                action,
                target,
                role,
                status,
                user,
                userTypeModel,
                ...metadata
            } = info;

            // Only save ACTIVITY logs to DB
            if (type === "ACTIVITY") {
                await ActivityLog.create({
                    type: "ACTIVITY",
                    level,
                    message,
                    ip,
                    userAgent,
                    email,
                    action,
                    target,
                    role,
                    status,
                    user,
                    userTypeModel,
                    metadata,
                });
            }
        } catch (err) {
            console.error("Failed to save activity log to database:", err);
        }

        callback();
    }
}

// Base logger configuration
const logDir = process.env.LOG_DIR || "logs";

// Common format with timestamp for file logs
const fileLogFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        // Add metadata if exists
        if (Object.keys(meta).length > 0) {
            // Remove Winston internal fields
            const { type, splat, ...cleanMeta } = meta;
            if (Object.keys(cleanMeta).length > 0) {
                log += ` | ${JSON.stringify(cleanMeta)}`;
            }
        }

        return log;
    })
);

// Console format (colorized, simpler)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}] ${message}`;
    })
);

// ==================== ACTIVITY LOGGER ====================
// Logs user actions - ONLY to DB (no files needed)
export const activityLogger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [
        // Console for development
        new winston.transports.Console({
            format: consoleFormat
        }),
        // Database storage (primary storage for activity)
        new ActivityDatabaseTransport(),
    ],
});

// ==================== SERVER LOGGERS ====================
// Different categories of server logs - files only, no DB

// 1. System logs (server startup, shutdown, config changes)
export const systemLogger = winston.createLogger({
    level: "info",
    format: fileLogFormat,
    transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new DailyRotateFile({
            filename: path.join(logDir, "server", "system-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxFiles: "30d",
            zippedArchive: true,
        }),
    ],
});

// 2. Application logs (business logic, general app flow)
export const applicationLogger = winston.createLogger({
    level: "info",
    format: fileLogFormat,
    transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new DailyRotateFile({
            filename: path.join(logDir, "server", "application-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxFiles: "30d",
            zippedArchive: true,
        }),
    ],
});

// 3. Security logs (auth attempts, permission changes)
export const securityLogger = winston.createLogger({
    level: "warn",
    format: fileLogFormat,
    transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new DailyRotateFile({
            filename: path.join(logDir, "server", "security-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxFiles: "90d", // Keep longer for compliance
            zippedArchive: true,
        }),
    ],
});

// 4. Access logs (HTTP requests)
export const accessLogger = winston.createLogger({
    level: "info",
    format: fileLogFormat,
    transports: [
        new DailyRotateFile({
            filename: path.join(logDir, "server", "access-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxFiles: "7d", // Access logs can be shorter
            zippedArchive: true,
        }),
    ],
});

// 5. Error logs (all errors)
export const errorLogger = winston.createLogger({
    level: "error",
    format: fileLogFormat,
    transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new DailyRotateFile({
            filename: path.join(logDir, "server", "error-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxFiles: "90d",
            zippedArchive: true,
        }),
    ],
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Log activity (user actions) - 80% of logs
 * These go ONLY to DB (MongoDB)
 */
export const logActivity = ({
    email,
    action,
    target,
    role,
    status,
    message,
    level = "info",
    user = null,
    userTypeModel = "AppUser",
    ip = null,
    userAgent = null,
    metadata = {},
}) => {
    activityLogger.log(level, message || action, {
        type: "ACTIVITY",
        email,
        action,
        target,
        role,
        status,
        user,
        userTypeModel,
        ip,
        userAgent,
        ...metadata,
    });
};

/**
 * Log HTTP access (request/response)
 * These go to access.log file only
 */
export const logAccess = ({
    method,
    path,
    statusCode,
    responseTime,
    requestId,
    ip,
    userAgent,
}) => {
    accessLogger.info(`${method} ${path} ${statusCode} ${responseTime}ms`, {
        method,
        path,
        statusCode,
        responseTime,
        requestId,
        ip,
        userAgent,
    });
};

/**
 * Log security events (failed logins, permission violations)
 * These go to security.log file
 */
export const logSecurity = ({
    event,
    severity = "warn",
    user = null,
    ip,
    message,
    metadata = {},
}) => {
    securityLogger.log(severity, message, {
        event,
        user,
        ip,
        ...metadata,
    });
};

/**
 * Log system events (startup, shutdown, config)
 * These go to system.log file
 */
export const logSystem = ({ event, level = "info", message, metadata = {} }) => {
    systemLogger.log(level, message, {
        event,
        ...metadata,
    });
};

/**
 * Log application events (business logic)
 * These go to application.log file
 */
export const logApplication = ({ event, level = "info", message, metadata = {} }) => {
    applicationLogger.log(level, message, {
        event,
        ...metadata,
    });
};

/**
 * Log errors
 * These go to error.log file
 */
export const logError = ({ error, context, stack = null, metadata = {} }) => {
    errorLogger.error(error.message || error, {
        context,
        stack: stack || error.stack,
        ...metadata,
    });
};

export default activityLogger;