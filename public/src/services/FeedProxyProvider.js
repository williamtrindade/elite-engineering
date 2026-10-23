import Cache from '../cache/Cache.js';
import Helper from '../helpers/Helper.js';

// Bump when the cached shape changes, so stale entries are dropped
const CACHE_PREFIX = 'articles_v3_';
const EXCERPT_LENGTH = 320;
const MAX_CATEGORIES = 2;

/**
 * Fetches feeds through our own Pages Function (functions/api/feed.js),
 * which returns the raw XML, and parses RSS 2.0 / Atom in the browser.
 */
export class FeedProxyProvider {
    constructor() {
        Cache.removeWhere(key => key.startsWith('articles_') && !key.startsWith(CACHE_PREFIX));
    }

    async fetch(url) {
        const cacheKey = `${CACHE_PREFIX}${url}`;
        const cachedData = Cache.get(cacheKey);

        if (cachedData) {
            console.log(`⚡ Loading from cache: ${url}`);
            return cachedData;
        }

        const response = await fetch(`/api/feed?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = parseFeed(await response.text());

        Cache.set(cacheKey, data);
        console.log(`🌐 Web Request: ${url}`);
        return data;
    }
}

/**
 * Turn RSS 2.0 or Atom XML into the shape the UI uses. Only what the UI shows
 * is kept: users read the full article on the original site.
 */
export function parseFeed(xml) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    if (doc.getElementsByTagName('parsererror').length) {
        throw new Error('Invalid XML');
    }

    const root = doc.documentElement;

    if (root?.tagName === 'rss') return parseRss(root);
    if (root?.tagName === 'feed') return parseAtom(root);

    throw new Error(`Unrecognized feed format: <${root?.tagName}>`);
}

function parseRss(root) {
    const channel = child(root, 'channel');

    return {
        status: 'ok',
        feed: {
            title: text(channel, 'title'),
            link: text(channel, 'link'),
            description: text(channel, 'description'),
            image: text(child(channel, 'image'), 'url')
        },
        items: children(channel, 'item').map(item => ({
            title: text(item, 'title'),
            link: text(item, 'link'),
            pubDate: text(item, 'pubDate'),
            categories: children(item, 'category')
                .map(el => el.textContent.trim())
                .slice(0, MAX_CATEGORIES),
            excerpt: excerpt(text(item, 'description') || text(item, 'content:encoded'))
        }))
    };
}

function parseAtom(root) {
    return {
        status: 'ok',
        feed: {
            title: text(root, 'title'),
            link: alternateLink(root),
            description: text(root, 'subtitle'),
            image: text(root, 'logo') || text(root, 'icon')
        },
        items: children(root, 'entry').map(entry => ({
            title: text(entry, 'title'),
            link: alternateLink(entry),
            pubDate: text(entry, 'published') || text(entry, 'updated'),
            categories: children(entry, 'category')
                .map(el => el.getAttribute('term'))
                .filter(Boolean)
                .slice(0, MAX_CATEGORIES),
            excerpt: excerpt(text(entry, 'summary') || text(entry, 'content'))
        }))
    };
}

// A <link> without rel is "alternate" by the Atom spec
function alternateLink(el) {
    const link = children(el, 'link').find(link =>
        (link.getAttribute('rel') || 'alternate') === 'alternate' && link.getAttribute('href')
    );
    return link?.getAttribute('href') || '';
}

// Direct children only: <title> also appears inside <image> and <entry>
function children(el, tagName) {
    return el ? Array.from(el.children).filter(c => c.tagName === tagName) : [];
}

function child(el, tagName) {
    return children(el, tagName)[0] || null;
}

function text(el, tagName) {
    return child(el, tagName)?.textContent.trim() || '';
}

function excerpt(html) {
    // Many feeds end their summary with a "[...]" / "[…]" marker
    const text = Helper.stripHtml(html).replace(/\s*\[(…|\.\.\.)\]$/, '');
    return Helper.truncate(text, EXCERPT_LENGTH);
}
