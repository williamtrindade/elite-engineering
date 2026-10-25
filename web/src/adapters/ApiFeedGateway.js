import { parseFeed } from './feedParser.js';

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
    constructor(apiBase) {
        this.apiBase = apiBase;
    }

    async fetch(url, options = {}) {
        const response = await fetch(`${this.apiBase}/api/feed?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = parseFeed(await response.text(), options);
        console.log(`🌐 Web Request: ${url}`);
        return data;
    }
}
