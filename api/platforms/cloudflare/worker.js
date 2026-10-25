// Cloudflare platform (the `main` in wrangler.jsonc): serves the API core as a Worker.
// Everything Cloudflare-specific is in this folder; the core doesn't know it runs here.
import pino from 'pino';
import { createApi } from '../../src/app.js';
import { parseConfig } from '../../src/config.js';
import { FetchFeedGateway } from '../../src/adapters.js';

/**
 * RateLimiter over the Workers Rate Limiting binding (`ratelimits` in wrangler.jsonc).
 * The limit and period live in the binding config, not here.
 *
 * @implements {import('../../src/ports.js').RateLimiter}
 */
export class CfRateLimiter {
    constructor(binding) {
        this.binding = binding;
    }

    async limit(key) {
        const { success } = await this.binding.limit({ key });
        return success;
    }
}

// Cloudflare sets the visitor's IP on every request that reaches a Worker
const cfClientIp = request => request.headers.get('CF-Connecting-IP') || 'unknown';

function build(env) {
    const config = parseConfig(env);

    return createApi({
        config,
        // Workers bundle pino's browser build: logs go to console as objects,
        // which Cloudflare Workers Logs indexes as structured fields
        logger: pino({ level: config.logLevel, browser: { asObject: true } }),
        rateLimiter: new CfRateLimiter(env.FEED_LIMITER),
        // Cached at the edge by Cloudflare, so the Worker keeps no copy in memory
        feedGateway: new FetchFeedGateway({
            init: { cf: { cacheTtl: config.feedCacheSeconds, cacheEverything: true } }
        }),
        clientIp: cfClientIp
    });
}

// env is fixed for an isolate's lifetime, so the API is built once per env
const apis = new WeakMap();

export default {
    async fetch(request, env) {
        if (!apis.has(env)) apis.set(env, build(env));
        return apis.get(env)(request);
    }
};
