import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOMParser } from 'linkedom';

let parseFeed;

const fixture = name => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf-8');

before(async () => {
    // The parser (and Helper.stripHtml) rely on the browser's global DOMParser.
    // Browsers wrap an HTML fragment in <html><body>; linkedom doesn't.
    globalThis.DOMParser = class extends DOMParser {
        parseFromString(markup, type) {
            const wrapped = type === 'text/html' ? `<html><body>${markup}</body></html>` : markup;
            return super.parseFromString(wrapped, type);
        }
    };
    ({ parseFeed } = await import('../public/src/services/FeedProxyProvider.js'));
});

test('parses an RSS 2.0 feed', () => {
    const data = parseFeed(fixture('rss.xml'));

    assert.equal(data.status, 'ok');
    assert.deepEqual(data.feed, {
        title: 'Cloudflare Blog',
        link: 'https://blog.cloudflare.com/',
        description: 'Technical deep dives, product updates, and insights from the teams that are helping to build a better Internet.',
        image: 'https://blog.cloudflare.com/favicon.ico'
    });
    assert.equal(data.items.length, 2);

    const [first] = data.items;
    assert.equal(first.title, 'Origin Range Requests: Serving large files without range-request tuning');
    assert.equal(first.link, 'https://blog.cloudflare.com/origin-range-requests/');
    assert.equal(first.pubDate, 'Fri, 23 Oct 2026 18:22:59 GMT');
    assert.deepEqual(first.categories, ['Cache', 'Performance']);
    assert.match(first.excerpt, /^Naive byte-range caching can waste gigabytes/);
});

test('falls back to content:encoded and unwraps CDATA', () => {
    const data = parseFeed(fixture('rss-content-encoded.xml'));

    assert.equal(data.feed.title, 'The Airbnb Tech Blog - Medium');

    const [first] = data.items;
    assert.equal(first.title, 'CASTLE: training natural language search before the first real query');
    assert.deepEqual(first.categories, ['machine-learning', 'ai']);
    assert.ok(first.excerpt.length > 0, 'excerpt comes from content:encoded');
    assert.ok(first.excerpt.length <= 321, 'excerpt is truncated');
    assert.doesNotMatch(first.excerpt, /</, 'excerpt has no HTML');
});

test('parses an Atom feed', () => {
    const data = parseFeed(fixture('atom.xml'));

    assert.equal(data.feed.title, 'Swift.org');
    assert.equal(data.feed.link, '', 'empty alternate href is ignored, self link is not used');
    assert.equal(data.items.length, 2);

    const [first] = data.items;
    assert.equal(first.title, "What's new in Swift: September 2026 Edition");
    assert.equal(first.link, 'https://www.swift.org/blog/whats-new-in-swift-september-2026/');
    assert.equal(first.pubDate, '2026-10-08T13:00:00-04:00', 'uses <updated> without <published>');
    assert.deepEqual(first.categories, []);
    assert.match(first.excerpt, /^Welcome to “What’s new in Swift,”/, 'escaped HTML content is decoded');
});

test('reads Atom categories, summary and published', () => {
    const data = parseFeed(`<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <title>Blog</title>
            <link rel="self" href="https://example.com/atom.xml"/>
            <link rel="alternate" href="https://example.com/"/>
            <entry>
                <title>Post</title>
                <link rel="alternate" href="https://example.com/post"/>
                <published>2026-01-01T00:00:00Z</published>
                <updated>2026-02-01T00:00:00Z</updated>
                <category term="a"/><category term="b"/><category term="c"/>
                <summary>Short summary [...]</summary>
                <content type="html">Long content</content>
            </entry>
        </feed>`);

    assert.equal(data.feed.link, 'https://example.com/');
    assert.deepEqual(data.items[0], {
        title: 'Post',
        link: 'https://example.com/post',
        pubDate: '2026-01-01T00:00:00Z',
        categories: ['a', 'b'],
        excerpt: 'Short summary'
    });
});

test('rejects documents that are not RSS or Atom', () => {
    assert.throws(() => parseFeed('<html><body>Just a moment...</body></html>'), /Unrecognized feed format/);
});
