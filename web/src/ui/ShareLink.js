// Shared articles link back to our Reels (?reel=<article link>) instead of the original blog.
// The article link is the id: it's the only field that is stable across feed reloads.
const PARAM = 'reel';

export function buildReelUrl(articleLink, base = window.location.href) {
    const url = new URL(base);
    url.search = '';
    url.hash = '';
    url.searchParams.set(PARAM, articleLink);
    return url;
}

export function parseReelParam(search = window.location.search) {
    return new URLSearchParams(search).get(PARAM) || null;
}

// Search links (?q=<query>) open the home page with the search already applied.
// It's the target of the WebSite SearchAction in index.html.
export function parseSearchParam(search = window.location.search) {
    return (new URLSearchParams(search).get('q') || '').trim();
}
