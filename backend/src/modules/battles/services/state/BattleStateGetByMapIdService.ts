import { BattleStateRepository } from "../../repositories/BattleStateRepository";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

export class BattleStateGetByMapIdService {
    constructor(
        private readonly repository = new BattleStateRepository()
    ) {}

    async execute(mapId: string) {
        const battle = await this.repository.findByMapId(mapId)

        if(!battle) {
            throw new Error("Não foi possível encontrar a batalha nesse mapa, ou não há combate ativo.")
        }

        return battle
    }
}