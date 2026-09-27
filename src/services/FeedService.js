import { Article } from '../models/Article.js';

export class FeedService {
    constructor(provider) {
        this.provider = provider;
    }

    async populateCompanyFeeds(company) {
        await Promise.all(company.feeds.map(async (feed) => {
            try {
                const rawData = await this.provider.fetch(feed.url);

                feed.title = rawData.feed.title || company.name;
                feed.description = rawData.feed.description || "";
                feed.link = rawData.feed.link || "";
                feed.image = rawData.feed.image || company.logo; // Fallback para o logo da empresa
                feed.author = rawData.feed.author || company.name;

                feed.articles = rawData.items.map(item => new Article({
                    timestamp: new Date(item.pubDate).getTime(),
                    author: item.author,
                    categories: item.categories,
                    content: item.content,
                    description: item.description,
                    enclosure: item.enclosure,
                    guid: item.guid,
                    link: item.link,
                    pubDate: item.pubDate,
                    thumbnail: item.thumbnail,
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