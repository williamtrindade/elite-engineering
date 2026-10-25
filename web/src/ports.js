// Ports: what the core (core/) needs from the outside world.
// Implementations live in adapters/; main.js picks which ones to plug in.

/**
 * Loads and parses one feed.
 * Implementations: adapters/ApiFeedGateway.js, adapters/CachedFeedGateway.js.
 *
 * @typedef {object} FeedItem
 * @property {string} title
 * @property {string} link
 * @property {string} pubDate
 * @property {string} excerpt
 * @property {string} image       '' when the item has none
 * @property {string[]} categories
 *
 * @typedef {object} FeedData
 * @property {{ title: string, link: string, description: string, image: string }} feed
 * @property {FeedItem[]} items
 *
 * @typedef {object} FeedOptions
 * @property {string[]} [categories]  keep only items in any of these
 * @property {number} [limit]         keep at most this many items
 *
 * @typedef {object} FeedGateway
 * @property {(url: string, options?: FeedOptions) => Promise<FeedData>} fetch
 */

/**
 * Key/value storage with expiry, kept across page loads.
 * Implementation: adapters/LocalStorageStore.js.
 *
 * @typedef {object} KeyValueStore
 * @property {(key: string) => any} get  null when missing, expired or unreadable
 * @property {(key: string, data: any, ttlMinutes?: number) => void} set  never throws: storing is optional
 * @property {(predicate: (key: string) => boolean) => void} removeWhere
 */

export {};
