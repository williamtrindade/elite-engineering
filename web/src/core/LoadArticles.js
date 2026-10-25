import { Article } from './Article.js';

/**
 * Use case: every article from every company's feeds, newest first.
 * A feed that fails is skipped, so one broken blog doesn't hide the others.
 */
export class LoadArticles {
    /**
     * @param {import('../ports.js').FeedGateway} feedGateway
     */
    constructor(feedGateway) {
        this.feedGateway = feedGateway;
    }

    /**
     * @param {import('./Company.js').Company[]} companies
     * @returns {Promise<Article[]>}
     */
    async execute(companies) {
        const perFeed = await Promise.all(companies.flatMap(company =>
            company.feeds.map(feed => this.loadFeed(company, feed))
        ));

        return perFeed.flat().sort((a, b) => b.timestamp - a.timestamp);
    }

    async loadFeed(company, feed) {
        try {
            const data = await this.feedGateway.fetch(feed.url, { categories: feed.categories, limit: feed.limit });

            return data.items.map(item => new Article({
                timestamp: new Date(item.pubDate).getTime(),
                categories: item.categories,
                excerpt: item.excerpt,
                image: item.image,
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
