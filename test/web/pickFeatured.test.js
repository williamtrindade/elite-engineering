import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pickFeatured } from '../../web/src/core/pickFeatured.js';
import { state } from '../../web/src/ui/state.js';

const article = (title, companyId, timestamp, image = `https://img/${title}.png`) =>
    ({ title, companyId, timestamp, image, excerpt: '', link: `https://blog/${title}` });

const titles = (articles) => articles.map(a => a.title);

test('picks the newest articles that have a cover image', () => {
    const articles = [
        article('old', 'meta', 1),
        article('newest', 'netflix', 3),
        article('no-image', 'google', 4, ''),
        article('middle', 'nvidia', 2)
    ];

    assert.deepEqual(titles(pickFeatured(articles)), ['newest', 'middle', 'old']);
});

test('takes at most one article per company, so the section stays varied', () => {
    const articles = [
        article('cf-1', 'cloudflare', 5),
        article('cf-2', 'cloudflare', 4),
        article('meta-1', 'meta', 3),
        article('cf-3', 'cloudflare', 2),
        article('openai-1', 'openai', 1)
    ];

    assert.deepEqual(titles(pickFeatured(articles)), ['cf-1', 'meta-1', 'openai-1']);
});

test('returns up to `count` articles, fewer when not enough qualify', () => {
    const articles = ['a', 'b', 'c', 'd'].map((id, i) => article(id, id, 10 - i));

    assert.equal(pickFeatured(articles).length, 3);
    assert.equal(pickFeatured(articles, { count: 2 }).length, 2);
    assert.deepEqual(pickFeatured([article('x', 'meta', 1, '')]), []);
    assert.deepEqual(pickFeatured([]), []);
});

test('does not reorder the input', () => {
    const articles = [article('a', 'meta', 1), article('b', 'netflix', 2)];

    pickFeatured(articles);

    assert.deepEqual(titles(articles), ['a', 'b']);
});

beforeEach(() => {
    state.allArticles = [
        article('cf-new', 'cloudflare', 5),
        article('meta-new', 'meta', 4),
        article('cf-old', 'cloudflare', 3),
        article('openai-new', 'openai', 2),
        article('plain', 'nvidia', 1, '')
    ];
    state.activeFilter = null;
    state.searchQuery = '';
});

test('home view: featured articles are left out of the grid', () => {
    assert.deepEqual(titles(state.featuredArticles), ['cf-new', 'meta-new', 'openai-new']);
    assert.deepEqual(titles(state.gridArticles), ['cf-old', 'plain']);
});

test('filtering or searching hides the featured section and shows every match in the grid', () => {
    state.activeFilter = 'cloudflare';
    assert.deepEqual(state.featuredArticles, []);
    assert.deepEqual(titles(state.gridArticles), ['cf-new', 'cf-old']);

    state.activeFilter = null;
    state.searchQuery = 'new';
    assert.deepEqual(state.featuredArticles, []);
    assert.deepEqual(titles(state.gridArticles), ['cf-new', 'meta-new', 'openai-new']);
});

test('grid items: sponsor slots go among the grid articles, never among the featured ones', () => {
    state.allArticles = Array.from({ length: 12 }, (_, i) => article(`a${i}`, `c${i}`, 100 - i));

    const items = state.gridItems;

    assert.equal(items.length, 9 + 1); // 12 - 3 featured, plus the house ad after the 8th
    assert.equal(items[8].isSponsored, true);
    assert.ok(!items.some(i => state.featuredArticles.includes(i)));
});
