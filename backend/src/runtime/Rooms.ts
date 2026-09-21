export class Rooms {

    static campaign(id: string) {
        return `campaign:${id}`;
    }

    static map(id: string) {
        return `map:${id}`;
    }

    static combat(id: string) {
        return `combat:${id}`;
    }

}
