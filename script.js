import { state } from './src/state/StateSingleton.js';
import { companiesList } from './data/companies.js';
import { UI } from './src/UI/UI.js';
import { AppController } from './src/controllers/AppController.js';
import { Rss2JsonProvider } from './src/services/Rss2JsonProvider.js';
import {FeedService} from './src/services/FeedService.js';

// Initialize Application
async function initApp() {
    const ui = new UI();

    state.companies = companiesList;

    const feedProvider = new Rss2JsonProvider();
    const feedService = new FeedService(feedProvider);
    const appController = new AppController(
        feedService,
        ui
    );

    ui.renderFilters();
    await appController.fetchAllData();
}

// Start

document.addEventListener('DOMContentLoaded', initApp);

const ui = new UI();

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