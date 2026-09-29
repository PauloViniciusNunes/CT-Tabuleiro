import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { CardRepository } from "@/modules/cards/repositories/CardRepository";
import { PendingGetter } from "../context/PendingGetter";
import { toPublicPendingSpecialResponse } from "../special-response/types";

/**
 * Builds the single authoritative snapshot used to render combat forms.
 * Keeping this state together prevents clients from combining events from
 * different moments (or different maps) into an impossible UI state.
 */
export async function getBattleFormState(battleId: string) {
    const battleRepository = new BattleStateRepository();
    const pendingQueueRepository = new PendingQueueRepository();
    const pendingGetter = new PendingGetter(pendingQueueRepository);
    const cardRepository = new CardRepository();

    const battle = await battleRepository.findById(battleId);
    if (!battle) {
        throw new Error("A batalha não foi encontrada para sincronizar os formulários.");
    }

    const pendingQueue = await pendingQueueRepository.findByBattleStateId(battleId);
    if (!pendingQueue) {
        return {
            mapId: battle.mapId,
            battleId,
            pendingAttack: null,
            pendingEsquivaRoll: null,
            pendingFreeResponse: null,
            pendingCardResolution: null,
            pendingOffensiveCard: null,
            pendingSpecialResponse: null,
            pendingTransformationResolution: null,
            ambientPivot: null,
        };
    }

    const [
        pendingAttack,
        pendingEsquivaRoll,
        pendingFreeResponse,
        pendingCardResolution,
        offensive,
        special,
        transformation,
    ] = await Promise.all([
        pendingGetter.getPendingAttack(pendingQueue.id),
        pendingGetter.getPendingEsquivaRoll(pendingQueue.id),
        pendingGetter.getPendingFreeResponse(pendingQueue.id),
        pendingGetter.getPendingCardResolution(pendingQueue.id),
        pendingGetter.getPendingOffensiveCard(pendingQueue.id),
        pendingGetter.getPendingSpecialResponse(pendingQueue.id),
        pendingGetter.getPendingTransformationResolution(pendingQueue.id),
    ]);

    const offensiveCard = offensive
        ? await cardRepository.findCardById(offensive.cardId)
        : null;
    const armedCard = battle.armedCard && typeof battle.armedCard === "object" && "id" in battle.armedCard
        ? battle.armedCard
        : null;
    const ambientTokenId = typeof battle.tokenInAmbientPivotSelection === "string"
        ? battle.tokenInAmbientPivotSelection
        : "";
    const selectedPivots = Array.isArray(battle.selectedPivots)
        ? battle.selectedPivots
        : [];

    return {
        mapId: battle.mapId,
        battleId,
        pendingAttack,
        pendingEsquivaRoll,
        pendingFreeResponse,
        pendingCardResolution,
        pendingOffensiveCard: offensive && offensiveCard
            ? {
                requestId: offensive.resolutionId,
                card: offensiveCard,
                attackerId: offensive.attackerId,
                cardScore: offensive.rawCardResult,
                testScore: offensive.rawTestResult,
            }
            : null,
        pendingSpecialResponse: special
            ? toPublicPendingSpecialResponse(special)
            : null,
        pendingTransformationResolution: transformation,
        ambientPivot: armedCard && ambientTokenId
            ? {
                tokenId: ambientTokenId,
                armedCard,
                phase: selectedPivots.length > 0 ? "preview" : "awaiting-pivot",
            }
            : null,
    };
}
