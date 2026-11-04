export class Company {
    constructor({id, name, logo, color, feeds, whiteLogo = false}) {
        this.id = id;
        this.name = name;
        this.logo = logo;
        this.color = color || null;
        this.feeds = feeds || [];
        // White logos are inverted on the light theme (.logo-white in style.css)
        this.whiteLogo = whiteLogo;
    }
}
