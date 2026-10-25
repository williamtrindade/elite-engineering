// Node platform: serves the API core with node:http and plugs in the in-memory adapters.
// `npm run dev:api` runs this file (node --env-file-if-exists=.env api/platforms/node.js).
// Swapping an adapter (e.g. a Redis rate limiter) is a one-line change in start().
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import pino from 'pino';
import { createApi } from '../src/app.js';
import { parseConfig, positiveInt } from '../src/config.js';
import { CachedFeedGateway, FetchFeedGateway, MemoryCache, MemoryRateLimiter } from '../src/adapters.js';

// The socket's address for each Request, so it can't be spoofed with a header
const remoteAddresses = new WeakMap();

// ClientIp for Node. Direct connections only: behind a reverse proxy, read its forwarded-for header instead.
export function nodeClientIp(request) {
    return remoteAddresses.get(request) || 'unknown';
}

/**
 * Serves a web-standard handler ((Request) => Promise<Response>) with node:http,
 * so the API core runs on Node exactly as it does on Workers.
 */
export function createNodeServer(handler, { logger = console } = {}) {
    return createServer(async (req, res) => {
        try {
            await send(res, await handler(toRequest(req)));
        } catch (error) {
            logger.error({ err: error.message }, 'Unhandled error');
            if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal error' }));
        }
    });
}

function toRequest(req) {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }

    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
        method: req.method,
        headers,
        ...(hasBody ? { body: Readable.toWeb(req), duplex: 'half' } : {})
    });
    remoteAddresses.set(request, req.socket.remoteAddress);
    return request;
}

async function send(res, response) {
    res.writeHead(response.status, Object.fromEntries(response.headers));

    if (!response.body) {
        res.end();
        return;
    }
    for await (const chunk of response.body) res.write(chunk);
    res.end();
}

function start() {
    const config = parseConfig(process.env);
    const port = process.env.PORT ? positiveInt(process.env, 'PORT') : 8787;
    const logger = pino({ level: config.logLevel });

    const handler = createApi({
        config,
        logger,
        rateLimiter: new MemoryRateLimiter(config.rateLimit),
        feedGateway: new CachedFeedGateway(new FetchFeedGateway(), new MemoryCache(), config.feedCacheSeconds),
        clientIp: nodeClientIp
    });

    createNodeServer(handler, { logger }).listen(port, () => logger.info({ port }, `API listening on http://localhost:${port}`));
}

// Start only when run directly, so tests can import createNodeServer
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
