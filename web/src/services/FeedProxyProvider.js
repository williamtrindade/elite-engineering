import Cache from '../cache/Cache.js';
import Helper from '../helpers/Helper.js';
import { API_BASE } from '../../config.js';

// Bump when the cached shape changes, so stale entries are dropped
const CACHE_PREFIX = 'articles_v4_';
const EXCERPT_LENGTH = 320;
const MAX_CATEGORIES = 2;

/**
 * Fetches feeds through our own API Worker (api/src/index.js),
 * which returns the raw XML, and parses RSS 2.0 / Atom in the browser.
 */
export class FeedProxyProvider {
    constructor() {
        Cache.removeWhere(key => key.startsWith('articles_') && !key.startsWith(CACHE_PREFIX));
    }

    async fetch(url, options = {}) {
        // The filter is part of the key, so changing it in companies.js isn't hidden by the cache
        const filter = options.categories || options.limit ? JSON.stringify([options.categories, options.limit]) : '';
        const cacheKey = `${CACHE_PREFIX}${url}${filter}`;
        const cachedData = Cache.get(cacheKey);

        if (cachedData) {
            console.log(`⚡ Loading from cache: ${url}`);
            return cachedData;
        }

        const response = await fetch(`${API_BASE}/api/feed?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = parseFeed(await response.text(), options);

        Cache.set(cacheKey, data);
        console.log(`🌐 Web Request: ${url}`);
        return data;
    }
}

/**
 * Turn RSS 2.0 or Atom XML into the shape the UI uses. Only what the UI shows
 * is kept: users read the full article on the original site.
 *
 * `categories` keeps only items in any of them (case-insensitive) and `limit`
 * caps how many are kept, for feeds that mix engineering posts with everything else.
 */
export function parseFeed(xml, { categories, limit = Infinity } = {}) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    if (doc.getElementsByTagName('parsererror').length) {
        throw new Error('Invalid XML');
    }

    const root = doc.documentElement;
    const format = { rss: RSS, feed: ATOM }[root?.tagName];

    if (!format) {
        throw new Error(`Unrecognized feed format: <${root?.tagName}>`);
    }

    const container = format.container(root);
    const wanted = categories && new Set(categories.map(category => category.toLowerCase()));

    // Filter before building items: excerpts are the costly part and big feeds have hundreds of entries
    const entries = format.entries(container)
        .map(el => ({ el, categories: format.categories(el) }))
        .filter(entry => !wanted || entry.categories.some(category => wanted.has(category.toLowerCase())))
        .slice(0, limit);

    return {
        status: 'ok',
        feed: format.feed(container),
        items: entries.map(({ el, categories }) => ({
            ...format.item(el),
            categories: categories.slice(0, MAX_CATEGORIES)
        }))
    };
}

const RSS = {
    container: root => child(root, 'channel'),
    entries: channel => children(channel, 'item'),
    categories: item => children(item, 'category').map(el => el.textContent.trim()).filter(Boolean),
    feed: channel => ({
        title: text(channel, 'title'),
        link: text(channel, 'link'),
        description: text(channel, 'description'),
        image: text(child(channel, 'image'), 'url')
    }),
    item: item => ({
        title: text(item, 'title'),
        link: text(item, 'link'),
        pubDate: text(item, 'pubDate'),
        excerpt: excerpt(text(item, 'description') || text(item, 'content:encoded')),
        // The full post (content:encoded) is likelier to have an <img> than the summary
        image: image(item, text(item, 'content:encoded') || text(item, 'description'), text(item, 'link'))
    })
};

const ATOM = {
    container: root => root,
    entries: root => children(root, 'entry'),
    categories: entry => children(entry, 'category').map(el => el.getAttribute('term')).filter(Boolean),
    feed: root => ({
        title: text(root, 'title'),
        link: alternateLink(root),
        description: text(root, 'subtitle'),
        image: text(root, 'logo') || text(root, 'icon')
    }),
    item: entry => ({
        title: text(entry, 'title'),
        link: alternateLink(entry),
        pubDate: text(entry, 'published') || text(entry, 'updated'),
        excerpt: excerpt(text(entry, 'summary') || text(entry, 'content')),
        image: image(entry, text(entry, 'content') || text(entry, 'summary'), alternateLink(entry))
    })
};

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

/**
 * Find the cover image URL of a feed item. Only reads the XML already downloaded:
 * no request is made here, the browser downloads the file later (see UI/ArticleMedia.js).
 *
 * Looks, in this order, for:
 *   1. <media:content medium="image" url="…">   (Google Research, Dropbox)
 *   2. <media:thumbnail url="…">
 *   3. <enclosure type="image/…" url="…">      (Cloudflare) or Atom <link rel="enclosure" href="…">
 *   4. the first real <img src="…"> in the post HTML (Meta, Netflix, AWS, NVIDIA…)
 *
 * `el` is the <item>/<entry>, `html` the post body, `base` the article link for relative URLs.
 * Returns an absolute https URL, or '' when the item has no image.
 */
function image(el, html, base) {
    const media =
        children(el, 'media:content').find(m => (m.getAttribute('medium') || m.getAttribute('type') || 'image').startsWith('image')) ||
        child(el, 'media:thumbnail') ||
        // Only image enclosures: AWS attaches .mp4 videos the same way
        [...children(el, 'enclosure'), ...children(el, 'link').filter(link => link.getAttribute('rel') === 'enclosure')]
            .find(enclosure => enclosure.getAttribute('type')?.startsWith('image/'));

    // media:* and <enclosure> use url="…", Atom <link> uses href="…"
    const url = media?.getAttribute('url') || media?.getAttribute('href') || firstImage(html);
    return absoluteUrl(url, base);
}

function firstImage(html) {
    if (!html || !html.includes('<img')) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = Array.from(doc.querySelectorAll('img')).find(img => {
        const src = img.getAttribute('src') || '';
        // Skip inline placeholders and tracking pixels / icons (Medium appends a 1x1 "stat" image)
        const tiny = ['width', 'height'].some(attr => {
            const size = parseInt(img.getAttribute(attr), 10);
            return size > 0 && size < 50;
        });
        return src && !src.startsWith('data:') && !tiny;
    });
    return img?.getAttribute('src') || '';
}

// Relative URLs resolve against the article; http is upgraded so the https site doesn't get mixed content
function absoluteUrl(url, base) {
    if (!url) return '';

    try {
        const parsed = new URL(url, base || undefined);
        if (parsed.protocol === 'http:') parsed.protocol = 'https:';
        return parsed.protocol === 'https:' ? parsed.href : '';
    } catch {
        return '';
    }
}
