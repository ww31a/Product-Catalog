import { AsyncLocalStorage } from 'async_hooks';

// Create async local storage for request context
const requestContext = new AsyncLocalStorage();

/**
 * Get current request context (available everywhere without prop drilling)
 */
export const getRequestContext = () => {
  return requestContext.getStore() || {};
};

/**
 * Get requestId from context (available everywhere)
 */
export const getRequestId = () => {
  return getRequestContext().requestId || 'NO_REQUEST_ID';
};

/**
 * Get userId from context
 */
export const getUserId = () => {
  return getRequestContext().userId || null;
};

/**
 * Middleware to set request context for the entire request lifecycle
 * Wraps all subsequent middleware and route handlers with AsyncLocalStorage
 */
export const requestContextMiddleware = (req, res, next) => {
  const context = {
    requestId: req.requestId,
    userId: req.auth?.userId || null,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };

  // Run all subsequent handlers within this context
  requestContext.run(context, () => {
    next();
  });
};
