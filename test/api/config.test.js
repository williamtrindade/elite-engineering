import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseConfig } from '../../api/src/config.js';
import { TEST_ENV } from './helpers.js';

test('parses the environment into typed config', () => {
    assert.deepEqual(parseConfig({ ...TEST_ENV, LOG_LEVEL: 'warn' }), {
        allowedOrigins: [
            'https://elite-engineering.pages.dev',
            'https://*.elite-engineering.pages.dev',
            'http://localhost:*',
            'http://127.0.0.1:*'
        ],
        feedCacheSeconds: 1800,
        rateLimit: { requests: 60, periodSeconds: 60 },
        logLevel: 'warn'
    });
});

test('defaults LOG_LEVEL to info', () => {
    assert.equal(parseConfig(TEST_ENV).logLevel, 'info');
});

test('fails on a missing or empty key, naming it', () => {
    for (const key of ['ALLOWED_ORIGINS', 'FEED_CACHE_SECONDS', 'RATE_LIMIT_REQUESTS', 'RATE_LIMIT_PERIOD_SECONDS']) {
        const { [key]: _, ...missing } = TEST_ENV;
        assert.throws(() => parseConfig(missing), new RegExp(`Missing ${key}`));
        assert.throws(() => parseConfig({ ...TEST_ENV, [key]: '  ' }), new RegExp(`Missing ${key}`));
    }
});

test('fails on numbers that are not positive integers', () => {
    for (const value of ['abc', '0', '-5', '1.5']) {
        assert.throws(() => parseConfig({ ...TEST_ENV, FEED_CACHE_SECONDS: value }), /positive integer/, value);
    }
});

test('.env.example has every key parseConfig needs', () => {
    const example = Object.fromEntries(
        readFileSync(new URL('../../.env.example', import.meta.url), 'utf-8')
            .split('\n')
            .filter(line => /^[A-Z_]+=/.test(line))
            .map(line => line.split(/=(.*)/s).slice(0, 2))
    );

    assert.doesNotThrow(() => parseConfig(example));
});
