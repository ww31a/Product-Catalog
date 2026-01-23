import cron from "node-cron";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";
import { logSystem } from "./logger.js";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LOG_DIR = process.env.LOG_DIR || "logs";

/**
 * Upload a single log file to Cloudinary
 */
const uploadLogFile = async (filePath, type) => {
    try {
        const fileName = path.basename(filePath);
        const env = process.env.NODE_ENV || "development";

        // Extract date from filename (format: type-YYYY-MM-DD.log)
        // Example: access-2026-01-23.log -> 2026-01-23
        const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];
        const [year, month, day] = dateStr.split("-");

        const cloudinaryFolder = `logs/${env}/${type}/${year}/${month}/${day}`;

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "raw",
            folder: cloudinaryFolder,
            public_id: fileName.replace(".log", "").replace(".gz", ""),
            overwrite: false,
        });

        logSystem({
            event: "LOG_UPLOAD_SUCCESS",
            level: "info",
            message: `Uploaded ${fileName} to ${cloudinaryFolder}`,
            metadata: { url: result.secure_url, folder: cloudinaryFolder }
        });

        return result;
    } catch (error) {
        logSystem({
            event: "LOG_UPLOAD_FAILED",
            level: "error",
            message: `Failed to upload ${filePath}`,
            metadata: { error: error.message }
        });
        throw error;
    }
};

/**
 * Get all log files from server directory (excluding today's file)
 * Only uploads SERVER logs (system, application, security, access, error)
 * Activity logs are in DB, no need for files
 */
const getCompletedLogFiles = async () => {
    try {
        const serverLogDir = path.join(LOG_DIR, "server");
        const files = await fs.readdir(serverLogDir);

        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        // Filter out today's files (still being written to)
        // Include both .log and .gz files (compressed archives)
        const completedFiles = files.filter(file => {
            return (file.endsWith(".log") || file.endsWith(".gz")) && !file.includes(today);
        });

        return completedFiles.map(file => path.join(serverLogDir, file));
    } catch (error) {
        logSystem({
            event: "LOG_READ_FAILED",
            level: "error",
            message: `Failed to read logs from server directory`,
            metadata: { error: error.message }
        });
        return [];
    }
};

/**
 * Upload all completed server log files
 */
const uploadServerLogs = async () => {
    const files = await getCompletedLogFiles();

    if (files.length === 0) {
        logSystem({
            event: "NO_LOGS_TO_UPLOAD",
            level: "info",
            message: `No completed server logs found`
        });
        return;
    }

    logSystem({
        event: "UPLOAD_START",
        level: "info",
        message: `Starting upload of ${files.length} server log files`
    });

    const uploadPromises = files.map(file =>
        uploadLogFile(file, "server")
            .then(() => {
                // Optional: Delete local file after successful upload
                if (process.env.DELETE_LOGS_AFTER_UPLOAD === "true") {
                    return fs.unlink(file);
                }
            })
            .catch(err => {
                console.error(`Failed to upload ${file}:`, err);
            })
    );

    await Promise.allSettled(uploadPromises);

    logSystem({
        event: "UPLOAD_COMPLETE",
        level: "info",
        message: `Completed server logs upload`
    });
};

/**
 * Main cron job function
 */
export const uploadLogsCronJob = () => {
    // Run daily at 2 AM
    cron.schedule("0 2 * * *", async () => {
        logSystem({
            event: "CRON_START",
            level: "info",
            message: "Starting scheduled log upload to Cloudinary"
        });

        try {
            // Upload only server logs (activity logs are in DB)
            await uploadServerLogs();

            logSystem({
                event: "CRON_SUCCESS",
                level: "info",
                message: "Successfully completed log upload to Cloudinary"
            });
        } catch (error) {
            logSystem({
                event: "CRON_FAILED",
                level: "error",
                message: "Log upload cron job failed",
                metadata: { error: error.message }
            });
        }
    });

    logSystem({
        event: "CRON_INITIALIZED",
        level: "info",
        message: "Log upload cron job initialized (runs daily at 2 AM)"
    });
};

/**
 * Manual trigger for testing
 */
export const manualUploadLogs = async () => {
    logSystem({
        event: "MANUAL_UPLOAD_START",
        level: "info",
        message: "Manual log upload triggered"
    });

    await uploadServerLogs();

    logSystem({
        event: "MANUAL_UPLOAD_COMPLETE",
        level: "info",
        message: "Manual log upload completed"
    });
};