import { logError } from '../utils/logger.js';

/**
 * Catches errors in routes and sends proper response
 */
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;

    // Log the error
    logError({
        error: err,
        context: 'Route Error',
        metadata: {
            requestId: req?.requestId,
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