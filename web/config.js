const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

// The API is a separate Worker (api/); locally it runs on `wrangler dev`
export const API_BASE = isLocal
    ? 'http://localhost:8787'
    : 'https://elite-engineering-api.williamtrindade-dev.workers.dev';
