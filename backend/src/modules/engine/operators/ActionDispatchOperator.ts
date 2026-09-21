import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { CreateItemValidator } from "@/modules/items/validators/CreateItemValidator";
import { ActionType } from "../context/ActionType";
import { BattleGetter } from "../context/BattleGetter";
import { BattleSetter } from "../context/BattleSetter";
import { PendingGetter } from "../context/PendingGetter";
import { PendingSetter } from "../context/PendingSetter";
import {
    canDefenderReact,
    grantFreeActionNoReaction,
    itemCoerentAdd,
    nextParalysisAfterHit,
} from "../context/auxiliary/battleFunctions";
import type { PendingReaction } from "../context/dao/pendingDaos";
import { ActionDispatchedEvent } from "../mechanic/events/ActionDispatchedEvent";
import { ActionDispatchRequestedEvent } from "../mechanic/events/ActionDispatchRequestedEvent";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import {
    calculateCertainyDieRoll,
    calculateDistance,
    finalPos,
    isInAttackRange,
} from "../utils/calculations";
import { getUsedItemId } from "../utils/usedItem";
import { syncBattleState } from "../utils/syncBattleState";
import {
    hasTokenMechanicDisadvantage,
    resolveTokenMechanic,
} from "../utils/tokenMechanics";
import { ChoiceValidator } from "../validators/ChoiceValidator";
import { DamageOperator } from "./DamageOperator";
import { ManaDecreaseOperator } from "./ManaDecreaseOperator";
import { ManaIncrementOperator } from "./ManaIncrementOperator";
import { MechanicApplicationOperator } from "./MechanicApplicationOperator";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";
import { RollOperator } from "./RollOperator";
import { SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY } from "../special-response/types";

type EngineActionChoice = ReturnType<typeof ChoiceValidator.parse>;
type BattleSnapshot = ReturnType<typeof BattleStateValidator.parse>;
type BoardToken = NonNullable<
    Awaited<ReturnType<TokenTemplateRepository["findTokenTemplateById"]>>
>;

export type ActionDispatchOutcome =
    | "card-pending"
    | "mana-recovered"
    | "attack-pending"
    | "attack-resolved"
    | "special-response-pending"
    | "cancelled"
    | "rejected";

export interface ActionIntent extends OperationIntent {
    readonly actionType: ActionType;
    readonly sourceTokenId: string;
    readonly choice: Readonly<Record<string, unknown>>;
}

export interface ActionData
    extends ActionIntent, OperationContext, InterceptableData {
    readonly outcome?: ActionDispatchOutcome;
    readonly remainingActions?: number;
    readonly shouldAdvanceTurn?: boolean;
}

export type ActionDispatchInput = ActionIntent & {
    readonly operationId?: string;
};

interface ActionResult {
    readonly outcome: ActionDispatchOutcome;
    readonly remainingActions?: number;
    readonly shouldAdvanceTurn?: boolean;
}

function finiteInteger(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.floor(value)
        : fallback;
}

function continuationRequestId(
    metadata: Readonly<Record<string, unknown>> | undefined,
): string | null {
    const continuation = metadata?.[SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY];
    if (!continuation || typeof continuation !== "object") return null;
    const requestId = (continuation as Record<string, unknown>).requestId;
    return typeof requestId === "string" && requestId ? requestId : null;
}

/** Official boundary that validates, intercepts and dispatches battle actions. */
export class ActionDispatchOperator extends Operator<ActionDispatchInput, ActionData> {
    private readonly rollOperator: RollOperator;
    private readonly manaDecreaseOperator: ManaDecreaseOperator;
    private readonly manaIncrementOperator: ManaIncrementOperator;
    private readonly damageOperator: DamageOperator;
    private readonly mechanicApplicationOperator: MechanicApplicationOperator;

    constructor(
        runtimeAdapter: OperatorRuntime,
        private readonly battleRepository = new BattleStateRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
        private readonly pendingQueueRepository = new PendingQueueRepository(),
        private readonly battleGetter = new BattleGetter(),
        private readonly battleSetter = new BattleSetter(),
        private readonly pendingGetter = new PendingGetter(pendingQueueRepository),
        private readonly pendingSetter = new PendingSetter(pendingQueueRepository),
    ) {
        super(runtimeAdapter);
        this.rollOperator = new RollOperator(runtimeAdapter);
        this.manaDecreaseOperator = new ManaDecreaseOperator(runtimeAdapter);
        this.manaIncrementOperator = new ManaIncrementOperator(runtimeAdapter);
        this.damageOperator = new DamageOperator(runtimeAdapter);
        this.mechanicApplicationOperator = new MechanicApplicationOperator(runtimeAdapter);
    }

    async execute(input: ActionDispatchInput): Promise<ActionData> {
        if (!input.battleId || !input.sourceTokenId) {
            throw new Error("A ação precisa de batalha e token de origem.");
        }

        const battleState = await this.battleRepository.findById(input.battleId);
        if (!battleState || battleState.status !== "In Battle") {
            throw new Error("Não foi possível realizar a ação fora de uma batalha ativa.");
        }

        const battle = BattleStateValidator.parse(battleState);
        if (!battle.id) {
            throw new Error("A batalha da ação não possui um ID válido.");
        }

        const currentTokenId = battle.turnOrder[battle.currentTurnIndex]?.tokenId;
        if (!currentTokenId || currentTokenId !== input.sourceTokenId) {
            throw new Error("A ação precisa ser executada pelo token do turno atual.");
        }
        const sourceToken = await this.requireToken(currentTokenId);
        if (sourceToken.mapId !== battle.mapId) {
            throw new Error("O token do turno atual não pertence ao mapa da batalha.");
        }

        const pendingQueue = await this.pendingQueueRepository.findById(battle.pendingQueueId);
        if (!pendingQueue) {
            throw new Error("A fila de pendências da batalha não foi encontrada.");
        }
        const continuationId = continuationRequestId(input.metadata);
        const currentSpecialResponse = await this.pendingGetter.getPendingSpecialResponse(
            pendingQueue.id,
        );
        if (currentSpecialResponse && currentSpecialResponse.requestId !== continuationId) {
            throw new Error("A ação aguarda a resolução de uma resposta especial.");
        }

        const initialChoice = ChoiceValidator.parse(input.choice);
        const intercepted = await this.runtime.intercept(
            InterceptorType.ACTION_DISPATCH,
            {
                ...input,
                operationId: input.operationId ?? crypto.randomUUID(),
                choice: Object.freeze({ ...initialChoice }),
                metadata: Object.freeze({ ...(input.metadata ?? {}) }),
                cancelled: false,
            },
            input.battleId,
        );

        if (intercepted.cancelled) {
            const cancelled: ActionData = {
                ...intercepted,
                battleId: battle.id,
                sourceTokenId: currentTokenId,
                outcome: "cancelled",
                shouldAdvanceTurn: false,
            };
            await syncBattleState(battle.id);
            return cancelled;
        }

        const choice = ChoiceValidator.parse(intercepted.choice);
        const action: ActionData = {
            ...intercepted,
            battleId: battle.id,
            sourceTokenId: currentTokenId,
            choice: Object.freeze({ ...choice }),
        };

        await this.runtime.dispatchEvent(
            battle.id,
            new ActionDispatchRequestedEvent(action),
            { action },
        );

        const requestedSpecialResponse = await this.pendingGetter.getPendingSpecialResponse(
            pendingQueue.id,
        );
        if (
            requestedSpecialResponse &&
            requestedSpecialResponse.requestId !== continuationId
        ) {
            const pendingAction: ActionData = {
                ...action,
                outcome: "special-response-pending",
                shouldAdvanceTurn: false,
            };
            await syncBattleState(battle.id);
            return pendingAction;
        }

        try {
            const result = await this.dispatch(
                action.actionType,
                choice,
                battle,
                pendingQueue.id,
                currentTokenId,
                action.metadata,
            );
            const resolved: ActionData = { ...action, ...result };

            if (resolved.outcome !== "rejected" && resolved.outcome !== "cancelled") {
                await this.runtime.dispatchEvent(
                    battle.id,
                    new ActionDispatchedEvent(resolved),
                    { action: resolved },
                );
            }

            return resolved;
        } finally {
            // Emits de formulário são incrementais; a sincronização fecha o ciclo
            // com o estado autoritativo de batalha, tokens e demais pendências.
            await syncBattleState(battle.id);
        }
    }

    private async dispatch(
        actionType: ActionType,
        choice: EngineActionChoice,
        battle: BattleSnapshot,
        pendingQueueId: string,
        tokenId: string,
        operationMetadata: Readonly<Record<string, unknown>> | undefined,
    ): Promise<ActionResult> {
        switch (actionType) {
            case ActionType.CARD_DISPATCH:
                return this.cardDispatch(pendingQueueId, tokenId);
            case ActionType.MANA_RECOVER:
                return this.manaRecover(choice, battle, tokenId);
            case ActionType.ATTACK:
            case ActionType.SURPRISE:
            case ActionType.DISORIENT:
            case ActionType.PREDICT:
                return this.attack(
                    choice,
                    battle,
                    pendingQueueId,
                    tokenId,
                    operationMetadata,
                );
            default: {
                const exhaustive: never = actionType;
                throw new Error(`Tipo de ação não suportado: ${exhaustive}`);
            }
        }
    }

    private async cardDispatch(
        pendingQueueId: string,
        tokenId: string,
    ): Promise<ActionResult> {
        const token = await this.requireToken(tokenId);

        await this.pendingSetter.setPendingCardResolution(pendingQueueId, token);
        runtime.emit(SocketEvent.FRONTEND_CARD_SELECTION, true);
        runtime.emit(SocketEvent.PENDING_CARD_RESOLUTION, token);

        return { outcome: "card-pending", shouldAdvanceTurn: false };
    }

    private async manaRecover(
        choice: EngineActionChoice,
        battle: BattleSnapshot,
        tokenId: string,
    ): Promise<ActionResult> {
        if (!battle.id) {
            throw new Error("A batalha da recuperação de mana não possui ID.");
        }

        const availableActions = Math.max(1, battle.accumulatedActions[tokenId] ?? 1);
        const usedActions = Math.max(
            1,
            Math.min(finiteInteger(choice.usedActions, 1), availableActions),
        );

        const token = await this.requireToken(tokenId);
        const recoveryPerAction = 3 * Math.floor(
            (((token.level - 10) / 4) + 4) / 2,
        );
        await this.manaIncrementOperator.execute({
            battleId: battle.id,
            sourceTokenId: tokenId,
            amount: recoveryPerAction * usedActions,
            cause: "MANA_RECOVERY_ACTION",
            metadata: { usedActions },
        });
        await this.battleSetter.tokenDecreaseAction(battle.id, tokenId, usedActions);

        const remainingActions = Math.max(0, availableActions - usedActions);
        return {
            outcome: "mana-recovered",
            remainingActions,
            shouldAdvanceTurn: remainingActions <= 0,
        };
    }

    private async attack(
        choice: EngineActionChoice,
        battle: BattleSnapshot,
        pendingQueueId: string,
        tokenId: string,
        operationMetadata: Readonly<Record<string, unknown>> | undefined,
    ): Promise<ActionResult> {
        if (!battle.id) {
            throw new Error("A batalha do ataque não possui ID.");
        }
        if (typeof choice.targetId !== "string" || !choice.targetId) {
            throw new Error("O ataque precisa de um alvo.");
        }
        if (choice.targetId === tokenId) {
            throw new Error("O alvo e o executor da ação não podem ser o mesmo token.");
        }

        const [token, target] = await Promise.all([
            this.requireToken(tokenId),
            this.requireToken(choice.targetId),
        ]);
        if (token.mapId !== battle.mapId || target.mapId !== battle.mapId) {
            throw new Error("O executor e o alvo precisam pertencer ao mapa da batalha.");
        }

        const attribute = typeof choice.attribute === "string" ? choice.attribute : "";
        const isPhysicalAttack = ["forca", "destreza"].includes(attribute);
        const attackType = isPhysicalAttack ? "fisico" : "magico";
        if (!isInAttackRange(token, target, attackType)) {
            const distance = calculateDistance(token, target);
            const maxRange = isPhysicalAttack
                ? token.bodyToBodyRange || 1
                : token.magicalRange || 6;
            console.warn(
                `${token.id} está fora do alcance para atacar ${target.name}. ` +
                `Distância: ${distance}, Alcance máximo: ${maxRange}`,
            );
            return { outcome: "rejected", shouldAdvanceTurn: false };
        }

        const availableActions = Math.max(1, battle.accumulatedActions[tokenId] ?? 1);
        const usedActions = Math.max(
            1,
            Math.min(finiteInteger(choice.usedActions, 1), availableActions),
        );
        const availableMana = Math.max(0, token.currentMana ?? 0);
        const usedMana = Math.max(
            0,
            Math.min(finiteInteger(choice.usedMana, 0), availableMana),
        );
        const wasCertainty = choice.usedCertaintyDie === true;
        const selectedMechanic = typeof choice.selectedMechanic === "string"
            ? choice.selectedMechanic
            : undefined;
        const elementUsed = resolveTokenMechanic(token, usedMana, selectedMechanic);
        const proficiencyBonus = await this.battleGetter.getTokenProficiency(tokenId, attribute);
        const requestedPosition = typeof choice.pos === "number" && Number.isFinite(choice.pos)
            ? choice.pos
            : 1;
        const elementalPosition = attribute === "forca" &&
            hasTokenMechanicDisadvantage(target, elementUsed) &&
            usedMana > 0
            ? 2 * requestedPosition
            : requestedPosition;
        const attributePosition = await this.battleGetter.searchTokenPosition(
            battle.id,
            token.id,
            attribute,
        );
        const usedItem = choice.item ? CreateItemValidator.parse(choice.item) : null;
        const usedItemId = getUsedItemId(choice.item);

        const roll = await this.rollOperator.execute({
            battleId: battle.id,
            cause: "ATTACK_ROLL",
            metadata: {
                ...(operationMetadata ?? {}),
                actionType: choice.actionType,
                attribute,
                targetTokenId: choice.targetId,
                mechanic: elementUsed,
                attackType,
            },
            params: {
                tokenId,
                usedItemId,
                Q: usedActions,
                P: finalPos(elementalPosition, attributePosition),
                A: await this.battleGetter.getTokenAttributeValue(tokenId, attribute),
                PF: proficiencyBonus,
                O: (await this.battleGetter.getTokenBonus(tokenId, attribute)) +
                    itemCoerentAdd(attribute, usedItem),
                N: attribute === "forca" || attribute === "sabedoria"
                    ? 0
                    : proficiencyBonus > 0 ? 1 : 0,
                L: token.level,
                M: usedMana,
                attribute,
            },
        });

        if (roll.cancelled || !roll.result) {
            return { outcome: "cancelled", shouldAdvanceTurn: false };
        }

        await this.battleSetter.addDidActThisTurn(battle.id, tokenId, true);
        await this.battleSetter.tokenDecreaseAction(battle.id, tokenId, usedActions);
        const remainingActions = Math.max(0, availableActions - usedActions);

        const certaintyRoll = wasCertainty
            ? calculateCertainyDieRoll(roll.result, usedActions)
            : null;
        const displayRoll = certaintyRoll?.displayRoll ?? roll.result;
        const attackTotalForHistory = certaintyRoll?.attackTotalForHistory ?? roll.result.total;
        const rawDamage = certaintyRoll?.rawDamage ?? roll.result.total;

        if (wasCertainty) {
            await this.battleSetter.tokenDecreaseCertainyDie(tokenId);
        }
        await this.battleSetter.addActionHistory({
            battleStateId: battle.id,
            tokenId,
            choice,
            wasCertainty,
            displayRoll,
        });
        await this.manaDecreaseOperator.execute({
            battleId: battle.id,
            sourceTokenId: tokenId,
            amount: usedMana,
        });

        const defenderParalysis = await this.battleGetter.getParalysis(battle.id, choice.targetId);
        const hasLock = Boolean(await this.battleGetter.getFreeActionLock(
            battle.id,
            tokenId,
            choice.targetId,
        ));
        if (hasLock) {
            await this.battleSetter.removeFreeActionLock(battle.id, tokenId, choice.targetId);
        }

        const isReactionAllowed = !hasLock && canDefenderReact(usedMana, defenderParalysis);
        const reactions: PendingReaction[] = isReactionAllowed
            ? [
                { type: "destreza", targetToken: target },
                { type: "consistencia", targetToken: target },
            ]
            : [];
        const pending = await this.pendingSetter.setPendingAttack(
            pendingQueueId,
            tokenId,
            choice.targetId,
            rawDamage,
            attackTotalForHistory,
            usedMana,
            attribute,
            reactions,
            isReactionAllowed,
            hasLock,
            usedActions,
            elementUsed,
            choice.item,
        );

        const targetActions = await this.battleGetter.getTokenAction(battle.id, choice.targetId);
        if ((targetActions ?? 0) < 1) {
            await this.battleSetter.tokenSetAction(battle.id, choice.targetId, 1);
        }

        runtime.emit(SocketEvent.PENDING_ATTACK, pending.pendingAttack);
        if (isReactionAllowed) {
            return {
                outcome: "attack-pending",
                remainingActions,
                shouldAdvanceTurn: false,
            };
        }

        if (rawDamage > 0 && elementUsed !== "none" && elementUsed !== "neutro") {
            await this.mechanicApplicationOperator.execute({
                battleId: battle.id,
                sourceTokenId: tokenId,
                tag: elementUsed,
                mechanicMetadata: { targetId: choice.targetId },
            });
        }
        await this.damageOperator.execute({
            battleId: battle.id,
            sourceTokenId: tokenId,
            targetTokenId: choice.targetId,
            amount: rawDamage,
            element: elementUsed,
            metadata: {
                attackType,
                attackAttribute: attribute,
            },
        });

        const currentParalysis = await this.battleGetter.getParalysis(battle.id, tokenId);
        const remainingExtraActions = await this.battleGetter.getRemainingExtraActions(battle.id);
        const nextState = nextParalysisAfterHit(
            currentParalysis,
            usedMana,
            remainingExtraActions.extraActions ?? 0,
        );
        if (nextState !== currentParalysis) {
            await grantFreeActionNoReaction(
                this.battleSetter,
                this.pendingSetter,
                battle.id,
                pendingQueueId,
                tokenId,
                choice.targetId,
                nextState,
                1,
            );
        }

        await this.pendingSetter.cleanPendingAttack(pendingQueueId);
        await this.pendingSetter.cleanPendingEsquivaRoll(pendingQueueId);
        runtime.emit(SocketEvent.PENDING_ATTACK, null);
        runtime.emit(SocketEvent.PENDING_ESQUIVA_ROLL, null);
        runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, false);

        // Uma mecânica de paralisia pode ter concedido uma ação livre durante a
        // resolução; a decisão de trocar o turno precisa observar o valor vivo.
        const liveRemainingActions = Math.max(
            0,
            (await this.battleGetter.getTokenAction(battle.id, tokenId)) ?? 0,
        );

        return {
            outcome: "attack-resolved",
            remainingActions: liveRemainingActions,
            shouldAdvanceTurn: liveRemainingActions <= 0,
        };
    }

    private async requireToken(tokenId: string): Promise<BoardToken> {
        const token = await this.tokenRepository.findTokenTemplateById(tokenId);
        if (!token) {
            throw new Error(`O token da ação "${tokenId}" não foi encontrado.`);
        }
        return token;
    }
}
