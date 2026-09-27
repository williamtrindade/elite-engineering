import Cache from '../cache/Cache.js';

export class Rss2JsonProvider {
    async fetch(url) {
        const cacheKey = `articles_${url}`;
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

        const data = await response.json();

        if (data.status !== 'ok') {
            throw new Error(`API returned non-ok status for ${url}`);
        }

        Cache.set(cacheKey, data);
        console.log(`🌐 Web Request: ${url}`);
        return data;
    }
}