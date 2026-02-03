import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { logAccess } from "../utils/logger.js";

// Helper to simplify User-Agent
const parseUserAgent = (ua) => {
  if (!ua) return "unknown";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Postman")) return "Postman";
  return "Other";
};

export const loggingMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  const requestId = uuidv4();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs =
      Number(process.hrtime.bigint() - start) / 1e6;

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    // Determine actor type and ID
    const userId = req.auth?.userId || req.user?.id;
    const isAuthenticated = !!userId;
    const actorType = isAuthenticated ? "USER" : "ANON";

    // Unified userId: actual ID if logged in, hash if ANON
    const loggedUserId = isAuthenticated
      ? userId
      : crypto.createHash("sha256")
        .update(ip + (req.get("user-agent") || ""))
        .digest("hex")
        .substring(0, 12);

    logAccess({
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: Math.round(durationMs),
      ip,
      userAgent: parseUserAgent(req.get("user-agent")),
      actorType,
      userId: loggedUserId
    });
  });

  next();
};
