import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiFeedGateway } from '../../web/src/adapters/ApiFeedGateway.js';
import { hangingFetch, mockFetch } from '../api/helpers.js';

let restore = () => {};
afterEach(() => restore());

test('ApiFeedGateway gives up on a feed the API never answers, so it cannot hold the page', async () => {
    restore = mockFetch(hangingFetch);

    await assert.rejects(new ApiFeedGateway('https://api.example', { timeoutMs: 20 }).fetch('https://blog.example.com/rss'));
});
