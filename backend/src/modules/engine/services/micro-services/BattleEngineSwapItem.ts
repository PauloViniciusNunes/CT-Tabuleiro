import { Prisma, type TokenInstance } from "@prisma/client";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

import { SwapItemValidator } from "../../validators/SwapItemValidator";
import {
    cardsWithId,
    computeInventoryCardIds,
    EQUIPPED_ITEM_ID_FIELDS,
    EQUIPPED_SLOT_TO_ITEM_ID_FIELD,
    ITEM_SLOT_TO_EQUIPPED_FIELD,
    isEquippableItemSlot,
    resolveCardsById,
    uniqueIds,
    type EquippedItemIdField,
} from "../../utils/inventoryCards";
import { reconcileEquippedItemPassives } from "../../utils/itemPassiveMechanics";
import type { MechanicInstance } from "../../mechanic/mechanics/MechanicInstance";
import type { VisualOverlay } from "../../mechanic/types/visualOverlays";
import { reconcileMechanicVisualOverlays } from "../../mechanic/utils/reconcileMechanicVisualOverlays";
import { BattleEngineService } from "../BattleEngineService";
import { hydrateTokenInventoryItems } from "@/modules/tokens/utils/hydrateTokenInventoryItems";

export class BattleEngineSwapItem extends BattleEngineService {

    async execute(userId: string, data: unknown) {
        const input = SwapItemValidator.parse(data);
        const token = await this.tokenInstanceRepository.findTokenTemplateById(input.tokenId);

        if (!token) {
            throw new Error("Instância de token não encontrada.");
        }

        await this.assertCanManageToken(userId, token.userId, token.mapId);

        if (input.operation === "unequip") {
            return this.unequipItem(token, input.equippedSlot);
        }

        return this.equipItem(token, input.itemId, input.itemIndex);
    }

    private async equipItem(
        token: TokenInstance,
        itemId: string,
        itemIndex: number,
    ) {
        const itemIdAtIndex = token.commonSlotIds[itemIndex];
        if (!itemIdAtIndex || itemIdAtIndex !== itemId) {
            throw new Error("O item não está mais no slot informado da mochila.");
        }

        const item = await this.itemRepository.findItemById(itemId);
        if (!item) {
            throw new Error("Item não encontrado.");
        }

        if (item.isArtifice) {
            throw new Error("Artifícios são consumíveis e não podem ser equipados.");
        }

        if (!isEquippableItemSlot(item.slot)) {
            throw new Error("Este item não pode ser equipado.");
        }
        const targetField: EquippedItemIdField =
            ITEM_SLOT_TO_EQUIPPED_FIELD[item.slot];

        const equippedItemIds = this.getEquippedItemIds(token);
        const replacedItemId = equippedItemIds[targetField];

        equippedItemIds[targetField] = item.id;

        const commonSlotIds = token.commonSlotIds.filter(
            (_, index) => index !== itemIndex,
        );
        if (replacedItemId) {
            commonSlotIds.push(replacedItemId);
        }

        return this.persistInventory(token, equippedItemIds, commonSlotIds);
    }

    private async unequipItem(
        token: TokenInstance,
        equippedSlot: keyof typeof EQUIPPED_SLOT_TO_ITEM_ID_FIELD,
    ) {
        const targetField = EQUIPPED_SLOT_TO_ITEM_ID_FIELD[equippedSlot];
        const equippedItemIds = this.getEquippedItemIds(token);
        const itemId = equippedItemIds[targetField];

        if (!itemId) {
            throw new Error("Não há item equipado nesse slot.");
        }

        const item = await this.itemRepository.findItemById(itemId);
        if (!item) {
            throw new Error("O item equipado não pôde ser encontrado.");
        }

        const capacity =
            token.inventoryDimensionsCols * token.inventoryDimensionsRows;
        if (token.commonSlotIds.length >= capacity) {
            throw new Error("Não há espaço na mochila para remover este item.");
        }

        equippedItemIds[targetField] = "";

        return this.persistInventory(
            token,
            equippedItemIds,
            [...token.commonSlotIds, itemId],
        );
    }

    private getEquippedItemIds(token: {
        primaryHandId: string;
        offHandId: string;
        neckId: string;
        ringId: string;
        armorId: string;
    }): Record<EquippedItemIdField, string> {
        return {
            primaryHandId: token.primaryHandId,
            offHandId: token.offHandId,
            neckId: token.neckId,
            ringId: token.ringId,
            armorId: token.armorId,
        };
    }

    private async persistInventory(
        token: TokenInstance,
        equippedItemIds: Record<EquippedItemIdField, string>,
        commonSlotIds: string[],
    ) {

        const equippedIds = uniqueIds(
            EQUIPPED_ITEM_ID_FIELDS.map((field) => equippedItemIds[field]),
        );
        const equippedItems = await this.itemRepository.findManyByIds(equippedIds);

        if (equippedItems.length !== equippedIds.length) {
            throw new Error("Um item equipado não pôde ser encontrado.");
        }

        const equipmentCardIds = uniqueIds(
            equippedItems.flatMap((equippedItem) => equippedItem.cardsIds),
        );
        const equipmentCards = await this.cardRepository.findManyByIds(equipmentCardIds);

        if (equipmentCards.length !== equipmentCardIds.length) {
            throw new Error("Um card de item equipado não pôde ser encontrado.");
        }

        const cardIds = computeInventoryCardIds(token.tokenCards, equippedItems);
        const cards = resolveCardsById(cardIds, [
            cardsWithId(token.tokenCards),
            equipmentCards,
        ]);

        const updated = await this.tokenInstanceRepository.update(token.id, {
            ...equippedItemIds,
            commonSlotIds,
            cards: JSON.parse(JSON.stringify(cards)) as Prisma.InputJsonValue,
        });

        const battleState = await this.battleStateRepository.findByMapId(token.mapId);
        let synchronizedToken = updated;

        if (battleState?.status === "In Battle") {
            const previousMechanics = Array.isArray(battleState.activeMechanics)
                ? battleState.activeMechanics as unknown as MechanicInstance[]
                : [];
            const updatedBattleState = await this.battleSetter.updateActiveMechanics(
                battleState.id,
                (activeMechanics) => reconcileEquippedItemPassives(
                    activeMechanics,
                    token.id,
                    equippedItems,
                ),
            );
            const activeMechanics = Array.isArray(updatedBattleState.activeMechanics)
                ? updatedBattleState.activeMechanics as unknown as MechanicInstance[]
                : [];
            const currentOverlays = Array.isArray(updated.visualOverlays)
                ? updated.visualOverlays as unknown as VisualOverlay[]
                : [];
            const synchronizedOverlays = reconcileMechanicVisualOverlays(
                currentOverlays,
                previousMechanics,
                activeMechanics,
                token.id,
            );

            if (
                JSON.stringify(synchronizedOverlays) !== JSON.stringify(currentOverlays)
            ) {
                synchronizedToken = await this.tokenInstanceRepository.update(
                    token.id,
                    {
                        visualOverlays:
                            synchronizedOverlays as unknown as Prisma.InputJsonValue,
                    },
                );
            }

            runtime.emit(SocketEvent.BATTLE_UPDATED, updatedBattleState);
        }

        const [hydratedToken] = await hydrateTokenInventoryItems(
            [synchronizedToken],
            this.itemRepository,
        );

        runtime.emit(SocketEvent.TOKEN_UPDATED, hydratedToken);

        return hydratedToken;
    }

    private async assertCanManageToken(
        userId: string,
        tokenOwnerId: string,
        mapId: string,
    ) {
        const map = await this.mapRepository.findMapById(mapId);
        if (!map) {
            throw new Error("Mapa da instância de token não encontrado.");
        }

        const campaign = await this.campaignRepository.findCampaignById(map.campaignId);
        if (!campaign) {
            throw new Error("Campanha da instância de token não encontrada.");
        }

        if (userId !== tokenOwnerId && userId !== campaign.ownerId) {
            throw new Error("Usuário não pode alterar o inventário deste token.");
        }
    }
}
