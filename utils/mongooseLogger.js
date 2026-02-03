
import { logApplication } from './logger.js';

/**
 * Mongoose plugin to log slow queries.
 * 
 * @param {Schema} schema - The Mongoose schema to apply the plugin to
 */
export const queryLoggerPlugin = (schema) => {
    const methods = ['find', 'findOne', 'findById', 'updateOne', 'deleteOne', 'save', 'findOneAndUpdate', 'countDocuments'];

    methods.forEach(method => {
        schema.pre(method, function () {
            this._startTime = process.hrtime.bigint();
        });

        schema.post(method, function () {
            if (this._startTime) {
                const durationBigInt = process.hrtime.bigint() - this._startTime;
                const durationMs = Number(durationBigInt) / 1e6;

                // Log queries taking longer than 100ms
                if (durationMs > 100) {
                    logApplication({
                        event: 'SLOW_DB_QUERY',
                        level: 'warn',
                        message: `${this.model?.modelName || 'Query'}.${method} took ${Math.round(durationMs)}ms`,
                        metadata: { duration: Math.round(durationMs) }
                    });
                }
            }
        });
    });
};
