/**
 * Adapters that run on any runtime with the standard fetch API.
 * Platform-specific ones live in api/platforms/ (e.g. CfRateLimiter).
 */

const HEADERS = {
    // Some blogs reject requests without a browser-like User-Agent
    'User-Agent': 'Mozilla/5.0 (compatible; EliteEngineering/1.0; +https://github.com/williamtrindade/elite-engineering)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
};

/**
 * FeedGateway over the standard fetch API.
 * `init` adds runtime-specific request options (e.g. edge caching), passed in by the platform.
 *
 * @implements {import('./ports.js').FeedGateway}
 */
export class FetchFeedGateway {
    constructor({ init = {} } = {}) {
        this.init = init;
    }

    async fetch(url) {
        // Looked up per call, so tests can replace globalThis.fetch
        const response = await globalThis.fetch(url, { ...this.init, headers: HEADERS });
        return { ok: response.ok, status: response.status, body: response.body };
    }
}

/**
 * Decorator: serves a feed from a Cache for `ttlSeconds` after a successful download.
 * Errors are never cached, so a blog that recovers is picked up on the next request.
 * Used where the runtime has no HTTP cache of its own (Node); Cloudflare caches at the edge instead.
 *
 * @implements {import('./ports.js').FeedGateway}
 */
export class CachedFeedGateway {
    /**
     * @param {import('./ports.js').FeedGateway} gateway
     * @param {Cache} cache
     * @param {number} ttlSeconds
     */
    constructor(gateway, cache, ttlSeconds) {
        this.gateway = gateway;
        this.cache = cache;
        this.ttlSeconds = ttlSeconds;
    }

    async fetch(url) {
        const cached = this.cache.get(url);
        if (cached !== undefined) return { ok: true, status: 200, body: cached };

        const response = await this.gateway.fetch(url);
        if (!response.ok) return response;

        // A stream can only be read once: keep the text and hand out copies of it
        const body = await new Response(response.body).text();
        this.cache.set(url, body, this.ttlSeconds);
        return { ok: true, status: response.status, body };
    }
}

/**
 * Key/value cache with expiry, used by CachedFeedGateway. A shared one (Redis, KV…)
 * would implement the same shape.
 *
 * @typedef {object} Cache
 * @property {(key: string) => any} get  undefined when missing or expired
 * @property {(key: string, value: any, ttlSeconds: number) => void} set
 */

/**
 * In-process cache. Each server process has its own, which is fine for one Node instance.
 *
 * @implements {Cache}
 */
export class MemoryCache {
    constructor({ now = Date.now } = {}) {
        this.now = now;
        this.entries = new Map();
    }

    get(key) {
        const entry = this.entries.get(key);
        if (!entry) return undefined;

        if (this.now() >= entry.expiresAt) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set(key, value, ttlSeconds) {
        this.entries.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
    }
}

/**
 * Fixed window per key: up to `requests` calls every `periodSeconds`.
 * In-process, so it only limits a single Node instance.
 *
 * @implements {import('./ports.js').RateLimiter}
 */
export class MemoryRateLimiter {
    constructor({ requests, periodSeconds, now = Date.now }) {
        this.requests = requests;
        this.periodMs = periodSeconds * 1000;
        this.now = now;
        this.windows = new Map();
    }

    async limit(key) {
        const now = this.now();
        let window = this.windows.get(key);

        if (!window || now >= window.startedAt + this.periodMs) {
            window = { startedAt: now, count: 0 };
            this.windows.set(key, window);
            this.dropExpired(now);
        }

        window.count += 1;
        return window.count <= this.requests;
    }

    // Keeps the map from growing with every IP ever seen
    dropExpired(now) {
        for (const [key, window] of this.windows) {
            if (now >= window.startedAt + this.periodMs) this.windows.delete(key);
        }
    }
}
