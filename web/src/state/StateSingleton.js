export class StateSingleton {
    constructor() {
        if (StateSingleton._instance) {
            return StateSingleton._instance;
        }
        this._companies = [];
        this._allArticles = [];
        this._activeFilter = null;
        this._searchQuery = '';
        this._isLoading = true;
        this._error = null;

        StateSingleton._instance = this;
    }

    get companies() {
        return this._companies;
    }

    set companies(value) {
        this._companies = value;
    }

    get allArticles() {
        return this._allArticles;
    }

    set allArticles(value) {
        this._allArticles = value;
    }

    // Articles after applying the active company filter and search query
    get filteredArticles() {
        let articles = this._allArticles;

        if (this._activeFilter) {
            articles = articles.filter(a => a.companyId === this._activeFilter);
        }

        if (this._searchQuery) {
            const query = this._searchQuery.toLowerCase();
            articles = articles.filter(a =>
                a.title.toLowerCase().includes(query) ||
                (a.excerpt || '').toLowerCase().includes(query)
            );
        }

        return articles;
    }

    get activeFilter() {
        return this._activeFilter;
    }

    set activeFilter(value) {
        this._activeFilter = value;
    }

    get searchQuery() {
        return this._searchQuery;
    }

    set searchQuery(value) {
        this._searchQuery = value;
    }

    get isLoading() {
        return this._isLoading;
    }

    set isLoading(value) {
        this._isLoading = value;
    }

    get error() {
        return this._error;
    }

    set error(value) {
        this._error = value;
    }

    get instance() {
        return this._instance;
    }

    set instance(value) {
        this._instance = value;
    }
}

export const state = new StateSingleton();