import { Article } from './Article.js';

// How long the page waits for the feeds before showing what it has
const WAIT_MS = 3000;

/**
 * Use case: every article from every company's feeds, newest first.
 * A feed that fails is skipped, so one broken blog doesn't hide the others.
 * A feed slower than waitMs is left out, so one slow blog doesn't hold the page;
 * it keeps loading, so a cached gateway has it on the next visit.
 */
export class LoadArticles {
    /**
     * @param {import('../ports.js').FeedGateway} feedGateway
     * @param {{ waitMs?: number }} [options]  Infinity waits for every feed
     */
    constructor(feedGateway, { waitMs = WAIT_MS } = {}) {
        this.feedGateway = feedGateway;
        this.waitMs = waitMs;
    }

    /**
     * @param {import('./Company.js').Company[]} companies
     * @returns {Promise<Article[]>}
     */
    async execute(companies) {
        const arrived = [];
        const allFeeds = Promise.all(companies.flatMap(company =>
            company.feeds.map(async feed => arrived.push(...await this.loadFeed(company, feed)))
        ));

        // setTimeout treats Infinity as 0, so waiting for every feed skips the timer
        let timer;
        const waitLimit = this.waitMs === Infinity
            ? allFeeds
            : new Promise(resolve => { timer = setTimeout(resolve, this.waitMs); });
        await Promise.race([allFeeds, waitLimit]);
        clearTimeout(timer);

        // Nothing yet: an empty page is worse than a slow one
        if (arrived.length === 0) await allFeeds;

        // A copy, so feeds arriving later don't change what the page shows
        return [...arrived].sort((a, b) => b.timestamp - a.timestamp);
    }

    async loadFeed(company, feed) {
        try {
            const data = await this.feedGateway.fetch(feed.url, { categories: feed.categories, limit: feed.limit });

            return data.items.map(item => new Article({
                timestamp: new Date(item.pubDate).getTime(),
                categories: item.categories,
                excerpt: item.excerpt,
                image: feed.images ? item.image : '',
                link: item.link,
                pubDate: item.pubDate,
                title: item.title,
                companyId: company.id,
                companyName: company.name
            }));
        } catch {
            return [];
        }
    }
}
