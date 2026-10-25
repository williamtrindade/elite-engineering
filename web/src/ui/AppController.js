import { state } from './state.js';

// Loads the articles into the screen state, showing loading and error states around it
export class AppController {
    /**
     * @param {import('../core/LoadArticles.js').LoadArticles} loadArticles
     * @param {import('./UI.js').UI} ui
     */
    constructor(loadArticles, ui) {
        this.loadArticles = loadArticles;
        this.ui = ui;
    }

    async fetchAllData() {
        state.isLoading = true;
        state.error = null;
        this.ui.refresh();

        try {
            state.allArticles = await this.loadArticles.execute(state.companies);

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
