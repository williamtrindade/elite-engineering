import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeSponsors, sponsorUrl, HOUSE_AD } from '../../web/src/core/sponsorSlots.js';

const articles = (n) => Array.from({ length: n }, (_, i) => ({ title: `a${i + 1}` }));
const sponsor = (id, placements = ['grid', 'reels']) => ({ id, url: `https://${id}.dev/`, placements });

// Compact view of a placed list: article titles, or the sponsor id / 'house' in the slots
const shape = (items) => items.map(item => item.isSponsored ? (item.sponsor === HOUSE_AD ? 'house' : item.sponsor.id) : item.title);
const slotCount = (items) => items.filter(i => i.isSponsored).length;
const GRID = { placement: 'grid', every: 8 };

test('one slot after every N articles', () => {
    const items = shape(placeSponsors(articles(20), [sponsor('x')], GRID));

    assert.deepEqual(items, [
        'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'x',
        'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a16', 'x',
        'a17', 'a18', 'a19', 'a20'
    ]);
});

test('count is floor((n - 1) / every): a slot never ends the list', () => {
    for (const [n, expected] of [[0, 0], [8, 0], [9, 1], [16, 1], [17, 2], [226, 28]]) {
        const items = placeSponsors(articles(n), [sponsor('x')], GRID);

        assert.equal(slotCount(items), expected, `n = ${n}`);
        assert.equal(items.filter(i => !i.isSponsored).length, n); // no article is lost
    }
});

test('sponsors of that placement take turns', () => {
    const items = placeSponsors(articles(40), [sponsor('a'), sponsor('reels-only', ['reels']), sponsor('b')], GRID);

    assert.deepEqual(shape(items).filter(v => v.length === 1), ['a', 'b', 'a', 'b']);
});

test('with no sponsors, the house ad fills the same slots', () => {
    const items = placeSponsors(articles(20), [sponsor('reels-only', ['reels'])], GRID);

    assert.deepEqual(shape(items).flatMap((v, i) => v === 'house' ? [i] : []), [8, 17]);
});

test('sponsor links carry UTM tags so sponsors can measure clicks', () => {
    const url = new URL(sponsorUrl('https://sponsor.dev/pricing?ref=1#plans', 'reels'));

    assert.equal(url.searchParams.get('utm_source'), 'elite-engineering');
    assert.equal(url.searchParams.get('utm_medium'), 'sponsored');
    assert.equal(url.searchParams.get('utm_content'), 'reels');
    assert.equal(url.searchParams.get('ref'), '1');
    assert.equal(url.hash, '#plans');
});
