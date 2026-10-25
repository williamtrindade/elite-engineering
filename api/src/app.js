/**
 * The API core (hexagonal architecture): every rule of the feed proxy, with no
 * knowledge of the runtime. What it needs from the outside comes in through the
 * ports in ./ports.js, implemented in ./adapters.js or by a platform (api/platforms/).
 *
 * Uses only web-standard Request/Response, so it runs on Node, Workers, Deno, Bun.
 */
import { companiesList } from '../../web/data/companies.js';

// Only the feeds the app lists, so this is not an open proxy
const APP_FEEDS = companiesList.flatMap(company => company.feeds.map(feed => feed.url));

/**
 * @param {object} deps
 * @param {ReturnType<import('./config.js').parseConfig>} deps.config
 * @param {import('./ports.js').RateLimiter} deps.rateLimiter
 * @param {import('./ports.js').FeedGateway} deps.feedGateway
 * @param {import('./ports.js').Logger} deps.logger
 * @param {import('./ports.js').ClientIp} deps.clientIp
 * @param {string[]} [deps.feeds]
 * @returns {(request: Request) => Promise<Response>}
 */
export function createApi({ config, rateLimiter, feedGateway, logger, clientIp, feeds = APP_FEEDS }) {
    const allowedFeeds = new Set(feeds);
    const isAllowedOrigin = originMatcher(config.allowedOrigins);

    return async function handle(request) {
        const { pathname } = new URL(request.url);
        const origin = request.headers.get('Origin');
        const cors = corsHeaders(origin, isAllowedOrigin);

        // Only the site may use the API. Browsers always send the real Origin, so
        // this stops other websites; scripts can fake it, so it's not authentication.
        if (!isAllowedOrigin(origin)) {
            logger.warn({ origin, path: pathname, status: 403 }, 'Origin not allowed');
            return json({ error: 'Origin not allowed' }, 403, cors);
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        if (pathname !== '/api/feed' || request.method !== 'GET') {
            return json({ error: 'Not found' }, 404, cors);
        }

        // Per IP, after the Origin check so rejected requests don't use up the limit
        const ip = clientIp(request);
        if (!(await rateLimiter.limit(ip))) {
            logger.warn({ ip, status: 429 }, 'Rate limit exceeded');
            return json({ error: 'Too many requests' }, 429, {
                ...cors,
                'Retry-After': String(config.rateLimit.periodSeconds)
            });
        }

        return getFeed(request, cors);
    };

    /**
     * GET /api/feed?url=<feed url>
     * Returns the feed's raw XML; the browser parses it (web/src/adapters/feedParser.js).
     */
    async function getFeed(request, cors) {
        const startedAt = Date.now();
        const url = new URL(request.url).searchParams.get('url');
        const context = status => ({ url, status, durationMs: Date.now() - startedAt });

        if (!url || !allowedFeeds.has(url)) {
            logger.warn(context(400), 'Feed not allowed');
            return json({ error: 'Feed not allowed' }, 400, cors);
        }

        let upstream;
        try {
            upstream = await feedGateway.fetch(url);
        } catch (error) {
            logger.error({ ...context(502), err: error.message }, 'Could not reach feed');
            return json({ error: 'Could not reach feed' }, 502, cors);
        }

        if (!upstream.ok) {
            logger.error({ ...context(502), upstreamStatus: upstream.status }, 'Feed returned an error');
            return json({ error: 'Feed returned an error', status: upstream.status }, 502, cors);
        }

        logger.info(context(200), 'Feed served');
        return new Response(upstream.body, {
            headers: {
                ...cors,
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': `public, max-age=${config.feedCacheSeconds}`
            }
        });
    }
}

/**
 * Builds the Origin check from ALLOWED_ORIGINS. Exact origins plus two wildcards,
 * so the .env never needs a regex:
 *   - `*.` at the start of the host matches exactly one subdomain label
 *     (`https://*.site.dev` matches `https://abc.site.dev`, not `https://site.dev`)
 *   - `:*` matches any port, or none (`http://localhost:*`)
 */
export function originMatcher(patterns) {
    const matchers = patterns.map(pattern => new RegExp(`^${pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace('://*\\.', '://[a-z0-9-]+\\.')
        .replace(/:\*$/, '(:\\d+)?')}$`));

    return origin => Boolean(origin) && matchers.some(matcher => matcher.test(origin));
}

// Vary on Origin so caches don't serve one origin's CORS headers to another
function corsHeaders(origin, isAllowedOrigin) {
    const headers = { 'Vary': 'Origin' };

    if (isAllowedOrigin(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    }
    return headers;
}

function json(body, status, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' }
    });
}
