import { v4 as uuidv4 } from "uuid";
import { logAccess } from "../utils/logger.js";

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

    logAccess({
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: Math.round(durationMs),
      ip,
      userAgent: req.get("user-agent"),
      userId: req.auth?.userId ?? null
    });
  });

  next();
};
