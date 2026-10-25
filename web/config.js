const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

// Where the API (api/) lives. Only src/main.js imports this file.
// Locally it's the Node platform (npm run dev:api); in production, the Cloudflare Worker.
export const API_BASE = isLocal
    ? 'http://localhost:8787'
    : 'https://elite-engineering-api.williamtrindade-dev.workers.dev';
