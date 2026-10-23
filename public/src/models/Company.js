export class Company {
    constructor({id, name, logo, color, feeds}) {
        this.id = id;
        this.name = name;
        this.logo = logo;
        this.color = color || null;
        this.feeds = feeds || [];
    }
}
