import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DOMParser } from 'linkedom';
import { companiesList } from '../../web/data/companies.js';

const SITE = 'https://elite-engineering.pages.dev/';
const web = (path) => new URL(`../../web/${path}`, import.meta.url);
const read = (path) => readFileSync(web(path), 'utf8');

const doc = new DOMParser().parseFromString(read('index.html'), 'text/html');
const meta = (attr, name) => doc.querySelector(`meta[${attr}="${name}"]`)?.getAttribute('content');

test('has a title and a description for search results', () => {
    assert.match(doc.title, /Elite Engineering/);
    assert.ok(meta('name', 'description')?.length >= 50);
});

test('declares the production URL as canonical', () => {
    assert.equal(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), SITE);
});

test('has Open Graph and Twitter tags for link previews', () => {
    for (const key of ['og:title', 'og:description', 'og:type', 'og:site_name']) {
        assert.ok(meta('property', key), `missing ${key}`);
    }
    assert.equal(meta('property', 'og:url'), SITE);
    assert.equal(meta('name', 'twitter:card'), 'summary_large_image');

    // Social crawlers need an absolute URL, and the file must exist
    const image = meta('property', 'og:image');
    assert.ok(image.startsWith(SITE), image);
    assert.ok(existsSync(web(image.slice(SITE.length))), `missing ${image}`);
});

test('has WebSite structured data whose search target the app understands', () => {
    const json = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);

    assert.equal(json['@type'], 'WebSite');
    assert.equal(json.url, SITE);
    assert.equal(json.potentialAction.target.urlTemplate, `${SITE}?q={search_term_string}`);
});

test('names every company in the static text, so crawlers see them without JS', () => {
    const text = doc.querySelector('#about').textContent;

    for (const company of companiesList) {
        assert.ok(text.includes(company.name), `missing ${company.name}`);
    }
});

test('robots.txt allows crawling and points to the sitemap', () => {
    const robots = read('robots.txt');

    assert.match(robots, /^User-agent: \*$/m);
    assert.match(robots, /^Allow: \/$/m);
    assert.match(robots, new RegExp(`^Sitemap: ${SITE}sitemap.xml$`, 'm'));
});

test('sitemap.xml lists the home page and the advertise page', () => {
    const sitemap = new DOMParser().parseFromString(read('sitemap.xml'), 'text/xml');
    const locs = [...sitemap.querySelectorAll('url > loc')].map(loc => loc.textContent.trim());

    assert.deepEqual(locs, [SITE, `${SITE}advertise`]);
});
