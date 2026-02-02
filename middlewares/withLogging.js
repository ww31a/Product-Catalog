import { logApplication, logSecurity } from '../utils/logger.js';

/**
 * Wraps middleware to log if it succeeds or fails
 * Usage: app.use(withLogging('auth', authMiddleware))
 */
export const withLogging = (name, middleware) => {
    return async (req, res, next) => {
        const start = Date.now();

        try {
            await middleware(req, res, (err) => {
                const duration = Date.now() - start;

                if (err) {
                    logSecurity({
                        event: 'MIDDLEWARE_FAILURE',
                        message: `${name} failed: ${err.message}`,
                        metadata: {
                            requestId: req.requestId,
                            duration,
                            userId: req.user?.id || req.auth?.userId,
                            path: req.originalUrl,
                            method: req.method
                        }
                    });
                } else {
                    logApplication({
                        event: 'MIDDLEWARE_SUCCESS',
                        message: `${name} completed`,
                        metadata: {
                            requestId: req.requestId,
                            duration,
                            userId: req.user?.id || req.auth?.userId
                        }
                    });
                }

                next(err);
            });
        } catch (error) {
            logSecurity({
                event: 'MIDDLEWARE_ERROR',
                message: `${name} crashed: ${error.message}`,
                metadata: {
                    requestId: req.requestId,
                    userId: req.user?.id || req.auth?.userId
                }
            });
            next(error);
        }
    };
};

export default withLogging;