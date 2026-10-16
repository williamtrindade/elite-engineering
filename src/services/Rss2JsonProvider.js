import Cache from '../cache/Cache.js';
import Helper from '../helpers/Helper.js';

// Bump when the cached shape changes, so stale entries are dropped
const CACHE_PREFIX = 'articles_v2_';
const EXCERPT_LENGTH = 320;

export class Rss2JsonProvider {
    constructor() {
        // Old cache entries held the full article HTML (~200KB per feed)
        Cache.removeWhere(key => key.startsWith('articles_') && !key.startsWith(CACHE_PREFIX));
    }

    async fetch(url) {
        const cacheKey = `${CACHE_PREFIX}${url}`;
        const cachedData = Cache.get(cacheKey);

        if (cachedData) {
            console.log(`⚡ Loading from cache: ${url}`);
            return cachedData;
        }

        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = this.slim(await response.json());

        if (data.status !== 'ok') {
            throw new Error(`API returned non-ok status for ${url}`);
        }

        Cache.set(cacheKey, data);
        console.log(`🌐 Web Request: ${url}`);
        return data;
    }

    /**
     * Keep only what the UI shows. The full article content is dropped:
     * users read it on the original site.
     */
    slim(data) {
        if (data.status !== 'ok') return data;

        return {
            status: data.status,
            feed: data.feed,
            items: data.items.map(item => ({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                categories: (item.categories || []).slice(0, 2),
                excerpt: this.excerpt(item.description || item.content || '')
            }))
        };
    }

    excerpt(html) {
        // Many feeds end their summary with a "[...]" / "[…]" marker
        const text = Helper.stripHtml(html).replace(/\s*\[(…|\.\.\.)\]$/, '');
        return Helper.truncate(text, EXCERPT_LENGTH);
    }
}
