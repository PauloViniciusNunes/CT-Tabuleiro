import { BattleStateRepository } from "../../repositories/BattleStateRepository";
import { BattleStateValidator } from "../../validators/BattleStateCreateValidator";

import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";

import { PendingQueueCreateService } from "../queue/PendingQueueCreateService";
import { PendingQueueRepository } from "../../repositories/PendingQueueRepository";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

export class BattleStateCreateService {

    constructor(
        private readonly repository = new BattleStateRepository(),
        private readonly tokenInstanceRepository = new TokenTemplateRepository(),
        private readonly mapRepository = new MapRepository(),
        private readonly queueService = new PendingQueueCreateService(),
        private readonly pendingQueueRepository = new PendingQueueRepository(),
    ) {}

    async execute(mapId: string, data: unknown) {
        const input = BattleStateValidator.parse(data);

        const map = await this.mapRepository.findMapById(mapId);

        if (!map) {
            throw new Error("Mapa inexistente. Não foi possível instanciar uma batalha.");
        }

        const existingBattle = await this.repository.findByMapId(mapId);
        if (existingBattle) {
            throw new Error("Já existe uma batalha neste mapa.");
        }

        const tokens = await this.tokenInstanceRepository.listByMapId(mapId);
        const teams = new Set(tokens.map((t) => t.team));

        if (teams.size < 2) {
            throw new Error("Não existem times suficientes para instanciar uma batalha.");
        }

        const queue = await this.queueService.execute({});
        input.pendingQueueId = queue.id

        const battle = await this.repository.create({
            ...input,
            pendingQueue: {
                connect: {
                    id: queue.id
                },
            },
        }).catch(async (error) => {
            await this.pendingQueueRepository.delete(queue.id);
            throw error;
        });

        runtime.emit(
            SocketEvent.BATTLE_STARTED,
            battle,
        );

        return battle;
    }
}
