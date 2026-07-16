const redis = require('../config/redis');

/**
 * Middleware to cache GET requests
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 */
const cacheMiddleware = (ttl = 3600) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET' || !redis) {
            return next();
        }

        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedData = await redis.get(key);

            if (cachedData) {
                // Return cached data
                return res.json(cachedData);
            }

            // Override res.json to cache the result
            const originalJson = res.json;
            res.json = (data) => {
                // Restore original res.json
                res.json = originalJson;

                // Cache the data before sending
                // We only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.set(key, data, { ex: ttl }).catch(err => {
                        console.error('Redis cache set error:', err);
                    });
                }

                return res.json(data);
            };

            next();
        } catch (error) {
            console.error('Redis cache middleware error:', error);
            // On redis error, just proceed without caching
            next();
        }
    };
};

/**
 * Utility to clear cache by pattern
 * @param {string} pattern - Pattern to match (e.g., 'articles:*')
 */
const clearCache = async (pattern) => {
    if (!redis) return;

    try {
        // For Upstash, we can use the 'keys' method or just delete specific keys
        // or use 'flushall' if we want to clear everything
        // But Upstash Redis (HTTP) has specific behavior for keys/scan.
        // For simplicity, we'll use a prefix-based invalidation if possible or just clear all
        if (pattern === '*') {
            await redis.flushdb();
        } else {
            // Upstash redis-js doesn't have a direct 'keys' + 'del' helper like ioredis
            // We can try to use SCAN if needed, but for now we'll support specific key deletion
            // and maybe a simple flushall for broad invalidation.
            await redis.del(pattern);
        }
    } catch (error) {
        console.error('Redis clearCache error:', error);
    }
};

module.exports = {
    cacheMiddleware,
    clearCache
};
