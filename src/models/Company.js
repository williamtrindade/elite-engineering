export class Company {
    constructor({id, name, logo, feeds}) {
        this.id = id;
        this.name = name;
        this.logo = logo;
        this.feeds = feeds || [];
    }
}