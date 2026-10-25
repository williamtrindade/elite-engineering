import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * What every RateLimiter must do. Run it against each implementation:
 *   rateLimiterContract('MemoryRateLimiter', limit => new MemoryRateLimiter({ requests: limit, periodSeconds: 60 }))
 *
 * @param {string} name
 * @param {(limit: number) => import('../../../api/src/ports.js').RateLimiter} create
 *   a limiter allowing `limit` calls per key in the current period
 */
export function rateLimiterContract(name, create) {
    test(`${name} (RateLimiter): allows up to the limit, then refuses`, async () => {
        const limiter = create(2);

        assert.equal(await limiter.limit('1.1.1.1'), true);
        assert.equal(await limiter.limit('1.1.1.1'), true);
        assert.equal(await limiter.limit('1.1.1.1'), false);
    });

    test(`${name} (RateLimiter): counts each key separately`, async () => {
        const limiter = create(1);

        assert.equal(await limiter.limit('1.1.1.1'), true);
        assert.equal(await limiter.limit('2.2.2.2'), true);
        assert.equal(await limiter.limit('1.1.1.1'), false);
    });

    test(`${name} (RateLimiter): answers with a boolean`, async () => {
        assert.equal(typeof await create(1).limit('k'), 'boolean');
    });
}
