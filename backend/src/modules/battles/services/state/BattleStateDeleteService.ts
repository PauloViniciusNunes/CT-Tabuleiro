import { BattleStateRepository } from "../../repositories/BattleStateRepository";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

export class BattleStateDeleteService {

    constructor(
        private readonly repository = new BattleStateRepository()
    ) {}

    async execute(id: string)
    {
        const battle = await this.repository.findById(id)

        if(!battle) {
            throw new Error("Batalha não foi encontrada.")
        }

        runtime.emit(
            SocketEvent.BATTLE_ENDED,
            battle
        )

        return this.repository.delete(id)
    }

}