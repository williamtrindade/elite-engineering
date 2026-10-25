/**
 * Ports: what the API core (app.js) needs from the outside world.
 * Implementations live in ./adapters.js or in a platform folder (api/platforms/).
 * Each port with more than one implementation has a contract suite in test/api/contracts/.
 *
 * @typedef {object} RateLimiter
 *   Counts requests per key (the client IP).
 *   Implementations: MemoryRateLimiter (adapters.js), CfRateLimiter (platforms/cloudflare).
 * @property {(key: string) => Promise<boolean>} limit  true = allowed, false = over the limit
 *
 * @typedef {object} FeedResponse
 * @property {boolean} ok        true for a 2xx answer
 * @property {number} status     the blog's HTTP status
 * @property {ReadableStream|string|null} body  the raw XML
 *
 * @typedef {object} FeedGateway
 *   Downloads a feed from its blog. Implementations: FetchFeedGateway, CachedFeedGateway (adapters.js).
 * @property {(url: string) => Promise<FeedResponse>} fetch  rejects when the blog can't be reached
 *
 * @typedef {(fields: object, message: string) => void} LogMethod
 *
 * @typedef {object} Logger
 *   Structured logger. pino satisfies it; each platform creates its own.
 * @property {LogMethod} info
 * @property {LogMethod} warn
 * @property {LogMethod} error
 *
 * @typedef {(request: Request) => string} ClientIp
 *   The client's IP for rate limiting. Each platform knows where to find it.
 */

export {};
