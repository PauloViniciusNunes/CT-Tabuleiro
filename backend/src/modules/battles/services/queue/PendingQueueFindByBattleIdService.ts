import { BattleStateRepository } from "../../repositories/BattleStateRepository";
import { PendingQueueRepository } from "../../repositories/PendingQueueRepository";

export class PendingQueueFindByBattleIdService {
    constructor(
        private readonly repository = new PendingQueueRepository(),
        private readonly battleStateRepository = new BattleStateRepository(),
    ) { }

    async execute(id: string) {
        
        const battle = await this.battleStateRepository.findById(id)

        if(!battle) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        const queue = await this.repository.findByBattleStateId(id)

        if(!queue) {
            throw new Error("Não foi possível encontrar a fila.")
        }

        return queue

    }

}