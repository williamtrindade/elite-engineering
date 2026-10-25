// Composition root: the only module that picks implementations and reads config/data.
// Swapping an adapter (e.g. another FeedGateway) is a change here, nowhere else.
import { API_BASE } from '../config.js';
import { companiesList } from '../data/companies.js';
import { LoadArticles } from './core/LoadArticles.js';
import { ApiFeedGateway } from './adapters/ApiFeedGateway.js';
import { CachedFeedGateway } from './adapters/CachedFeedGateway.js';
import { LocalStorageStore } from './adapters/LocalStorageStore.js';
import { state } from './ui/state.js';
import { UI } from './ui/UI.js';
import { AppController } from './ui/AppController.js';
import { ReelsUI } from './ui/ReelsUI.js';
import { parseReelParam } from './ui/ShareLink.js';

const ui = new UI();
const reels = new ReelsUI();

// Initialize Application
async function initApp() {
    state.companies = companiesList;

    const feedGateway = new CachedFeedGateway(new ApiFeedGateway(API_BASE), new LocalStorageStore());
    const appController = new AppController(new LoadArticles(feedGateway), ui);

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

ui.DOM.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();

    if(state.searchQuery.length > 0) {
        ui.DOM.clearSearchBtn.classList.remove('hidden');
    } else {
        ui.DOM.clearSearchBtn.classList.add('hidden');
    }

    // Render directly without full updateUI to avoid re-rendering filters unnecessarily
    ui.renderArticles();
});

/**
 * Clear Search
 */
ui.DOM.clearSearchBtn.addEventListener('click', () => {
    ui.DOM.searchInput.value = '';
    state.searchQuery = '';
    ui.DOM.clearSearchBtn.classList.add('hidden');
    ui.renderArticles();
});

/**
 * Reels Mode
 */
ui.DOM.reelsBtn.addEventListener('click', () => reels.open());
