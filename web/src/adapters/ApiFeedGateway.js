import { parseFeed } from './feedParser.js';

// The page waits for every feed, so one that never answers must not hold it forever.
// Longer than the API's own upstream timeout, so the API normally answers first.
const FEED_TIMEOUT_MS = 10000;

/**
 * FeedGateway through our API (api/), which returns the raw XML because blogs
 * don't allow cross-origin requests. The XML is parsed here, in the browser.
 *
 * @implements {import('../ports.js').FeedGateway}
 */
export class ApiFeedGateway {
    /**
     * @param {string} apiBase  e.g. http://localhost:8787 (from web/config.js)
     */
    constructor(apiBase, { timeoutMs = FEED_TIMEOUT_MS } = {}) {
        this.apiBase = apiBase;
        this.timeoutMs = timeoutMs;
    }

    async fetch(url, options = {}) {
        const response = await fetch(`${this.apiBase}/api/feed?url=${encodeURIComponent(url)}`, {
            signal: AbortSignal.timeout(this.timeoutMs)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = parseFeed(await response.text(), options);
        console.log(`🌐 Web Request: ${url}`);
        return data;
    }
}
