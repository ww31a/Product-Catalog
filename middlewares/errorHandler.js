import { logError } from '../utils/logger.js';

/**
 * Catches errors in routes and sends proper response
 * RequestId is automatically captured from AsyncLocalStorage context
 */
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;

    // Log the error - requestId auto-captured from context
    logError({
        error: err,
        context: 'Route Error',
        metadata: {
            path: req?.path,
            method: req?.method,
            userId: req?.auth?.userId ?? null
        }
    });

    // Send response (hide details in production)
    const isProd = process.env.NODE_ENV === 'production';
    res.status(statusCode).json({
        error: true,
        message: isProd && statusCode === 500 ? 'Internal server error' : err.message,
        requestId: req?.requestId
    });
};

export default errorHandler;