export class Feed {
    constructor({author, description, image, link, title, url, articles}) {
        this.author = author;
        this.description = description;
        this.image = image;
        this.link = link;
        this.title = title;
        this.url = url;
        this.articles = articles || [];
    }
}