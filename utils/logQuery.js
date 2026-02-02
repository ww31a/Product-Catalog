import { logApplication, logError } from './logger.js';

/**
 * Times database queries and logs slow ones
 * Usage: const user = await logQuery(req, 'User.findById', () => User.findById(id))
 */
export const logQuery = async (req, operation, queryFn) => {
    const start = process.hrtime.bigint();

    try {
        const result = await queryFn();
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6; // ns -> ms

        // Warn if query is slow (>100ms)
        if (durationMs > 100) {
            logApplication({
                event: 'SLOW_QUERY',
                level: 'warn',
                message: `${operation} took ${Math.round(durationMs)}ms`,
                metadata: { requestId: req?.requestId, duration: Math.round(durationMs) }
            });
        }

        return result;
    } catch (error) {
        logError({
            error,
            context: `DB Query: ${operation}`,
            metadata: { requestId: req?.requestId }
        });
        throw error;
    }
};

export default logQuery;
