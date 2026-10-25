import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { CachedFeedGateway, FetchFeedGateway, MemoryCache, MemoryRateLimiter } from '../../api/src/adapters.js';
import { rateLimiterContract } from './contracts/rateLimiter.contract.js';
import { feedGatewayContract } from './contracts/feedGateway.contract.js';
import { mockFetch, upstream } from './helpers.js';

rateLimiterContract('MemoryRateLimiter', limit => new MemoryRateLimiter({ requests: limit, periodSeconds: 60 }));
feedGatewayContract('FetchFeedGateway', () => new FetchFeedGateway());
feedGatewayContract('CachedFeedGateway', () => new CachedFeedGateway(new FetchFeedGateway(), new MemoryCache(), 60));

// A clock the test moves by hand
const clock = (start = 0) => {
    let now = start;
    return { now: () => now, advance: ms => { now += ms; } };
};

test('MemoryRateLimiter starts a new window after the period', async () => {
    const time = clock();
    const limiter = new MemoryRateLimiter({ requests: 1, periodSeconds: 60, now: time.now });

    assert.equal(await limiter.limit('ip'), true);
    assert.equal(await limiter.limit('ip'), false);
    time.advance(60_000);
    assert.equal(await limiter.limit('ip'), true);
});

test('MemoryRateLimiter forgets keys whose window ended', async () => {
    const time = clock();
    const limiter = new MemoryRateLimiter({ requests: 1, periodSeconds: 60, now: time.now });

    await limiter.limit('a');
    time.advance(60_000);
    await limiter.limit('b');

    assert.deepEqual([...limiter.windows.keys()], ['b']);
});

test('MemoryCache returns values until they expire', () => {
    const time = clock();
    const cache = new MemoryCache({ now: time.now });

    cache.set('k', 'v', 10);
    assert.equal(cache.get('k'), 'v');
    time.advance(10_000);
    assert.equal(cache.get('k'), undefined);
    assert.equal(cache.get('missing'), undefined);
});

let restore = () => {};
afterEach(() => restore());

test('CachedFeedGateway downloads a feed once while it is cached', async () => {
    let downloads = 0;
    restore = mockFetch(async () => { downloads++; return new Response('<rss/>'); });
    const gateway = new CachedFeedGateway(new FetchFeedGateway(), new MemoryCache(), 60);

    const first = await gateway.fetch('https://blog.example.com/rss');
    const second = await gateway.fetch('https://blog.example.com/rss');

    assert.equal(downloads, 1);
    assert.equal(first.body, '<rss/>');
    assert.equal(second.body, '<rss/>');
});

test('CachedFeedGateway does not cache errors', async () => {
    let downloads = 0;
    restore = mockFetch(async () => { downloads++; return upstream(500)(); });
    const gateway = new CachedFeedGateway(new FetchFeedGateway(), new MemoryCache(), 60);

    await gateway.fetch('https://blog.example.com/rss');
    await gateway.fetch('https://blog.example.com/rss');

    assert.equal(downloads, 2);
});

test('FetchFeedGateway passes runtime-specific request options', async () => {
    let init;
    restore = mockFetch(async (url, options) => { init = options; return new Response('<rss/>'); });

    await new FetchFeedGateway({ init: { cf: { cacheTtl: 5 } } }).fetch('https://blog.example.com/rss');

    assert.deepEqual(init.cf, { cacheTtl: 5 });
});
