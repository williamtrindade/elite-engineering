import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, originMatcher } from '../../api/src/app.js';
import { parseConfig } from '../../api/src/config.js';
import { FetchFeedGateway } from '../../api/src/adapters.js';
import { ALLOWED_FEED, SITE, TEST_ENV, countingLimiter, mockFetch, silentLogger, upstream } from './helpers.js';

// The API core with test adapters: no platform, no network
const api = ({ rateLimiter = countingLimiter() } = {}) => createApi({
    config: parseConfig(TEST_ENV),
    rateLimiter,
    feedGateway: new FetchFeedGateway(),
    logger: silentLogger,
    clientIp: request => request.headers.get('X-Test-IP') || 'unknown'
});

// Requests come from the site unless a test passes another origin (or null for none)
const request = (path, { method = 'GET', origin = SITE, ip = '203.0.113.1' } = {}) =>
    new Request(`http://localhost:8787${path}`, {
        method,
        headers: { 'X-Test-IP': ip, ...(origin ? { Origin: origin } : {}) }
    });

const feedPath = url => `/api/feed?url=${encodeURIComponent(url)}`;

let restore = () => {};
afterEach(() => restore());

test('serves an allowed feed as XML', async () => {
    restore = mockFetch(upstream(200, '<rss version="2.0"/>'));

    const res = await api()(request(feedPath(ALLOWED_FEED)));

    assert.equal(res.status, 200);
    assert.match(res.headers.get('Content-Type'), /application\/xml/);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=1800');
    assert.equal(await res.text(), '<rss version="2.0"/>');
});

test('rejects feeds outside the allowlist, with CORS headers', async () => {
    const res = await api()(request(feedPath('https://evil.example.com/')));

    assert.equal(res.status, 400);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), SITE);
    assert.deepEqual(await res.json(), { error: 'Feed not allowed' });
});

test('rejects a missing url param as not allowed', async () => {
    const res = await api()(request('/api/feed'));

    assert.equal(res.status, 400);
});

test('allows the production, preview and localhost origins', async () => {
    restore = mockFetch(upstream(200));
    const handle = api();

    for (const origin of [
        'https://elite-engineering.pages.dev',
        'https://abc123.elite-engineering.pages.dev',
        'http://localhost:8788',
        'http://127.0.0.1:5173'
    ]) {
        const res = await handle(request(feedPath(ALLOWED_FEED), { origin }));
        assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin, origin);
        assert.equal(res.headers.get('Vary'), 'Origin');
    }
});

test('rejects unknown origins with 403, without fetching the feed', async () => {
    let fetched = false;
    restore = mockFetch(async () => { fetched = true; return new Response('<rss/>'); });
    const handle = api();

    for (const origin of [
        'https://evil.example.com',
        'https://elite-engineering.pages.dev.evil.com',
        'https://evilelite-engineering.pages.dev'
    ]) {
        const res = await handle(request(feedPath(ALLOWED_FEED), { origin }));
        assert.equal(res.status, 403, origin);
        assert.equal(res.headers.get('Access-Control-Allow-Origin'), null, origin);
        assert.equal(res.headers.get('Vary'), 'Origin');
    }
    assert.equal(fetched, false);
});

test('rejects requests without an Origin (curl, address bar) with 403', async () => {
    const res = await api()(request(feedPath(ALLOWED_FEED), { origin: null }));

    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: 'Origin not allowed' });
});

test('returns 502 when the feed responds with an error', async () => {
    restore = mockFetch(upstream(403));

    const res = await api()(request(feedPath(ALLOWED_FEED)));

    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'Feed returned an error', status: 403 });
});

test('returns 502 when the feed cannot be reached', async () => {
    restore = mockFetch(async () => { throw new TypeError('network down'); });

    const res = await api()(request(feedPath(ALLOWED_FEED)));

    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'Could not reach feed' });
});

test('answers CORS preflight only for allowed origins', async () => {
    const origin = 'http://localhost:8788';
    const handle = api();

    const res = await handle(request('/api/feed', { method: 'OPTIONS', origin }));

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
    assert.match(res.headers.get('Access-Control-Allow-Methods'), /GET/);

    const denied = await handle(request('/api/feed', { method: 'OPTIONS', origin: 'https://evil.example.com' }));
    assert.equal(denied.status, 403);
});

test('returns 404 for unknown routes and methods', async () => {
    const handle = api();

    assert.equal((await handle(request('/'))).status, 404);
    assert.equal((await handle(request('/api/other'))).status, 404);
    assert.equal((await handle(request(feedPath(ALLOWED_FEED), { method: 'POST' }))).status, 404);
});

test('rate limits each IP and answers 429 with Retry-After', async () => {
    restore = mockFetch(upstream(200));
    const handle = api({ rateLimiter: countingLimiter(2) });

    const ok1 = await handle(request(feedPath(ALLOWED_FEED)));
    const ok2 = await handle(request(feedPath(ALLOWED_FEED)));
    const limited = await handle(request(feedPath(ALLOWED_FEED)));
    const otherIp = await handle(request(feedPath(ALLOWED_FEED), { ip: '198.51.100.7' }));

    assert.deepEqual([ok1.status, ok2.status, limited.status, otherIp.status], [200, 200, 429, 200]);
    assert.equal(limited.headers.get('Retry-After'), '60');
    assert.equal(limited.headers.get('Access-Control-Allow-Origin'), SITE, 'front can read the 429');
    assert.deepEqual(await limited.json(), { error: 'Too many requests' });
});

test('does not count blocked origins against the rate limit', async () => {
    const rateLimiter = countingLimiter();

    await api({ rateLimiter })(request(feedPath(ALLOWED_FEED), { origin: 'https://evil.example.com' }));

    assert.equal(rateLimiter.calls.size, 0);
});

test('ALLOWED_ORIGINS matches exact origins only', () => {
    const allows = originMatcher(['https://site.dev']);

    assert.equal(allows('https://site.dev'), true);
    assert.equal(allows('http://site.dev'), false);
    assert.equal(allows('https://site.dev:8443'), false);
    assert.equal(allows('https://site.devx'), false);
    assert.equal(allows(null), false);
    assert.equal(allows(''), false);
});

test('ALLOWED_ORIGINS *. matches exactly one subdomain label', () => {
    const allows = originMatcher(['https://*.site.dev']);

    assert.equal(allows('https://abc123.site.dev'), true);
    assert.equal(allows('https://site.dev'), false, 'apex needs its own entry');
    assert.equal(allows('https://a.b.site.dev'), false);
    assert.equal(allows('https://evilsite.dev'), false);
    assert.equal(allows('https://abc.site.dev.evil.com'), false);
});

test('ALLOWED_ORIGINS :* matches any port or none', () => {
    const allows = originMatcher(['http://localhost:*']);

    assert.equal(allows('http://localhost'), true);
    assert.equal(allows('http://localhost:8788'), true);
    assert.equal(allows('http://localhost.evil.com'), false);
    assert.equal(allows('http://localhost:80abc'), false);
});

test('ALLOWED_ORIGINS treats dots literally', () => {
    const allows = originMatcher(['http://127.0.0.1:*']);

    assert.equal(allows('http://127.0.0.1:5173'), true);
    assert.equal(allows('http://127x0y0z1:5173'), false);
});
