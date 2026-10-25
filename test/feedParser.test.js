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
    // config.js picks the API URL from the page's hostname
    globalThis.location = new URL('http://localhost:8788/');
    ({ parseFeed } = await import('../web/src/services/FeedProxyProvider.js'));
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
        excerpt: 'Short summary',
        image: ''
    });
});

const rssItem = inner => parseFeed(`<?xml version="1.0"?>
    <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel><title>Blog</title><item><title>Post</title><link>https://example.com/blog/post</link>${inner}</item></channel>
    </rss>`).items[0];

test('reads the cover image from Media RSS and image enclosures', () => {
    assert.equal(rssItem('<media:content medium="image" url="https://cdn.example.com/a.png"/>').image, 'https://cdn.example.com/a.png');
    assert.equal(rssItem('<media:thumbnail url="https://cdn.example.com/t.png"/>').image, 'https://cdn.example.com/t.png');
    assert.equal(rssItem('<enclosure url="https://cdn.example.com/e.png" type="image/png" length="0"/>').image, 'https://cdn.example.com/e.png');
    assert.equal(rssItem('<enclosure url="https://cdn.example.com/v.mp4" type="video/mp4" length="1"/>').image, '', 'video enclosures are not covers');
});

test('falls back to the first real <img> in the post body', () => {
    const body = `<content:encoded><![CDATA[
        <img src="data:image/gif;base64,R0lGOD" alt="">
        <img src="https://example.com/emoji.png" width="16" height="16">
        <p>Text</p><img src="/images/cover.jpg" alt="Cover">
        <img src="https://medium.com/_/stat?event=post" width="1" height="1">
    ]]></content:encoded>`;

    assert.equal(rssItem(body).image, 'https://example.com/images/cover.jpg', 'relative src resolves against the article link');
});

test('upgrades http images and drops other schemes', () => {
    assert.equal(rssItem('<media:thumbnail url="http://cdn.example.com/t.png"/>').image, 'https://cdn.example.com/t.png');
    assert.equal(rssItem('<media:thumbnail url="javascript:alert(1)"/>').image, '');
    assert.equal(rssItem('<description>No images here</description>').image, '');
});

test('finds images in the real feeds', () => {
    assert.match(parseFeed(fixture('rss.xml')).items[0].image, /^https:\/\/blog\.cloudflare\.com\/.+\.png$/);
    assert.match(parseFeed(fixture('rss-content-encoded.xml')).items[0].image, /^https:\/\/cdn-images-1\.medium\.com\//);
});

test('rejects documents that are not RSS or Atom', () => {
    assert.throws(() => parseFeed('<html><body>Just a moment...</body></html>'), /Unrecognized feed format/);
});

test('keeps only items in the given categories', () => {
    const data = parseFeed(fixture('rss-categories.xml'), { categories: ['Engineering', 'Research'] });

    assert.deepEqual(data.items.map(item => item.title), [
        'Rapidly scaling online storage to serve over 1 billion ChatGPT users (Part II)',
        'How we built ChatGPT’s novel ad stack for user trust and relevance'
    ]);
    assert.deepEqual(data.items[0].categories, ['Engineering']);
});

test('matches categories case-insensitively and drops uncategorized items', () => {
    const data = parseFeed(fixture('rss-categories.xml'), { categories: ['security'] });

    assert.equal(data.items.length, 2);
    assert.ok(data.items.every(item => item.categories.includes('Security')));
});

test('limits the number of items after filtering', () => {
    const all = parseFeed(fixture('rss-categories.xml'));
    const limited = parseFeed(fixture('rss-categories.xml'), { limit: 5 });
    const filteredAndLimited = parseFeed(fixture('rss-categories.xml'), { categories: ['Engineering'], limit: 1 });

    assert.equal(all.items.length, 18);
    assert.deepEqual(limited.items, all.items.slice(0, 5));
    assert.equal(filteredAndLimited.items.length, 1);
    assert.match(filteredAndLimited.items[0].title, /^Rapidly scaling online storage/);
});
