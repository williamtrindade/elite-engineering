/**
 * The only place that reads environment variables. Each platform passes its own
 * key/value object (process.env loaded from .env, or the runtime's own variables).
 * Throws at startup when something is missing or invalid, not in the middle of a request.
 * Every key is documented in .env.example.
 */
export function parseConfig(env) {
    return {
        allowedOrigins: list(env, 'ALLOWED_ORIGINS'),
        feedCacheSeconds: positiveInt(env, 'FEED_CACHE_SECONDS'),
        rateLimit: {
            requests: positiveInt(env, 'RATE_LIMIT_REQUESTS'),
            periodSeconds: positiveInt(env, 'RATE_LIMIT_PERIOD_SECONDS')
        },
        logLevel: env.LOG_LEVEL || 'info'
    };
}

function required(env, key) {
    const value = env[key];

    if (value === undefined || String(value).trim() === '') {
        throw new Error(`Missing ${key}: see .env.example (copy it to .env, or set the variable on your platform)`);
    }
    return String(value).trim();
}

function list(env, key) {
    return required(env, key).split(',').map(item => item.trim()).filter(Boolean);
}

export function positiveInt(env, key) {
    const value = Number(required(env, key));

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${key} must be a positive integer, got "${env[key]}"`);
    }
    return value;
}
