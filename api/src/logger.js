import pino from 'pino';

// Workers bundle pino's browser build: logs go to console as objects,
// which Cloudflare Workers Logs indexes as structured fields
export const logger = pino({
    level: 'info',
    browser: { asObject: true }
});
