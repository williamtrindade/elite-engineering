import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../web/src/state/StateSingleton.js';

const article = (title, excerpt = '', companyId = 'cloudflare') => ({ title, excerpt, companyId });

beforeEach(() => {
    state.allArticles = [
        article('Cloudflare deploys protections against php2shell vulnerability', 'WAF rules for the new PHP flaws.'),
        article('Introducing full transaction detection', 'Correlates requests with responses to catch PHP2Shell exploits.'),
        article('Scaling storage for ChatGPT', 'How we built Habitat.', 'openai'),
        article('Untitled post', undefined, 'meta')
    ];
    state.activeFilter = null;
    state.searchQuery = '';
});

const titles = () => state.filteredArticles.map(a => a.title);

test('finds the query in the title or the excerpt, case-insensitively', () => {
    state.searchQuery = 'PHP2shell';

    assert.deepEqual(titles(), [
        'Cloudflare deploys protections against php2shell vulnerability',
        'Introducing full transaction detection'
    ]);
});

test('combines search with the company filter', () => {
    state.searchQuery = 'habitat';
    state.activeFilter = 'openai';
    assert.deepEqual(titles(), ['Scaling storage for ChatGPT']);

    state.activeFilter = 'cloudflare';
    assert.deepEqual(titles(), []);
});

test('handles articles without an excerpt', () => {
    state.searchQuery = 'untitled';

    assert.deepEqual(titles(), ['Untitled post']);
});
