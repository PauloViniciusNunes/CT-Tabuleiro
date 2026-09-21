import { BattleStateRepository } from "../../repositories/BattleStateRepository";


import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

export class BattleStateGetService {
    constructor(
        private readonly repository = new BattleStateRepository()
    ) {}

    async execute(id: string)
    {   
        const battle = await this.repository.findById(id)

        if(!battle) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        return battle
    }
}