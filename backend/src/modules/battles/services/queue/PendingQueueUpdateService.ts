import { BattleStateRepository } from "../../repositories/BattleStateRepository";
import { PendingQueueRepository } from "../../repositories/PendingQueueRepository";
import { PendingQueueValidator } from "../../validators/PendingQueueValidator";

export class PendingQueueUpdateService {
    constructor(
        private readonly repository = new PendingQueueRepository(),
    ) { }

    async execute(data: unknown, id: string) {
        const input = PendingQueueValidator.parse(data)

        const queue = await this.repository.update(id, input)

        return queue

    }

}