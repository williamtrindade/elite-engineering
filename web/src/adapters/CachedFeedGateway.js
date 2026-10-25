// Bump when the cached shape changes, so stale entries are dropped
const CACHE_PREFIX = 'articles_v4_';

/**
 * Decorator: keeps each parsed feed in a KeyValueStore (12 hours by default),
 * so a reload doesn't hit the API again.
 *
 * @implements {import('../ports.js').FeedGateway}
 */
export class CachedFeedGateway {
    /**
     * @param {import('../ports.js').FeedGateway} gateway
     * @param {import('../ports.js').KeyValueStore} store
     */
    constructor(gateway, store) {
        this.gateway = gateway;
        this.store = store;
        store.removeWhere(key => key.startsWith('articles_') && !key.startsWith(CACHE_PREFIX));
    }

    async fetch(url, options = {}) {
        // The filter is part of the key, so changing it in companies.js isn't hidden by the cache
        const filter = options.categories || options.limit ? JSON.stringify([options.categories, options.limit]) : '';
        const cacheKey = `${CACHE_PREFIX}${url}${filter}`;
        const cachedData = this.store.get(cacheKey);

        if (cachedData) {
            console.log(`⚡ Loading from cache: ${url}`);
            return cachedData;
        }

        const data = await this.gateway.fetch(url, options);
        this.store.set(cacheKey, data);
        return data;
    }
}
