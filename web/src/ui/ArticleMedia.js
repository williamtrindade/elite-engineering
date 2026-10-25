// Below this the "image" is a spacer or icon, not a cover: show the fallback instead
const MIN_IMAGE_WIDTH = 120;

/**
 * Cover area for an article. This is where the image file is downloaded: `article.image` is
 * just the URL found in the feed (FeedProxyProvider.js), and setting it as the <img> src makes
 * the browser fetch it straight from the blog's server (not through our API), caching it
 * per the blog's Cache-Control headers. With `eager: false` (grid) the download waits until
 * the card nears the viewport; `eager: true` (Reels) downloads it right away.
 *
 * It has a fixed size, so cards don't jump while images load:
 * the company logo on its brand color shows until the image fades in on top, and stays
 * when the feed has no image or it fails to load (hotlink blocks, 404s, tiny pixels).
 */
export function createArticleMedia(article, company, { className = '', eager = false } = {}) {
    const media = document.createElement('div');
    media.className = `article-media ${className}`;
    if (company?.color) media.style.setProperty('--media-color', company.color);

    if (company?.logo) {
        const logo = document.createElement('img');
        logo.className = 'article-media-logo';
        logo.src = `static/${company.logo}`;
        logo.alt = '';
        logo.addEventListener('error', () => logo.remove(), { once: true });
        media.appendChild(logo);
    }

    if (!article.image) return media;

    const img = document.createElement('img');
    img.className = 'article-media-img';
    img.alt = '';
    img.decoding = 'async';
    img.loading = eager ? 'eager' : 'lazy';
    // Some blogs block hotlinking based on the Referer
    img.referrerPolicy = 'no-referrer';

    const fallback = () => {
        img.remove();
        media.classList.remove('is-loading');
    };

    img.addEventListener('load', () => {
        if (img.naturalWidth < MIN_IMAGE_WIDTH) return fallback();
        media.classList.remove('is-loading');
        media.classList.add('is-loaded');
    }, { once: true });
    img.addEventListener('error', fallback, { once: true });

    media.classList.add('is-loading');
    img.src = article.image;
    media.appendChild(img);

    return media;
}

// Warm the cache for an image that's about to be shown (e.g. the next Reels card)
export function preloadImage(url) {
    if (!url) return;

    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = url;
}
