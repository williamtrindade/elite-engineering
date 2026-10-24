import { companiesList } from '../../web/data/companies.js';
import { logger } from './logger.js';

// Only the feeds the app lists, so this is not an open proxy
const ALLOWED_FEEDS = new Set(companiesList.flatMap(company => company.feeds.map(feed => feed.url)));
const CACHE_SECONDS = 1800;
const RATE_LIMIT_PERIOD_SECONDS = 60; // must match "period" in wrangler.jsonc

// Production, its preview deployments (<hash>.elite-engineering.pages.dev) and local dev
const ALLOWED_ORIGINS = [
    /^https:\/\/([a-z0-9-]+\.)?elite-engineering\.pages\.dev$/,
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
];

export default {
    async fetch(request, env) {
        const { pathname } = new URL(request.url);
        const origin = request.headers.get('Origin');
        const cors = corsHeaders(origin);

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
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const { success } = await env.FEED_LIMITER.limit({ key: ip });

        if (!success) {
            logger.warn({ ip, status: 429 }, 'Rate limit exceeded');
            return json({ error: 'Too many requests' }, 429, {
                ...cors,
                'Retry-After': String(RATE_LIMIT_PERIOD_SECONDS)
            });
        }

        return handleFeed(request, cors);
    }
};

/**
 * GET /api/feed?url=<feed url>
 * Returns the feed's raw XML; the browser parses it (FeedProxyProvider).
 */
export async function handleFeed(request, cors) {
    const startedAt = Date.now();
    const url = new URL(request.url).searchParams.get('url');
    const context = status => ({ url, status, durationMs: Date.now() - startedAt });

    if (!url || !ALLOWED_FEEDS.has(url)) {
        logger.warn(context(400), 'Feed not allowed');
        return json({ error: 'Feed not allowed' }, 400, cors);
    }

    let upstream;
    try {
        upstream = await fetch(url, {
            headers: {
                // Some blogs reject requests without a browser-like User-Agent
                'User-Agent': 'Mozilla/5.0 (compatible; EliteEngineering/1.0; +https://github.com/williamtrindade/elite-engineering)',
                'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
            },
            cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true }
        });
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
            'Cache-Control': `public, max-age=${CACHE_SECONDS}`
        }
    });
}

// Sent on every response, so the browser can also read error bodies
export function corsHeaders(origin) {
    const headers = { 'Vary': 'Origin' };

    if (isAllowedOrigin(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    }

    return headers;
}

export function isAllowedOrigin(origin) {
    return Boolean(origin) && ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
}

function json(body, status, cors) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' }
    });
}
