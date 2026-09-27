export class Article {
    constructor({author, categories, content, description, enclosure, guid, link, pubDate, thumbnail, title, companyId, companyName, timestamp}) {
        this.author = author;
        this.categories = categories;
        this.content = content;
        this.description = description;
        this.enclosure = enclosure;
        this.guid = guid;
        this.link = link;
        this.pubDate = pubDate;
        this.thumbnail = thumbnail;
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