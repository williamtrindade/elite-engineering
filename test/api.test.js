import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let worker;
const realFetch = globalThis.fetch;
const ALLOWED_FEED = 'https://blog.cloudflare.com/rss/';

const SITE = 'https://elite-engineering.pages.dev';

// Requests come from the site unless a test passes another origin (or null for none)
const request = (path, { method = 'GET', origin = SITE, ip = '203.0.113.1' } = {}) =>
    new Request(`http://localhost:8787${path}`, {
        method,
        headers: { 'CF-Connecting-IP': ip, ...(origin ? { Origin: origin } : {}) }
    });

// Stand-in for the Workers Rate Limiting binding: allows `limit` calls per key
const limiter = (limit = Infinity) => {
    const calls = new Map();
    return {
        calls,
        async limit({ key }) {
            calls.set(key, (calls.get(key) || 0) + 1);
            return { success: calls.get(key) <= limit };
        }
    };
};

let env;

const feedPath = url => `/api/feed?url=${encodeURIComponent(url)}`;

// Stand-in for the blog the Worker proxies
const mockUpstream = (status, body = '<rss/>') => {
    globalThis.fetch = async () => new Response(body, { status });
};

before(async () => {
    ({ default: worker } = await import('../api/src/index.js'));
});

beforeEach(() => {
    env = { FEED_LIMITER: limiter() };
});

afterEach(() => {
    globalThis.fetch = realFetch;
});

test('serves an allowed feed as XML', async () => {
    mockUpstream(200, '<rss version="2.0"/>');

    const res = await worker.fetch(request(feedPath(ALLOWED_FEED)), env);

    assert.equal(res.status, 200);
    assert.match(res.headers.get('Content-Type'), /application\/xml/);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=1800');
    assert.equal(await res.text(), '<rss version="2.0"/>');
});

test('rejects feeds outside the allowlist, with CORS headers', async () => {
    const origin = 'https://elite-engineering.pages.dev';

    const res = await worker.fetch(request(feedPath('https://evil.example.com/'), { origin }), env);

    assert.equal(res.status, 400);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
    assert.deepEqual(await res.json(), { error: 'Feed not allowed' });
});

test('allows the production, preview and localhost origins', async () => {
    mockUpstream(200);

    for (const origin of [
        'https://elite-engineering.pages.dev',
        'https://abc123.elite-engineering.pages.dev',
        'http://localhost:8788',
        'http://127.0.0.1:5173'
    ]) {
        const res = await worker.fetch(request(feedPath(ALLOWED_FEED), { origin }), env);
        assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin, origin);
        assert.equal(res.headers.get('Vary'), 'Origin');
    }
});

test('rejects unknown origins with 403, without fetching the feed', async () => {
    let fetched = false;
    globalThis.fetch = async () => { fetched = true; return new Response('<rss/>'); };

    for (const origin of [
        'https://evil.example.com',
        'https://elite-engineering.pages.dev.evil.com',
        'https://evilelite-engineering.pages.dev'
    ]) {
        const res = await worker.fetch(request(feedPath(ALLOWED_FEED), { origin }), env);
        assert.equal(res.status, 403, origin);
        assert.equal(res.headers.get('Access-Control-Allow-Origin'), null, origin);
        assert.equal(res.headers.get('Vary'), 'Origin');
    }
    assert.equal(fetched, false);
});

test('rejects requests without an Origin (curl, address bar) with 403', async () => {
    const res = await worker.fetch(request(feedPath(ALLOWED_FEED), { origin: null }), env);

    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: 'Origin not allowed' });
});

test('returns 502 when the feed responds with an error', async () => {
    mockUpstream(403);

    const res = await worker.fetch(request(feedPath(ALLOWED_FEED)), env);

    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'Feed returned an error', status: 403 });
});

test('returns 502 when the feed cannot be reached', async () => {
    globalThis.fetch = async () => { throw new TypeError('network down'); };

    const res = await worker.fetch(request(feedPath(ALLOWED_FEED)), env);

    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'Could not reach feed' });
});

test('answers CORS preflight only for allowed origins', async () => {
    const origin = 'http://localhost:8788';

    const res = await worker.fetch(request('/api/feed', { method: 'OPTIONS', origin }), env);

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
    assert.match(res.headers.get('Access-Control-Allow-Methods'), /GET/);

    const denied = await worker.fetch(request('/api/feed', { method: 'OPTIONS', origin: 'https://evil.example.com' }), env);
    assert.equal(denied.status, 403);
});

test('returns 404 for unknown routes and methods', async () => {
    assert.equal((await worker.fetch(request('/'), env)).status, 404);
    assert.equal((await worker.fetch(request('/api/other'), env)).status, 404);
    assert.equal((await worker.fetch(request(feedPath(ALLOWED_FEED), { method: 'POST' }), env)).status, 404);
});

test('rate limits each IP and answers 429 with Retry-After', async () => {
    mockUpstream(200);
    env = { FEED_LIMITER: limiter(2) };

    const ok1 = await worker.fetch(request(feedPath(ALLOWED_FEED)), env);
    const ok2 = await worker.fetch(request(feedPath(ALLOWED_FEED)), env);
    const limited = await worker.fetch(request(feedPath(ALLOWED_FEED)), env);
    const otherIp = await worker.fetch(request(feedPath(ALLOWED_FEED), { ip: '198.51.100.7' }), env);

    assert.deepEqual([ok1.status, ok2.status, limited.status, otherIp.status], [200, 200, 429, 200]);
    assert.equal(limited.headers.get('Retry-After'), '60');
    assert.equal(limited.headers.get('Access-Control-Allow-Origin'), SITE, 'front can read the 429');
    assert.deepEqual(await limited.json(), { error: 'Too many requests' });
});

test('does not count blocked origins against the rate limit', async () => {
    await worker.fetch(request(feedPath(ALLOWED_FEED), { origin: 'https://evil.example.com' }), env);

    assert.equal(env.FEED_LIMITER.calls.size, 0);
});
