// Composition root: the only module that picks implementations and reads config/data.
// Swapping an adapter (e.g. another FeedGateway) is a change here, nowhere else.
import { API_BASE } from '../config.js';
import { companiesList } from '../data/companies.js';
import { sponsors } from '../data/sponsors.js';
import { LoadArticles } from './core/LoadArticles.js';
import { ApiFeedGateway } from './adapters/ApiFeedGateway.js';
import { CachedFeedGateway } from './adapters/CachedFeedGateway.js';
import { LocalStorageStore } from './adapters/LocalStorageStore.js';
import { state } from './ui/state.js';
import { UI } from './ui/UI.js';
import { AppController } from './ui/AppController.js';
import { ReelsUI } from './ui/ReelsUI.js';
import { parseReelParam, parseSearchParam } from './ui/ShareLink.js';
import { initBackToTop } from './ui/BackToTop.js';
import { initColorScheme } from './ui/ColorScheme.js';

const ui = new UI();
const reels = new ReelsUI();

// Initialize Application
async function initApp() {
    state.companies = companiesList;
    state.sponsors = sponsors;

    const feedGateway = new CachedFeedGateway(new ApiFeedGateway(API_BASE), new LocalStorageStore());
    // A shared Reels link waits for every feed: the article may be in a slow one
    const loadArticles = new LoadArticles(feedGateway, parseReelParam() ? { waitMs: Infinity } : {});
    const appController = new AppController(loadArticles, ui);

    const sharedQuery = parseSearchParam();
    ui.DOM.searchInput.value = sharedQuery;
    applySearch(sharedQuery);

    ui.renderFilters();
    await appController.fetchAllData();

    openSharedReel();
}

/**
 * Shared links (?reel=<article link>) open straight into Reels on that article.
 * If it's no longer in the feeds, drop the param and stay on the home page.
 */
function openSharedReel() {
    const sharedLink = parseReelParam();
    if (!sharedLink) return;

    const article = state.allArticles.find(a => a.link === sharedLink);

    if (article) {
        reels.open(article);
    } else {
        const url = new URL(window.location.href);
        url.searchParams.delete('reel');
        history.replaceState(null, '', url);
    }
}

// Start

document.addEventListener('DOMContentLoaded', initApp);

/**
 * Search links (?q=<query>) start with the search applied; the input keeps it in sync after that.
 */
function applySearch(query) {
    state.searchQuery = query;
    ui.DOM.clearSearchBtn.classList.toggle('hidden', query.length === 0);
}

// Re-rendering the grid is heavy, so wait for a pause in typing instead of doing it per key
const SEARCH_DEBOUNCE_MS = 200;
let searchTimer;

ui.DOM.searchInput.addEventListener('input', (e) => {
    applySearch(e.target.value.trim());

    clearTimeout(searchTimer);
    // Render directly without full updateUI to avoid re-rendering filters unnecessarily
    searchTimer = setTimeout(() => ui.renderArticles(), SEARCH_DEBOUNCE_MS);
});

/**
 * Clear Search
 */
ui.DOM.clearSearchBtn.addEventListener('click', () => {
    clearTimeout(searchTimer);
    ui.DOM.searchInput.value = '';
    state.searchQuery = '';
    ui.DOM.clearSearchBtn.classList.add('hidden');
    ui.renderArticles();
});

/**
 * Reels Mode
 */
ui.DOM.reelsBtn.addEventListener('click', () => reels.open());

initBackToTop(document.getElementById('backToTopBtn'));
initColorScheme(document.getElementById('themeBtn'));
