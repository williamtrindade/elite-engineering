import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOMParser } from 'linkedom';
import { ADVERTISE_CONTACT, sponsors } from '../../web/data/sponsors.js';

const SITE = 'https://elite-engineering.pages.dev/';
const page = (path) => new DOMParser().parseFromString(
    readFileSync(new URL(`../../web/${path}`, import.meta.url), 'utf8'), 'text/html');

const advertise = page('advertise.html');

test('advertise.html uses the same contact as data/sponsors.js', () => {
    const contacts = [...advertise.querySelectorAll('[data-advertise-contact]')].map(a => a.getAttribute('href'));

    assert.ok(contacts.length > 0);
    assert.deepEqual(new Set(contacts), new Set([ADVERTISE_CONTACT]));
});

test('advertise.html has its own title, description and canonical', () => {
    assert.match(advertise.title, /Advertise/);
    assert.ok(advertise.querySelector('meta[name="description"]')?.getAttribute('content').length >= 50);
    assert.equal(advertise.querySelector('link[rel="canonical"]')?.getAttribute('href'), `${SITE}advertise`);
});

test('the home page footer links to advertise.html', () => {
    assert.ok(page('index.html').querySelector('#about a[href="advertise"]'));
});

test('every sponsor has what the cards need', () => {
    for (const sponsor of sponsors) {
        for (const key of ['id', 'name', 'title', 'description', 'url']) {
            assert.ok(sponsor[key], `${sponsor.id ?? '?'}: missing ${key}`);
        }
        assert.doesNotThrow(() => new URL(sponsor.url), `${sponsor.id}: invalid url`);
        assert.ok(sponsor.placements?.every(p => ['grid', 'reels'].includes(p)), `${sponsor.id}: placements`);
    }
});
