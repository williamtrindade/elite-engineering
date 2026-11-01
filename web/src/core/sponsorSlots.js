/**
 * @typedef {object} Sponsor
 * @property {string} id
 * @property {string} name
 * @property {string} title       headline on the card
 * @property {string} description
 * @property {string} url         where the card links to (UTM tags are added)
 * @property {string} [image]     cover image URL
 * @property {string} [color]     brand color for the cover fallback
 * @property {string} [cta]       button label, "Learn more" by default
 * @property {('grid'|'reels')[]} placements
 */

// Fills the slots when there are no sponsors: it links to /advertise
export const HOUSE_AD = Object.freeze({ id: 'house' });

/**
 * One slot after every `every` articles, never at the end of the list
 * (so there are floor((n - 1) / every) slots). Sponsors for this placement
 * take turns in the slots; with none, the house ad fills them.
 *
 * @returns {Array<object>} the articles, plus `{ isSponsored: true, sponsor }` slots
 */
export function placeSponsors(articles, sponsors, { placement, every }) {
    const eligible = sponsors.filter(s => s.placements.includes(placement));
    const items = [];
    let slots = 0;

    articles.forEach((article, i) => {
        if (i > 0 && i % every === 0) {
            const sponsor = eligible.length ? eligible[slots % eligible.length] : HOUSE_AD;
            items.push({ isSponsored: true, sponsor });
            slots++;
        }
        items.push(article);
    });

    return items;
}

// So sponsors can count the clicks we send in their own analytics, without tracking on our side
export function sponsorUrl(url, placement) {
    const result = new URL(url);
    result.searchParams.set('utm_source', 'elite-engineering');
    result.searchParams.set('utm_medium', 'sponsored');
    result.searchParams.set('utm_content', placement);
    return result.href;
}
