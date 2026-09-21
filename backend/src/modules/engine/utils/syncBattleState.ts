import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { Prisma } from "@prisma/client";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { syncUserActorId } from "./syncUserActor";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { PendingGetter } from "../context/PendingGetter";
import { CardRepository } from "@/modules/cards/repositories/CardRepository";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { hydrateTokenInventoryItems } from "@/modules/tokens/utils/hydrateTokenInventoryItems";
import { emitPendingSpecialResponse } from "../special-response/emitSpecialResponse";
import type { MechanicInstance } from "../mechanic/mechanics/MechanicInstance";
import type { VisualOverlay } from "../mechanic/types/visualOverlays";
import { reconcileMechanicVisualOverlays } from "../mechanic/utils/reconcileMechanicVisualOverlays";

export async function syncBattleState(battleId: string) {

    // Criando objetos repositórios
    const battleStateRepository = new BattleStateRepository()
    const tokenInstanceRepository = new TokenTemplateRepository()
    const pendingQueueRepository = new PendingQueueRepository()
    const pendingGetter = new PendingGetter(pendingQueueRepository)
    const cardRepository = new CardRepository()
    const itemRepository = new ItemRepository()

    await syncUserActorId(battleId)
    const battleState = await battleStateRepository.findById(battleId)

    if(!battleState) {
        throw new Error("A batalha não foi encontrada, não será possível mandar sinal de sincronização.")
    }

    const boardTokens = await tokenInstanceRepository.listByMapId(battleState.mapId)

    if(boardTokens) {
        const activeMechanics = Array.isArray(battleState.activeMechanics)
            ? battleState.activeMechanics as unknown as MechanicInstance[]
            : [];
        const reconciledTokens = await Promise.all(boardTokens.map(async (token) => {
            const currentOverlays = Array.isArray(token.visualOverlays)
                ? token.visualOverlays as unknown as VisualOverlay[]
                : [];
            const synchronizedOverlays = reconcileMechanicVisualOverlays(
                currentOverlays,
                activeMechanics,
                activeMechanics,
                token.id,
            );

            if (JSON.stringify(synchronizedOverlays) === JSON.stringify(currentOverlays)) {
                return token;
            }

            return tokenInstanceRepository.update(token.id, {
                visualOverlays: synchronizedOverlays as unknown as Prisma.InputJsonValue,
            });
        }));
        const hydratedTokens = await hydrateTokenInventoryItems(
            reconciledTokens,
            itemRepository,
        )
        hydratedTokens.forEach((t) => {
            runtime.emit(SocketEvent.TOKEN_UPDATED, t)
        })
    }
    
    runtime.emit(SocketEvent.BATTLE_UPDATED, battleState)

    const pendingQueue = await pendingQueueRepository.findByBattleStateId(battleId)
    if (!pendingQueue) return

    const pendingOffensiveCard = await pendingGetter.getPendingOffensiveCard(pendingQueue.id)
    if (pendingOffensiveCard) {
        const card = await cardRepository.findCardById(pendingOffensiveCard.cardId)
        if (card) {
            runtime.emit(SocketEvent.PENDING_OFFENSIVE_CARD, {
                card,
                attackerId: pendingOffensiveCard.attackerId,
            })
            runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, pendingOffensiveCard.rawCardResult)
            runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, pendingOffensiveCard.rawTestResult)
        } else {
            runtime.emit(SocketEvent.PENDING_OFFENSIVE_CARD, null)
            runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, null)
            runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, null)
        }
    } else {
        runtime.emit(SocketEvent.PENDING_OFFENSIVE_CARD, null)
        runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, null)
        runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, null)
    }

    const pendingSpecialResponse = await pendingGetter.getPendingSpecialResponse(pendingQueue.id)
    emitPendingSpecialResponse(battleState.mapId, pendingSpecialResponse)

}
