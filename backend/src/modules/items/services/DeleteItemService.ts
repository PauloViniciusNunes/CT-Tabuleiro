import { ItemRepository } from "../repositories/ItemRepository";

export class DeleteItemService {

    constructor(
        private readonly repository = new ItemRepository(),
    ) {}

    async execute(
        userId: string,
        id: string,
    ) {

        const item =
            await this.repository.findItemById(id);

        if (!item) {
            throw new Error("Item não encontrado.");
        }

        if (item.userId !== userId) {
            throw new Error("Usuário não é o dono do item.");
        }

        await this.repository.delete(id);

    }

}