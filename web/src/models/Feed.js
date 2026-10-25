export class Feed {
    constructor({author, description, image, link, title, url, articles, categories, limit}) {
        this.author = author;
        this.description = description;
        this.image = image;
        this.link = link;
        this.title = title;
        this.url = url;
        // Optional: keep only these categories / at most this many items (for mixed feeds)
        this.categories = categories;
        this.limit = limit;
        this.articles = articles || [];
    }
}