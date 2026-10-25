// Shared fakes for the API tests: they stand in for the ports, never for real infrastructure.

export const SITE = 'https://elite-engineering.pages.dev';
export const ALLOWED_FEED = 'https://blog.cloudflare.com/rss/';

export const TEST_ENV = {
    ALLOWED_ORIGINS: 'https://elite-engineering.pages.dev,https://*.elite-engineering.pages.dev,http://localhost:*,http://127.0.0.1:*',
    FEED_CACHE_SECONDS: '1800',
    RATE_LIMIT_REQUESTS: '60',
    RATE_LIMIT_PERIOD_SECONDS: '60'
};

export const silentLogger = { info() {}, warn() {}, error() {} };

// RateLimiter that allows `limit` calls per key and records them
export function countingLimiter(limit = Infinity) {
    const calls = new Map();
    return {
        calls,
        async limit(key) {
            calls.set(key, (calls.get(key) || 0) + 1);
            return calls.get(key) <= limit;
        }
    };
}

// Replaces globalThis.fetch for one test; returns a restore function
export function mockFetch(impl) {
    const real = globalThis.fetch;
    globalThis.fetch = impl;
    return () => { globalThis.fetch = real; };
}

export const upstream = (status, body = '<rss/>') => async () => new Response(body, { status });
