import type { TokenInstance } from "@prisma/client";

import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { CardRepository } from "@/modules/cards/repositories/CardRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { TokenRepository } from "@/modules/tokens/repositories/TokenRepository";
import { BattleSetter } from "../context/BattleSetter";
import { PendingGetter } from "../context/PendingGetter";
import { PendingSetter } from "../context/PendingSetter";
import { BattleEngineCancelCardSelectionService } from "../services/BattleEngineCancelCardSelectionService";
import { BattleEngineCancelReaction } from "../services/BattleEngineCancelReaction";
import { BattleEngineCardResolution } from "../services/BattleEngineCardResolution";
import { BattleEngineDefenseResolutionService } from "../services/BattleEngineDefenseResolutionService";
import { BattleEngineExecuteActionService } from "../services/BattleEngineExecuteActionService";
import { BattleEngineMoveTokenService } from "../services/BattleEngineMoveTokenService";
import { BattleEngineOffensiveCardResponse } from "../services/BattleEngineOffensiveCardResponse";
import { BattleEnginePrevAction } from "../services/BattleEnginePrevAction";
import { BattleEngineReactionService } from "../services/BattleEngineReactionService";
import { BattleEngineResponseService } from "../services/BattleEngineResponseService";
import { BattleEngineTransformService } from "../services/BattleEngineTransformService";
import { BattleEngineConfirmPivot } from "../services/micro-services/BattleEngineConfirmPivot";
import { BattleEngineNextTurnService } from "../services/micro-services/BattleEngineNextTurnService";
import { BattleEnginePivotSelection } from "../services/micro-services/BattleEnginePivotSelection";
import { SpecialResponseResolutionService } from "../special-response/SpecialResponseResolutionService";
import { listTransformationOptions } from "../transformation/options";
import { parseTransformationStates } from "../transformation/types";
import { cardsWithId } from "../utils/inventoryCards";
import {
    formatPrevisionAttackKey,
    isInAttackRange,
} from "../utils/calculations";
import { syncBattleState } from "../utils/syncBattleState";
import { decideAiTurnAction } from "./decision/AiActionDecision";
import {
    decideAiCard,
    listAiCardDecisions,
} from "./decision/AiCardDecision";
import { decideAiMovement } from "./decision/AiMovementDecision";
import { decideAiSpecialResponseValues } from "./decision/AiSpecialResponseDecision";
import {
    chance,
    randomChoice,
    randomInteger,
    type RandomSource,
} from "./utils/random";

function isAiToken(token: TokenInstance | null | undefined): token is TokenInstance {
    return token?.type === "ia";
}

function isAlive(token: TokenInstance): boolean {
    return token.currentLife > 0;
}

function numberRecord(value: unknown): Record<string, number> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, number] =>
            typeof entry[1] === "number" && Number.isFinite(entry[1]),
        ),
    );
}

function booleanRecord(value: unknown): Record<string, boolean> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, boolean] =>
            typeof entry[1] === "boolean",
        ),
    );
}

function stringArrayRecord(value: unknown): Record<string, string[]> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([key, candidate]) => [
        key,
        Array.isArray(candidate)
            ? candidate.filter((item): item is string => typeof item === "string")
            : [],
    ]));
}

function currentTurnTokenId(battle: {
    readonly currentTurnIndex: number;
    readonly turnOrder: unknown;
}): string | null {
    if (!Array.isArray(battle.turnOrder)) return null;
    const current = battle.turnOrder[battle.currentTurnIndex];
    if (!current || typeof current !== "object" || !("tokenId" in current)) return null;
    return typeof current.tokenId === "string" ? current.tokenId : null;
}

const REACTION_OPTIONS: Readonly<Record<string, readonly string[]>> = {
    forca: ["destreza", "consistencia"],
    destreza: ["destreza"],
    inteligencia: ["inteligencia"],
    sabedoria: ["sabedoria"],
};

/** Executes one autonomous decision against the same service boundaries used by players. */
export class BattleAiService {
    private readonly battleRepository = new BattleStateRepository();
    private readonly tokenRepository = new TokenTemplateRepository();
    private readonly tokenDefinitionRepository = new TokenRepository();
    private readonly cardRepository = new CardRepository();
    private readonly mapRepository = new MapRepository();
    private readonly pendingQueueRepository = new PendingQueueRepository();
    private readonly battleSetter = new BattleSetter();
    private readonly pendingGetter = new PendingGetter();
    private readonly pendingSetter = new PendingSetter();

    private readonly actionService = new BattleEngineExecuteActionService();
    private readonly nextTurnService = new BattleEngineNextTurnService();
    private readonly movementService = new BattleEngineMoveTokenService();
    private readonly reactionService = new BattleEngineReactionService();
    private readonly cancelReactionService = new BattleEngineCancelReaction();
    private readonly defenseService = new BattleEngineDefenseResolutionService();
    private readonly responseService = new BattleEngineResponseService();
    private readonly cardService = new BattleEngineCardResolution();
    private readonly cancelCardService = new BattleEngineCancelCardSelectionService();
    private readonly offensiveCardService = new BattleEngineOffensiveCardResponse();
    private readonly previousActionService = new BattleEnginePrevAction();
    private readonly transformationService = new BattleEngineTransformService();
    private readonly pivotService = new BattleEnginePivotSelection();
    private readonly confirmPivotService = new BattleEngineConfirmPivot();
    private readonly specialResponseService = new SpecialResponseResolutionService();

    constructor(private readonly random: RandomSource = Math.random) {}

    async executeOne(battleId: string): Promise<boolean> {
        const battle = await this.battleRepository.findById(battleId);
        if (!battle || battle.status !== "In Battle") return false;

        const [boardTokens, pendingQueue] = await Promise.all([
            this.tokenRepository.listByMapId(battle.mapId),
            this.pendingQueueRepository.findById(battle.pendingQueueId),
        ]);
        if (!pendingQueue) return false;
        const tokenById = new Map(boardTokens.map((token) => [token.id, token]));

        const [
            pendingSpecialResponse,
            pendingTransformation,
            pendingCard,
            pendingOffensiveCard,
            pendingFreeResponse,
            pendingAttack,
            pendingEsquivaRoll,
        ] = await Promise.all([
            this.pendingGetter.getPendingSpecialResponse(pendingQueue.id),
            this.pendingGetter.getPendingTransformationResolution(pendingQueue.id),
            this.pendingGetter.getPendingCardResolution(pendingQueue.id),
            this.pendingGetter.getPendingOffensiveCard(pendingQueue.id),
            this.pendingGetter.getPendingFreeResponse(pendingQueue.id),
            this.pendingGetter.getPendingAttack(pendingQueue.id),
            this.pendingGetter.getPendingEsquivaRoll(pendingQueue.id),
        ]);

        if (pendingSpecialResponse) {
            const responder = tokenById.get(pendingSpecialResponse.responderTokenId);
            if (!isAiToken(responder)) return false;
            await this.resolveSpecialResponse(pendingSpecialResponse, responder);
            return true;
        }

        if (pendingTransformation) {
            const token = tokenById.get(pendingTransformation.tokenId);
            if (!isAiToken(token)) return false;
            const available = pendingTransformation.options.filter(
                (option) => option.remainingRecharge <= 0,
            );
            const selected = randomChoice(available, this.random);
            await this.transformationService.execute(token.userId, {
                battleId,
                requestId: pendingTransformation.requestId,
                action: isAlive(token) && selected && chance(0.8, this.random)
                    ? "submit"
                    : "cancel",
                templateId: selected?.templateId,
            });
            return true;
        }

        if (pendingCard) {
            const tokenId = typeof pendingCard.id === "string" ? pendingCard.id : "";
            const token = tokenById.get(tokenId);
            if (!isAiToken(token)) return false;
            if (!isAlive(token)) {
                await this.cancelCardService.execute(token.userId, battle.id);
                return true;
            }
            await this.resolveCardSelection(battle, token, boardTokens);
            return true;
        }

        const ambientTokenId = typeof battle.tokenInAmbientPivotSelection === "string"
            ? battle.tokenInAmbientPivotSelection
            : "";
        if (ambientTokenId) {
            const token = tokenById.get(ambientTokenId);
            if (!isAiToken(token)) return false;
            if (!isAlive(token)) {
                await this.clearAmbientState(battle.id);
                return true;
            }
            await this.resolveAmbientPivots(battle, token, boardTokens);
            return true;
        }

        if (pendingOffensiveCard) {
            const queuedDefenders = Array.isArray(battle.tokensInOffensiveCard)
                ? battle.tokensInOffensiveCard as Array<{ id?: unknown }>
                : [];
            const defenderId = queuedDefenders[0]?.id;
            const defender = typeof defenderId === "string"
                ? tokenById.get(defenderId)
                : null;
            if (!isAiToken(defender)) return false;
            await this.resolveOffensiveCard(battle, pendingOffensiveCard.attackerId, defender);
            return true;
        }

        if (pendingFreeResponse) {
            const responder = tokenById.get(pendingFreeResponse.responderId);
            const target = tokenById.get(pendingFreeResponse.paralyzedId);
            if (!isAiToken(responder)) return false;
            if (!target || !isAlive(responder) || !isInAttackRange(responder, target, "fisico")) {
                await this.pendingSetter.cleanPendingFreeResponse(pendingQueue.id);
                await syncBattleState(battleId);
                return true;
            }
            await this.responseService.execute(battleId, {
                type: "Ataque Físico",
                actionType: "ataque_fisico",
                attribute: "forca",
                attackerId: responder.id,
                targetId: target.id,
                usedActions: 1,
                usedMana: 0,
                usedCertaintyDie: false,
                item: null,
                selectedMechanic: "neutro",
            });
            return true;
        }

        if (pendingAttack) {
            const responsibleToken = pendingEsquivaRoll
                ? tokenById.get(pendingAttack.attackerId)
                : tokenById.get(pendingAttack.targetId);
            if (!isAiToken(responsibleToken)) return false;
            if (pendingEsquivaRoll) {
                if (!isAlive(responsibleToken)) {
                    await this.pendingSetter.cleanPendingAttack(pendingQueue.id);
                    await this.pendingSetter.cleanPendingEsquivaRoll(pendingQueue.id);
                    await syncBattleState(battle.id);
                } else {
                    await this.resolveDefenseDefinition(battle, responsibleToken);
                }
            } else {
                await this.resolveReaction(battle, pendingAttack, responsibleToken);
            }
            return true;
        }

        const currentTokenId = currentTurnTokenId(battle);
        const token = currentTokenId ? tokenById.get(currentTokenId) : null;
        if (!isAiToken(token)) return false;
        await this.resolveTurn(battle, token, boardTokens);
        return true;
    }

    async recover(battleId: string, error: unknown): Promise<void> {
        console.error("[BATTLE AI] Falha em decisão autônoma; aplicando fallback.", error);
        const battle = await this.battleRepository.findById(battleId);
        if (!battle || battle.status !== "In Battle") return;
        const queue = await this.pendingQueueRepository.findById(battle.pendingQueueId);
        if (!queue) return;
        const tokens = await this.tokenRepository.listByMapId(battle.mapId);
        const tokenById = new Map(tokens.map((token) => [token.id, token]));

        const special = await this.pendingGetter.getPendingSpecialResponse(queue.id);
        if (special && isAiToken(tokenById.get(special.responderTokenId))) {
            try {
                await this.specialResponseService.execute(special.responderUserId, {
                    battleId,
                    requestId: special.requestId,
                    action: "cancel",
                    values: {},
                });
            } catch {
                await this.pendingSetter.cleanPendingSpecialResponse(queue.id);
                await syncBattleState(battleId);
            }
            return;
        }

        const transformation = await this.pendingGetter.getPendingTransformationResolution(queue.id);
        const transformingToken = transformation
            ? tokenById.get(transformation.tokenId)
            : null;
        if (transformation && isAiToken(transformingToken)) {
            await this.pendingSetter.cleanPendingTransformationResolution(queue.id);
            await syncBattleState(battleId);
            return;
        }

        const card = await this.pendingGetter.getPendingCardResolution(queue.id);
        const cardToken = card && typeof card.id === "string" ? tokenById.get(card.id) : null;
        if (card && isAiToken(cardToken)) {
            await this.pendingSetter.cleanPendingCardResolution(queue.id);
            await syncBattleState(battleId);
            return;
        }

        const ambientTokenId = typeof battle.tokenInAmbientPivotSelection === "string"
            ? battle.tokenInAmbientPivotSelection
            : "";
        if (ambientTokenId && isAiToken(tokenById.get(ambientTokenId))) {
            await this.clearAmbientState(battle.id);
            return;
        }

        const offensive = await this.pendingGetter.getPendingOffensiveCard(queue.id);
        const offensiveQueue = Array.isArray(battle.tokensInOffensiveCard)
            ? battle.tokensInOffensiveCard as Array<{ id?: unknown }>
            : [];
        const offensiveDefenderId = offensiveQueue[0]?.id;
        if (
            offensive &&
            typeof offensiveDefenderId === "string" &&
            isAiToken(tokenById.get(offensiveDefenderId))
        ) {
            await this.skipOffensiveDefender(battle.id, queue.id, offensiveDefenderId);
            return;
        }

        const free = await this.pendingGetter.getPendingFreeResponse(queue.id);
        if (free && isAiToken(tokenById.get(free.responderId))) {
            await this.pendingSetter.cleanPendingFreeResponse(queue.id);
            await syncBattleState(battleId);
            return;
        }

        const attack = await this.pendingGetter.getPendingAttack(queue.id);
        const esquiva = await this.pendingGetter.getPendingEsquivaRoll(queue.id);
        const attackResponsible = attack
            ? tokenById.get(esquiva ? attack.attackerId : attack.targetId)
            : null;
        if (attack && isAiToken(attackResponsible)) {
            await this.cancelReactionService.execute(battleId);
            return;
        }

        const currentId = currentTurnTokenId(battle);
        if (isAiToken(currentId ? tokenById.get(currentId) : null)) {
            await this.nextTurnService.execute(battleId);
        }
    }

    private async resolveSpecialResponse(
        pending: NonNullable<Awaited<ReturnType<PendingGetter["getPendingSpecialResponse"]>>>,
        responder: TokenInstance,
    ): Promise<void> {
        if (!isAlive(responder)) {
            await this.specialResponseService.execute(responder.userId, {
                battleId: pending.battleId,
                requestId: pending.requestId,
                action: "cancel",
                values: {},
            });
            return;
        }
        try {
            await this.specialResponseService.execute(responder.userId, {
                battleId: pending.battleId,
                requestId: pending.requestId,
                action: "submit",
                values: decideAiSpecialResponseValues(pending, this.random),
            });
        } catch (submitError) {
            console.warn("[BATTLE AI] Resposta especial automática inválida; cancelando.", submitError);
            await this.specialResponseService.execute(responder.userId, {
                battleId: pending.battleId,
                requestId: pending.requestId,
                action: "cancel",
                values: {},
            });
        }
    }

    private async resolveCardSelection(
        battle: Awaited<ReturnType<BattleStateRepository["findById"]>> & {},
        token: TokenInstance,
        boardTokens: readonly TokenInstance[],
    ): Promise<void> {
        const cards = await this.cardRepository.findManyByIds(
            cardsWithId(token.cards).map((card) => card.id),
        );
        const cardsOnRecharge = stringArrayRecord(battle.cardsNotRechargeds)[token.id] ?? [];
        const decision = decideAiCard({
            token,
            boardTokens,
            cards,
            availableActions: numberRecord(battle.accumulatedActions)[token.id] ?? 0,
            cardsOnRecharge,
        }, this.random);
        if (!decision) {
            await this.cancelCardService.execute(token.userId, battle.id);
            return;
        }
        await this.cardService.execute(battle.id, {
            battleId: battle.id,
            currentId: token.id,
            card: { id: decision.card.id },
            target: decision.target,
            isArtifice: false,
        });
    }

    private async resolveAmbientPivots(
        battle: NonNullable<Awaited<ReturnType<BattleStateRepository["findById"]>>>,
        token: TokenInstance,
        boardTokens: readonly TokenInstance[],
    ): Promise<void> {
        const card = battle.armedCard;
        if (!card || typeof card !== "object" || Array.isArray(card)) {
            await this.battleSetter.clearTokenInAmbientPivotSelection(battle.id);
            await syncBattleState(battle.id);
            return;
        }
        const target = "target" in card && card.target && typeof card.target === "object"
            ? card.target as Record<string, unknown>
            : null;
        const settings = target?.pivotSettings && typeof target.pivotSettings === "object"
            ? target.pivotSettings as Record<string, unknown>
            : null;
        const pivotType = settings?.pivotType;
        const boardMap = await this.mapRepository.findMapById(battle.mapId);
        if (!boardMap || typeof pivotType !== "string") {
            await this.battleSetter.clearTokenInAmbientPivotSelection(battle.id);
            await syncBattleState(battle.id);
            return;
        }
        if (pivotType !== "Trigger-Fix") {
            const count = Math.min(10, Math.max(1, battle.remainingPivots));
            const letters = Array.from(
                { length: boardMap.cols },
                (_, index) => String.fromCharCode(65 + index),
            );
            const gridCells = Array.from({ length: boardMap.rows }, (_, row) =>
                Array.from({ length: boardMap.cols }, (_, col) => ({
                    row: row + 1,
                    col: col + 1,
                })),
            ).flat();

            for (let index = 0; index < count; index += 1) {
                if (pivotType === "Token-Fix") {
                    const candidates = boardTokens.filter((candidate) =>
                        candidate.id !== token.id && candidate.currentLife > 0,
                    );
                    const selected = randomChoice(
                        candidates.filter((candidate) => candidate.team !== token.team),
                        this.random,
                    ) ?? randomChoice(candidates, this.random);
                    if (!selected) break;
                    await this.pivotService.execute(battle.id, {
                        payload: {
                            type: "token",
                            token: {
                                ...selected,
                                position: { col: selected.col, row: selected.row },
                            },
                        },
                        letters,
                        letter: letters[Math.max(0, selected.col - 1)],
                        number: selected.row,
                        gridCells,
                    });
                } else {
                    const col = randomInteger(1, boardMap.cols, this.random);
                    const row = randomInteger(1, boardMap.rows, this.random);
                    await this.pivotService.execute(battle.id, {
                        payload: { type: "cell", position: { col, row } },
                        letters,
                        letter: letters[col - 1],
                        number: row,
                        gridCells,
                    });
                }
            }
        }
        await this.confirmPivotService.execute(battle.id, { battleId: battle.id });
    }

    private async resolveOffensiveCard(
        battle: NonNullable<Awaited<ReturnType<BattleStateRepository["findById"]>>>,
        attackerId: string,
        defender: TokenInstance,
    ): Promise<void> {
        const queue = await this.pendingQueueRepository.findByBattleStateId(battle.id);
        const availableActions = numberRecord(battle.accumulatedActions)[defender.id] ?? 0;
        if (!queue) return;
        if (!isAlive(defender) || availableActions < 1) {
            await this.skipOffensiveDefender(battle.id, queue.id, defender.id);
            return;
        }
        const attributes = [
            "forca",
            "destreza",
            "consistencia",
            "inteligencia",
            "sabedoria",
            "carisma",
        ] as const;
        const attribute = [...attributes].sort(
            (left, right) => defender[right] - defender[left],
        )[0] ?? "consistencia";
        const predictionKey = formatPrevisionAttackKey(defender.id, attackerId);
        const predictionCount = numberRecord(battle.previsionActions)[predictionKey] ?? 0;
        await this.offensiveCardService.execute(defender.userId, battle.id, {
            battleId: battle.id,
            defenderId: defender.id,
            attribute,
            usedMana: defender.currentMana > 0 && chance(0.35, this.random)
                ? randomInteger(1, Math.min(2, defender.currentMana), this.random)
                : 0,
            usedActions: 1,
            usedCertaintyDie:
                (defender.certaintyDiceRemaining ?? 0) > 0 && chance(0.1, this.random),
            previewAction: predictionCount > 0 && chance(0.5, this.random),
        });
    }

    private async resolveReaction(
        battle: NonNullable<Awaited<ReturnType<BattleStateRepository["findById"]>>>,
        pendingAttack: NonNullable<Awaited<ReturnType<PendingGetter["getPendingAttack"]>>>,
        defender: TokenInstance,
    ): Promise<void> {
        if (!isAlive(defender)) {
            await this.cancelReactionService.execute(battle.id);
            return;
        }
        const availableActions = numberRecord(battle.accumulatedActions)[defender.id] ?? 0;
        if (availableActions < 1) {
            await this.cancelReactionService.execute(battle.id);
            return;
        }
        const predictionKey = formatPrevisionAttackKey(defender.id, pendingAttack.attackerId);
        if (
            (numberRecord(battle.previsionActions)[predictionKey] ?? 0) > 0 &&
            chance(0.5, this.random)
        ) {
            await this.previousActionService.execute(battle.id);
            return;
        }
        const options = REACTION_OPTIONS[pendingAttack.attackAttribute] ?? ["consistencia"];
        const reactionType = randomChoice(options, this.random) ?? "consistencia";
        await this.reactionService.execute(battle.id, {
            type: reactionType,
            attribute: reactionType,
            reactionType,
            usedActions: randomInteger(1, availableActions, this.random),
            usedMana: defender.currentMana > 0 && chance(0.4, this.random)
                ? randomInteger(1, Math.min(2, defender.currentMana), this.random)
                : 0,
            usedCertaintyDie:
                (defender.certaintyDiceRemaining ?? 0) > 0 && chance(0.1, this.random),
            usedItem: null,
        });
    }

    private async resolveDefenseDefinition(
        battle: NonNullable<Awaited<ReturnType<BattleStateRepository["findById"]>>>,
        attacker: TokenInstance,
    ): Promise<void> {
        await this.defenseService.execute(battle.id, {
            type: "destreza",
            attribute: "destreza",
            usedActions: 1,
            usedMana: attacker.currentMana > 0 && chance(0.35, this.random)
                ? randomInteger(1, Math.min(2, attacker.currentMana), this.random)
                : 0,
        });
    }

    private async resolveTurn(
        battle: NonNullable<Awaited<ReturnType<BattleStateRepository["findById"]>>>,
        token: TokenInstance,
        boardTokens: readonly TokenInstance[],
    ): Promise<void> {
        const availableActions = numberRecord(battle.accumulatedActions)[token.id] ?? 0;
        if (!isAlive(token) || availableActions < 1) {
            await this.nextTurnService.execute(battle.id);
            return;
        }
        const enemies = boardTokens.filter((candidate) =>
            candidate.team !== token.team && isAlive(candidate),
        );
        if (enemies.length === 0) {
            await this.nextTurnService.execute(battle.id);
            return;
        }

        const movedThisTurn = booleanRecord(battle.movedThisTurn)[token.id] === true;
        const hasTargetInRange = enemies.some((enemy) =>
            isInAttackRange(token, enemy, "fisico") ||
            isInAttackRange(token, enemy, "magico"),
        );
        if (!movedThisTurn && (!hasTargetInRange || chance(0.55, this.random))) {
            const boardMap = await this.mapRepository.findMapById(battle.mapId);
            if (boardMap) {
                const movement = decideAiMovement(
                    token,
                    enemies,
                    boardMap,
                    boardTokens,
                    this.random,
                );
                if (movement) {
                    try {
                        const resolved = await this.movementService.execute(
                            token.userId,
                            { battleId: battle.id, tokenId: token.id, to: movement.to },
                            { autonomous: true },
                        );
                        if (!resolved.cancelled) return;
                    } catch (movementError) {
                        console.warn("[BATTLE AI] Movimento descartado; escolhendo ação.", movementError);
                    }
                }
            }
        }

        const cards = await this.cardRepository.findManyByIds(
            cardsWithId(token.cards).map((card) => card.id),
        );
        const cardsOnRecharge = stringArrayRecord(battle.cardsNotRechargeds)[token.id] ?? [];
        const usableCards = listAiCardDecisions({
            token,
            boardTokens,
            cards,
            availableActions,
            cardsOnRecharge,
        }, this.random);
        const transformations = token.isTransformation
            ? []
            : (await listTransformationOptions(
                token,
                parseTransformationStates(battle.transformationStates),
                this.tokenDefinitionRepository,
            )).filter((option) =>
                option.direction === "transform" && option.remainingRecharge <= 0,
            );
        const decision = decideAiTurnAction({
            token,
            enemies,
            availableActions,
            hasUsableCard: usableCards.length > 0,
            hasAvailableTransformation: transformations.length > 0,
        }, this.random);
        if (decision.kind === "pass") {
            await this.nextTurnService.execute(battle.id);
            return;
        }
        const accepted = await this.actionService.execute(battle.id, {
            battleId: battle.id,
            ...decision.choice,
        });
        if (!accepted) await this.nextTurnService.execute(battle.id);
    }

    private async clearAmbientState(battleId: string): Promise<void> {
        await this.battleRepository.update(battleId, {
            tokenInAmbientPivotSelection: "",
            selectedPivots: [],
            remainingPivots: 0,
            maxSelectablePivots: 0,
            armedCard: {},
        });
        await syncBattleState(battleId);
    }

    private async skipOffensiveDefender(
        battleId: string,
        pendingQueueId: string,
        defenderId: string,
    ): Promise<void> {
        await this.battleSetter.removeTokenInOffensiveCard(battleId, defenderId);
        const updatedBattle = await this.battleRepository.findById(battleId);
        const remaining = Array.isArray(updatedBattle?.tokensInOffensiveCard)
            ? updatedBattle.tokensInOffensiveCard
            : [];
        if (remaining.length === 0) {
            await this.pendingSetter.cleanPendingOffensiveCard(pendingQueueId);
        }
        await syncBattleState(battleId);
    }
}
