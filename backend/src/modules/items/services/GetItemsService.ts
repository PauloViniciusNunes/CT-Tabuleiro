import { ItemRepository } from "../repositories/ItemRepository";

export class GetItemsService {

    constructor(
        private readonly repository = new ItemRepository(),
    ) {}

    async execute(userId: string) {
        return this.repository.findManyByUser(userId);
    }

}