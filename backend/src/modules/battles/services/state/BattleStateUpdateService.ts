import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { BattleStateRepository } from "../../repositories/BattleStateRepository";
import { BattleStateValidator } from "../../validators/BattleStateCreateValidator";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

export class BattleStateUpdateService {
    constructor(
        private readonly repository = new BattleStateRepository(),
        private readonly mapRepository = new MapRepository
    ) {}

    async execute(id: string, data: unknown) 
    {
        const input = BattleStateValidator.parse(data)

        const battle = await this.repository.findById(id)

        if(!battle) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        const map = await this.mapRepository.findMapById(battle.mapId)

        if(!map) {
            throw new Error("Mapa não pode ser encontrado.")
        }

        return this.repository.update(id, input)

    }
}