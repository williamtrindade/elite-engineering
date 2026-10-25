import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReelUrl, parseReelParam } from '../web/src/helpers/ShareLink.js';

const articleLink = 'https://blog.cloudflare.com/post?id=1&lang=en#intro';

test('builds a link to our site that keeps the current page but replaces its query', () => {
    const url = buildReelUrl(articleLink, 'https://elite.dev/app/?q=old#top');

    assert.equal(url.origin + url.pathname, 'https://elite.dev/app/');
    assert.equal(url.search.startsWith('?reel='), true);
    assert.equal(url.hash, '');
});

test('round-trips article links with their own query and hash', () => {
    const url = buildReelUrl(articleLink, 'https://elite.dev/');

    assert.equal(parseReelParam(url.search), articleLink);
});

test('returns null when there is no reel param', () => {
    assert.equal(parseReelParam(''), null);
    assert.equal(parseReelParam('?q=php'), null);
    assert.equal(parseReelParam('?reel='), null);
});
