import { escapeHtml } from './format.js';
import { createArticleMedia } from './ArticleMedia.js';
import { HOUSE_AD, sponsorUrl } from '../core/sponsorSlots.js';

// What the house ad says while there are no sponsors (data/sponsors.js)
const HOUSE_CONTENT = {
    name: 'Elite Engineering',
    title: 'Advertise here',
    description: 'Reach engineers who read the best tech blogs. Sponsored cards in the feed and in Reels, always clearly labeled.',
    cta: 'See formats',
    url: 'advertise'
};

/**
 * The card's content and link. Sponsor links get UTM tags and rel="sponsored"
 * (Google asks for it on paid links); the house ad is an internal link.
 */
function content(sponsor, placement) {
    if (sponsor === HOUSE_AD) {
        return { ...HOUSE_CONTENT, rel: '', target: '_self' };
    }
    return {
        ...sponsor,
        cta: sponsor.cta || 'Learn more',
        url: sponsorUrl(sponsor.url, placement),
        rel: 'sponsored noopener',
        target: '_blank'
    };
}

function link(card, { url, rel, target }) {
    card.href = url;
    card.target = target;
    if (rel) card.rel = rel;
}

// Cover: the sponsor's image, or its brand color with an icon (same fallback as articles)
function media(sponsor, className) {
    const cover = createArticleMedia({ image: sponsor.image }, { color: sponsor.color }, { className, eager: className === 'reels-media' });
    if (!sponsor.image) {
        cover.insertAdjacentHTML('beforeend', '<i class="fas fa-bullhorn sponsor-media-icon" aria-hidden="true"></i>');
    }
    return cover;
}

const BADGE = '<span class="sponsor-badge">Sponsored</span>';

// Same size and layout as an article card, so the grid doesn't shift
export function createSponsorGridCard(sponsor) {
    const c = content(sponsor, 'grid');

    const card = document.createElement('a');
    card.className = 'article-card sponsor-card glass-panel glass-hover rounded-2xl overflow-hidden flex flex-col h-full';
    link(card, c);

    const body = document.createElement('div');
    body.className = 'p-6 flex flex-col flex-grow';
    body.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-semibold text-gray-300 tracking-wide uppercase">${escapeHtml(c.name)}</span>
            ${BADGE}
        </div>

        <h2 class="text-xl font-bold mb-3 text-white leading-tight">${escapeHtml(c.title)}</h2>

        <p class="text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">${escapeHtml(c.description)}</p>

        <div class="mt-auto pt-4 border-t border-white/10 flex justify-end">
            <span class="accent-text text-sm font-medium whitespace-nowrap">
                ${escapeHtml(c.cta)} <i class="fas fa-arrow-right text-xs ml-1"></i>
            </span>
        </div>
    `;

    card.append(media(c, 'aspect-video'), body);
    return card;
}

// Full-screen Reels card: no Share/Copy, since sponsor slots aren't shareable
export function createSponsorReelsCard(sponsor) {
    const c = content(sponsor, 'reels');

    const card = document.createElement('article');
    card.className = 'reels-card';
    card.innerHTML = `
        <div class="reels-shade"></div>

        <div class="reels-info">
            <div class="flex items-center gap-2.5 mb-3">
                ${BADGE}
                <span class="text-sm font-semibold text-white truncate">${escapeHtml(c.name)}</span>
            </div>

            <h2 class="text-xl md:text-3xl font-bold text-white leading-snug mb-2">${escapeHtml(c.title)}</h2>

            <p class="reels-excerpt">${escapeHtml(c.description)}</p>

            <a class="reels-read-link">
                ${escapeHtml(c.cta)} <i class="fas fa-arrow-right text-xs"></i>
            </a>
        </div>
    `;

    link(card.querySelector('.reels-read-link'), c);
    card.prepend(media(c, 'reels-media'));
    return card;
}
