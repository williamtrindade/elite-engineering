// Sponsored slots in the grid and in Reels (rules in src/core/sponsorSlots.js).
// With no sponsors, an "Advertise here" card (linking to /advertise) fills the same slots.

// Public contact for advertisers, also used by advertise.html (test/web/sponsors.test.js checks they match).
// TODO before deploying: replace with the real address or form link.
export const ADVERTISE_CONTACT = 'mailto:ads@example.com';

/**
 * @type {import('../src/core/sponsorSlots.js').Sponsor[]}
 *
 * Example:
 * {
 *     id: 'acme',
 *     name: 'Acme',
 *     title: 'Deploy at the edge in seconds',
 *     description: 'Acme runs your code close to your users. Free tier included.',
 *     url: 'https://acme.dev/',
 *     image: 'https://acme.dev/banner.png',
 *     color: '#f97316',
 *     cta: 'Try Acme',
 *     placements: ['grid', 'reels']
 * }
 */
export const sponsors = [];
