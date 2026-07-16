const { Redis } = require('@upstash/redis');
const { redisUrl, redisToken } = require('./dotenvConfig');

if (!redisUrl || !redisToken) {
    console.warn('Redis URL or Token is missing. Caching will be disabled.');
}

const redis = (redisUrl && redisToken) ? new Redis({
    url: redisUrl,
    token: redisToken,
}) : null;

if (redis) {
    // Permanent Connectivity Check
    redis.set('connection_test', 'ok', { ex: 10 })
        .then(() => redis.get('connection_test'))
        .then(val => {
            if (val === 'ok') {
                console.log('Connected to Redis successfully!');
            }
        })
        .catch(err => {
            console.error('Redis connection error:', err.message);
            if (err.message.includes('NOPERM')) {
                console.error('CRITICAL: Upstash token is READ-ONLY. Please use a Primary/Read-Write token.');
            }
        });
}

module.exports = redis;
