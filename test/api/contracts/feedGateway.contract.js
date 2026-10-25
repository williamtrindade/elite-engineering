import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mockFetch, upstream } from '../helpers.js';

const URL_A = 'https://blog.example.com/rss';

/**
 * What every FeedGateway over HTTP must do, with globalThis.fetch standing in for the blog.
 *
 * @param {string} name
 * @param {() => import('../../../api/src/ports.js').FeedGateway} create
 */
export function feedGatewayContract(name, create) {
    let restore = () => {};
    afterEach(() => restore());

    test(`${name} (FeedGateway): returns ok, status and the body for a 2xx`, async () => {
        restore = mockFetch(upstream(200, '<rss>a</rss>'));

        const response = await create().fetch(URL_A);

        assert.equal(response.ok, true);
        assert.equal(response.status, 200);
        assert.equal(await new Response(response.body).text(), '<rss>a</rss>');
    });

    test(`${name} (FeedGateway): returns ok=false with the status for an error`, async () => {
        restore = mockFetch(upstream(404));

        const response = await create().fetch(URL_A);

        assert.equal(response.ok, false);
        assert.equal(response.status, 404);
    });

    test(`${name} (FeedGateway): rejects when the blog can't be reached`, async () => {
        restore = mockFetch(async () => { throw new TypeError('network down'); });

        await assert.rejects(create().fetch(URL_A));
    });

    test(`${name} (FeedGateway): sends a browser-like User-Agent`, async () => {
        let userAgent;
        restore = mockFetch(async (url, init) => {
            userAgent = new Headers(init.headers).get('User-Agent');
            return new Response('<rss/>');
        });

        await create().fetch(URL_A);

        assert.match(userAgent, /Mozilla/);
    });
}
