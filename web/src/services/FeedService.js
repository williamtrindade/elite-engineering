import { Article } from '../models/Article.js';

export class FeedService {
    constructor(provider) {
        this.provider = provider;
    }

    async populateCompanyFeeds(company) {
        await Promise.all(company.feeds.map(async (feed) => {
            try {
                const rawData = await this.provider.fetch(feed.url, { categories: feed.categories, limit: feed.limit });

                feed.title = rawData.feed.title || company.name;
                feed.description = rawData.feed.description || "";
                feed.link = rawData.feed.link || "";
                feed.image = rawData.feed.image || company.logo; // Fallback para o logo da empresa
                feed.author = rawData.feed.author || company.name;

                feed.articles = rawData.items.map(item => new Article({
                    timestamp: new Date(item.pubDate).getTime(),
                    categories: item.categories,
                    excerpt: item.excerpt,
                    link: item.link,
                    pubDate: item.pubDate,
                    title: item.title,
                    companyId: company.id,
                    companyName: company.name,
                }));

            } catch (error) {
                feed.articles = [];
            }
        }));
    }
}