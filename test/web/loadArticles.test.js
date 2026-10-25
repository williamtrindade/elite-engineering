import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LoadArticles } from '../../web/src/core/LoadArticles.js';
import { CachedFeedGateway } from '../../web/src/adapters/CachedFeedGateway.js';
import { LocalStorageStore } from '../../web/src/adapters/LocalStorageStore.js';
import { Company } from '../../web/src/core/Company.js';
import { Feed } from '../../web/src/core/Feed.js';
import { Article } from '../../web/src/core/Article.js';

const item = (title, pubDate) => ({ title, pubDate, link: `https://x/${title}`, excerpt: '', image: '', categories: [] });

// FeedGateway fake: answers from a map of url -> items, throws for unknown urls
const gateway = feeds => ({
    calls: [],
    async fetch(url, options) {
        this.calls.push({ url, options });
        if (!feeds[url]) throw new Error('down');
        return { feed: {}, items: feeds[url] };
    }
});

// In-memory stand-in for window.localStorage
const memoryStorage = () => {
    const data = {};
    return new Proxy(data, {
        get: (target, prop) => ({
            getItem: key => (key in target ? target[key] : null),
            setItem: (key, value) => { target[key] = String(value); },
            removeItem: key => { delete target[key]; }
        })[prop] ?? target[prop]
    });
};

const companies = [
    new Company({ id: 'a', name: 'A', feeds: [new Feed({ url: 'https://a/feed', categories: ['Eng'], limit: 5 })] }),
    new Company({ id: 'b', name: 'B', feeds: [new Feed({ url: 'https://b/feed' }), new Feed({ url: 'https://b/broken' })] })
];

test('LoadArticles merges every feed into Articles, newest first', async () => {
    const feeds = gateway({
        'https://a/feed': [item('a-old', '2026-01-01')],
        'https://b/feed': [item('b-new', '2026-03-01'), item('b-mid', '2026-02-01')]
    });

    const articles = await new LoadArticles(feeds).execute(companies);

    assert.deepEqual(articles.map(a => a.title), ['b-new', 'b-mid', 'a-old']);
    assert.ok(articles.every(a => a instanceof Article));
    assert.deepEqual([articles[0].companyId, articles[0].companyName], ['b', 'B']);
});

test('LoadArticles skips a broken feed and passes the feed filter along', async () => {
    const feeds = gateway({ 'https://a/feed': [item('a', '2026-01-01')], 'https://b/feed': [] });

    const articles = await new LoadArticles(feeds).execute(companies);

    assert.deepEqual(articles.map(a => a.title), ['a']);
    assert.deepEqual(feeds.calls.find(c => c.url === 'https://a/feed').options, { categories: ['Eng'], limit: 5 });
});

test('CachedFeedGateway reuses a stored feed and drops old cache versions', async () => {
    const storage = memoryStorage();
    storage.setItem('articles_v1_https://old', '{}');
    storage.setItem('theme', 'dark');
    const inner = gateway({ 'https://a/feed': [item('a', '2026-01-01')] });

    const cached = new CachedFeedGateway(inner, new LocalStorageStore(storage));
    await cached.fetch('https://a/feed');
    const second = await cached.fetch('https://a/feed');

    assert.equal(inner.calls.length, 1);
    assert.equal(second.items[0].title, 'a');
    assert.equal(storage.getItem('articles_v1_https://old'), null);
    assert.equal(storage.getItem('theme'), 'dark');
});
