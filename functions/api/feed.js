import { companiesList } from '../../public/data/companies.js';
import { logger } from '../_lib/logger.js';

// Only the feeds the app lists, so this is not an open proxy
const ALLOWED_FEEDS = new Set(companiesList.flatMap(company => company.feeds.map(feed => feed.url)));
const CACHE_SECONDS = 1800;

/**
 * GET /api/feed?url=<feed url>
 * Returns the feed's raw XML; the browser parses it (FeedProxyProvider).
 */
export async function onRequestGet({ request }) {
    const startedAt = Date.now();
    const url = new URL(request.url).searchParams.get('url');
    const context = status => ({ url, status, durationMs: Date.now() - startedAt });

    if (!url || !ALLOWED_FEEDS.has(url)) {
        logger.warn(context(400), 'Feed not allowed');
        return json({ error: 'Feed not allowed' }, 400);
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
        return json({ error: 'Could not reach feed' }, 502);
    }

    if (!upstream.ok) {
        logger.error({ ...context(502), upstreamStatus: upstream.status }, 'Feed returned an error');
        return json({ error: 'Feed returned an error', status: upstream.status }, 502);
    }

    logger.info(context(200), 'Feed served');
    return new Response(upstream.body, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': `public, max-age=${CACHE_SECONDS}`
        }
    });
}

function json(body, status) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
