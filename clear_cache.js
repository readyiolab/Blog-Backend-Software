const redis = require('./src/config/redis');

async function flushCache() {
    if (!redis) {
        console.log('Redis is not configured. Cache is already effectively clear.');
        process.exit(0);
    }

    try {
        console.log('Attempting to clear Redis cache...');
        // We flush everything to be sure, or we could target specific keys
        await redis.flushdb();
        console.log('✅ Redis cache cleared successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to clear Redis cache:', err.message);
        process.exit(1);
    }
}

flushCache();
