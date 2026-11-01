import { filterArticles } from '../core/filterArticles.js';
import { pickFeatured } from '../core/pickFeatured.js';
import { placeSponsors } from '../core/sponsorSlots.js';

// One sponsor slot after every AD_EVERY articles, in the grid and in Reels (see placeSponsors)
export const AD_EVERY = 8;

// Screen state: what is loaded and what the user picked (filter, search)
export class StateSingleton {
    constructor() {
        if (StateSingleton._instance) {
            return StateSingleton._instance;
        }
        this._companies = [];
        this.sponsors = [];
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
        return filterArticles(this._allArticles, { companyId: this._activeFilter, query: this._searchQuery });
    }

    // Featured section: only on the home view; a filter or search shows just the grid
    get featuredArticles() {
        if (this._activeFilter || this._searchQuery) return [];
        return pickFeatured(this._allArticles);
    }

    // The grid leaves out what the Featured section already shows (Reels still uses filteredArticles)
    get gridArticles() {
        const featured = new Set(this.featuredArticles);
        return this.filteredArticles.filter(a => !featured.has(a));
    }

    // What the grid renders: its articles with the sponsor slots mixed in
    get gridItems() {
        return placeSponsors(this.gridArticles, this.sponsors, { placement: 'grid', every: AD_EVERY });
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