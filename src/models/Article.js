export class Article {
    constructor({categories, excerpt, link, pubDate, title, companyId, companyName, timestamp}) {
        this.categories = categories;
        this.excerpt = excerpt;
        this.link = link;
        this.pubDate = pubDate;
        this.title = title;
        this.timestamp = timestamp || 0;
        this.companyId = companyId;
        this.companyName = companyName;
    }

    get isNew() {
        if (!this.timestamp) return false;

        const fortyEighthInMs = 48 * 60 * 60 * 1000;
        const now = new Date().getTime();

        return (now - this.timestamp) < fortyEighthInMs;
    }
}
