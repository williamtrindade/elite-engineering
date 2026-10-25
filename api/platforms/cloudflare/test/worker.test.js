// Tests for the Cloudflare plugin. They live in this folder so deleting it removes them too.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { CfRateLimiter } from '../worker.js';
import { rateLimiterContract } from '../../../../test/api/contracts/rateLimiter.contract.js';
import { ALLOWED_FEED, SITE, mockFetch } from '../../../../test/api/helpers.js';

// wrangler.jsonc allows // comments; drop them (outside strings) to read it as JSON
function readJsonc(path) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf-8');
    let out = '';
    let inString = false;

    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        if (inString) {
            out += char;
            if (char === '\\') out += source[++i];
            else if (char === '"') inString = false;
        } else if (char === '"') {
            inString = true;
            out += char;
        } else if (char === '/' && source[i + 1] === '/') {
            while (i < source.length && source[i] !== '\n') i++;
            out += '\n';
        } else {
            out += char;
        }
    }
    return JSON.parse(out);
}

const wrangler = readJsonc('../wrangler.jsonc');

// Stand-in for the Workers Rate Limiting binding: allows `limit` calls per key
const binding = (limit = Infinity) => {
    const calls = new Map();
    return {
        calls,
        async limit({ key }) {
            calls.set(key, (calls.get(key) || 0) + 1);
            return { success: calls.get(key) <= limit };
        }
    };
};

// The env a deployed Worker gets: wrangler.jsonc vars plus the binding
const env = (limiter = binding()) => ({ ...wrangler.vars, FEED_LIMITER: limiter });

const request = (ip = '203.0.113.1') => new Request(
    `https://api.example.workers.dev/api/feed?url=${encodeURIComponent(ALLOWED_FEED)}`,
    { headers: { Origin: SITE, 'CF-Connecting-IP': ip } }
);

let restore = () => {};
afterEach(() => restore());

rateLimiterContract('CfRateLimiter', limit => new CfRateLimiter(binding(limit)));

test('serves a feed with the config from wrangler.jsonc vars', async () => {
    restore = mockFetch(async () => new Response('<rss/>'));

    const res = await worker.fetch(request(), env());

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), `public, max-age=${wrangler.vars.FEED_CACHE_SECONDS}`);
    assert.equal(await res.text(), '<rss/>');
});

test('asks Cloudflare to cache the feed at the edge', async () => {
    let init;
    restore = mockFetch(async (url, options) => { init = options; return new Response('<rss/>'); });

    await worker.fetch(request(), env());

    assert.deepEqual(init.cf, { cacheTtl: Number(wrangler.vars.FEED_CACHE_SECONDS), cacheEverything: true });
});

test('rate limits by CF-Connecting-IP through the binding', async () => {
    restore = mockFetch(async () => new Response('<rss/>'));
    const limiter = binding(1);
    const workerEnv = env(limiter);

    assert.equal((await worker.fetch(request('1.1.1.1'), workerEnv)).status, 200);
    const limited = await worker.fetch(request('1.1.1.1'), workerEnv);

    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('Retry-After'), wrangler.vars.RATE_LIMIT_PERIOD_SECONDS);
    assert.deepEqual([...limiter.calls.keys()], ['1.1.1.1']);
});

test('fails clearly when a var is missing', async () => {
    const { ALLOWED_ORIGINS, ...vars } = wrangler.vars;

    await assert.rejects(worker.fetch(request(), { ...vars, FEED_LIMITER: binding() }), /Missing ALLOWED_ORIGINS/);
});

test('the rate limit vars match the binding config', () => {
    const { simple } = wrangler.ratelimits.find(r => r.name === 'FEED_LIMITER');

    assert.equal(Number(wrangler.vars.RATE_LIMIT_REQUESTS), simple.limit);
    assert.equal(Number(wrangler.vars.RATE_LIMIT_PERIOD_SECONDS), simple.period);
});

test('the vars have the same keys as .env.example', () => {
    const exampleKeys = readFileSync(new URL('../../../../.env.example', import.meta.url), 'utf-8')
        .split('\n')
        .filter(line => /^[A-Z_]+=/.test(line))
        .map(line => line.split('=')[0])
        .filter(key => key !== 'PORT'); // Node only

    assert.deepEqual(Object.keys(wrangler.vars).sort(), exampleKeys.sort());
});
