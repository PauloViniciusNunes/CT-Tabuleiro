import { BattleStateRepository } from "../../repositories/BattleStateRepository";
import { PendingQueueRepository } from "../../repositories/PendingQueueRepository";
import { PendingQueueValidator } from "../../validators/PendingQueueValidator";

export class PendingQueueCreateService {
    constructor(
        private readonly repository = new PendingQueueRepository(),
        private readonly battleStateRepository = new BattleStateRepository(),
    ) { }

    async execute(data: unknown) {
        const input = PendingQueueValidator.parse(data)


        const pendingQueue = await this.repository.create(input)

        if (!pendingQueue) {
            throw new Error("Não foi possível criar a fila.")
        }


        return pendingQueue

    }
}