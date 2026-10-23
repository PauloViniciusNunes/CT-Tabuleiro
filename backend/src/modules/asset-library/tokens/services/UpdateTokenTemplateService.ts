// UpdateTokenTemplateService.ts

import { TokenTemplateRepository } from "../repositories/TokenTemplateRepository";
import { UpdateTokenTemplateValidator } from "../validators/UpdateTokenTemplateValidator";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { syncBattleState } from "@/modules/engine/utils/syncBattleState";

// FinderOwnerId
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { hydrateTokenInventoryItems } from "@/modules/tokens/utils/hydrateTokenInventoryItems";
import { MapObjectMovementRepository } from "@/modules/map-objects/repositories/MapObjectMovementRepository";
import { emitMapObjectsUpdated } from "@/modules/map-objects/utils/emitMapObjectsUpdated";

export class UpdateTokenTemplateService {

    constructor(
        private readonly repository = new TokenTemplateRepository(),
        private readonly mapRepository = new MapRepository(),
        private readonly campaignRepository = new CampaignRepository(),
        private readonly itemRepository = new ItemRepository(),
        private readonly movementRepository = new MapObjectMovementRepository(),
    ) {}

    async execute(
        userId: string,
        id: string,
        data: unknown,
    ) {

        const input =
            UpdateTokenTemplateValidator.parse(data);

        const tokenTemplate =
            await this.repository.findTokenTemplateById(id);

        if (!tokenTemplate) {
            throw new Error("Template não encontrado.");
        }

        const map = await this.mapRepository.findMapById(tokenTemplate.mapId)

        if(!map)
            throw new Error("Token Template criado sem mapId?")

        const campaign = await this.campaignRepository.findCampaignById(map.campaignId)

        if(!campaign)
            throw new Error("Não foi possível encontrar campanha...")

        const ownerId = campaign.ownerId

        console.log("[USER ID]: ", userId)
        console.log("[TEMPLATE OWNER]: ", tokenTemplate.userId)

        if (tokenTemplate.userId !== userId && userId !== ownerId) {
            throw new Error("Usuário não é o dono do template.");
        }

        const battle = await new BattleStateRepository().findByMapId(tokenTemplate.mapId);
        const changesPosition =
            tokenTemplate.col !== input.col || tokenTemplate.row !== input.row;
        if (battle?.status === "In Battle" && changesPosition) {
            throw new Error(
                "Movimentos durante uma batalha devem usar a engine de movimento.",
            );
        }

        const { col, row, ...nonPositionUpdates } = input;
        const movement = changesPosition
            ? await this.movementRepository.moveOutsideBattle(
                id,
                { col, row },
                nonPositionUpdates,
            )
            : null;
        const updated = movement?.token ?? await this.repository.update(
            id,
            nonPositionUpdates,
        );
        const [hydratedToken] = await hydrateTokenInventoryItems(
            [updated],
            this.itemRepository,
        );

        console.log("[QUAL é esse objeto target?]: ", updated.cards)
        if (movement?.consumedMapObjectId) {
            await emitMapObjectsUpdated([movement.sourceMapId]);
        }
        if (battle?.status === "In Battle") {
            await syncBattleState(battle.id);
        } else if (
            movement &&
            movement.sourceMapId !== movement.destinationMapId
        ) {
            runtime.emit(SocketEvent.TOKEN_DELETED, {
                ...tokenTemplate,
                mapId: movement.sourceMapId,
            });
            runtime.emit(SocketEvent.TOKEN_CREATED, hydratedToken);
        } else {
            runtime.emit(SocketEvent.TOKEN_UPDATED, hydratedToken);
        }


        return {
            ...hydratedToken,
            movement: movement
                ? {
                    sourceMapId: movement.sourceMapId,
                    destinationMapId: movement.destinationMapId,
                    position: movement.position,
                    collectedItemId: movement.collectedItemId,
                    consumedMapObjectId: movement.consumedMapObjectId,
                    usedDoorId: movement.usedDoorId,
                }
                : null,
        }

    }

}
