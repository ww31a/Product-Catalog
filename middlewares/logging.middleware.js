import { v4 as uuidv4 } from "uuid";
import { logAccess } from "../utils/logger.js";

export const loggingMiddleware = (req, res, next) => {
    const start = Date.now();
    const requestId = req.headers["x-request-id"] || uuidv4();
    req.requestId = requestId;

    // Add x-request-id to response headers
    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
        const responseTime = Date.now() - start;
        const { method } = req;
        const path = req.originalUrl || req.url;
        const { statusCode } = res;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get("User-Agent");

        // Use dedicated access logger (goes to access.log only, not DB)
        logAccess({
            method,
            path,
            statusCode,
            responseTime,
            requestId,
            ip,
            userAgent,
        });
    });

    next();
};