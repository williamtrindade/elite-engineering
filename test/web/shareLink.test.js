import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReelUrl, parseReelParam, parseSearchParam } from '../../web/src/ui/ShareLink.js';

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

test('reads the search query from ?q= (the WebSite SearchAction target)', () => {
    assert.equal(parseSearchParam('?q=%20llm%20inference%20'), 'llm inference');
    assert.equal(parseSearchParam('?reel=x'), '');
    assert.equal(parseSearchParam(''), '');
});
