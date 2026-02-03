
import { logApplication, logError } from './logger.js';
import { getRequestId } from './requestContext.js';

/**
 * Wraps a service instance with logging capabilities.
 * Logs method calls, execution time, and errors.
 * 
 * @param {string} serviceName - The name of the service (e.g., 'ProductService')
 * @param {object} serviceInstance - The instance of the service to wrap
 * @returns {Proxy} - The wrapped service instance
 */
export const createLoggedService = (serviceName, serviceInstance) => {
    return new Proxy(serviceInstance, {
        get(target, prop) {
            const original = target[prop];

            // Only wrap functions
            if (typeof original !== 'function') return original;

            return async function (...args) {
                const start = process.hrtime.bigint();
                const operation = `${serviceName}.${String(prop)}`;

                try {
                    const result = await original.apply(this, args);
                    const durationBigInt = process.hrtime.bigint() - start;
                    const durationMs = Number(durationBigInt) / 1e6;

                    // Log SLOW queries (>100ms) as WARN
                    if (durationMs > 100) {
                        logApplication({
                            event: 'SLOW_SERVICE_OP',
                            level: 'warn',
                            message: `${operation} took ${Math.round(durationMs)}ms`,
                            metadata: { 
                                duration: Math.round(durationMs),
                                requestId: getRequestId()
                            }
                        });
                    } else {
                        // Optional: Log ALL queries as debug/info if needed, keeping it silent for now to reduce noise
                        // consistent with the "only important stuff" philosophy unless configured otherwise
                    }

                    return result;
                } catch (error) {
                    logError({
                        error,
                        context: `Service: ${operation}`,
                        metadata: { 
                            duration: Number(process.hrtime.bigint() - start) / 1e6,
                            requestId: getRequestId()
                        }
                    });
                    throw error;
                }
            };
        }
    });
};
