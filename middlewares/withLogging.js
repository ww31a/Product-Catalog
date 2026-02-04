import { logApplication, logSecurity } from '../utils/logger.js';

/**
 * Wraps middleware to log if it succeeds or fails
 * RequestId is automatically captured from AsyncLocalStorage context
 * Usage: app.use(withLogging('auth', authMiddleware))
 */
export const withLogging = (name, middleware) => {
    return async (req, res, next) => {
        const start = Date.now();

        try {
            await middleware(req, res, (err) => {
                const duration = Date.now() - start;
                const userId = req.auth?.userId || req.user?.id;

                if (err) {
                    logSecurity({
                        event: 'MIDDLEWARE_FAILURE',
                        message: `${name} failed: ${err.message}`,
                        metadata: {
                            duration,
                            userId,
                            path: req.originalUrl,
                            method: req.method
                        }
                    });
                } else {
                    logApplication({
                        event: 'MIDDLEWARE_SUCCESS',
                        message: `${name} completed`,
                        metadata: {
                            duration,
                            userId
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
                    userId: req.auth?.userId || req.user?.id
                }
            });
            next(error);
        }
    };
};

export default withLogging;