import { state } from '../state/StateSingleton.js';

export class AppController {
    constructor(feedService, ui) {
        this.feedService = feedService;
        this.ui = ui;
    }

    // controllers/AppController.js

    async fetchAllData() {
        state.isLoading = true;
        state.error = null;
        this.ui.refresh();

        try {
            const companiesList = state.companies;

            await Promise.all(
                companiesList.map(company => this.feedService.populateCompanyFeeds(company))
            );

            // A uniq structure with all articles
            const combinedArticles = companiesList.flatMap(company =>
                company.feeds.flatMap(feed => feed.articles || [])
            );

            combinedArticles.sort((a, b) => b.timestamp - a.timestamp);

            state.allArticles = combinedArticles;

            if (state.allArticles.length === 0) {
                state.error = "We cannot extract data.";
            }

        } catch (error) {
            state.error = "A error occur when we connect with the feeds API.";
            console.error(error);
        } finally {
            state.isLoading = false;
            this.ui.refresh();
        }
    }
}