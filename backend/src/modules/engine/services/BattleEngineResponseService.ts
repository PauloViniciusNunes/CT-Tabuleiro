import { finalPos } from "../utils/calculations";
import { ChoiceValidator } from "../validators/ChoiceValidator";

import { isInAttackRange } from "../utils/calculations";
import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { calculateCertainyDieRoll } from "../utils/calculations";


import { PendingReaction } from "../context/dao/pendingDaos";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { CreateItemValidator } from "@/modules/items/validators/CreateItemValidator";
import { grantFreeActionNoReaction, itemCoerentAdd } from "../context/auxiliary/battleFunctions";
import { nextParalysisAfterHit } from "../context/auxiliary/battleFunctions";

import { canDefenderReact } from "../context/auxiliary/battleFunctions";

import { BattleEngineNextTurnService } from "./micro-services/BattleEngineNextTurnService";
import { syncBattleState } from "../utils/syncBattleState";
import { discoverCurrentUserId } from "@/shared/utils/discoverCurrentUserId";
import { OperatorType } from "../operators/OperatorType";
import { BattleEngineService } from "./BattleEngineService";
import { MechanicEngine } from "../mechanic/MechanicEngine";
import {
    hasTokenMechanicDisadvantage,
    resolveTokenMechanic,
} from "../utils/tokenMechanics";
import { getUsedItemId } from "../utils/usedItem";

export class BattleEngineResponseService extends BattleEngineService {
    private readonly battleEngineNextTurnService = new BattleEngineNextTurnService();

    async execute(battleId: string, data: unknown) {

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha.")
        }


        if (battleState.status !== "In Battle") {
            throw new Error("O estado de batalha não está em andamento.")
        }

        const boardTokens = await this.tokenInstanceRepository.listByMapId(battleState.mapId)

        if (!boardTokens) {
            throw new Error("Tokens no tabuleiro não foram encontrados.")
        }

        const pendingQueue = await this.pendingQueueRepository.findByBattleStateId(battleId)

        if (!pendingQueue) {
            throw new Error("Nenhuma fila foi encontrada. Não será possível realizar a ação.")
        }

        const pendingResponse = await this.pendingGetter.getPendingFreeResponse(pendingQueue.id);

        const battle = BattleStateValidator.parse(battleState)

        if (!battle) {
            throw new Error("Não foi possível passar battle")
        }

        const choice = ChoiceValidator.parse(data)

        const attackerId = choice["attackerId"] as string
        const forcedTargetId = choice["targetId"] as string

        if (pendingResponse?.responderId !== attackerId ||
            pendingResponse?.paralyzedId !== forcedTargetId) {
            throw new Error("Não existe uma resposta livre pendente para este atacante e alvo.");
        }

        if (attackerId === forcedTargetId) {
            throw new Error("Algo deu errado! O id do atacante e do alvo são os mesmos!")
        }

        const token = boardTokens.find((t) => t.id === attackerId);
        const target = boardTokens.find((t) => t.id === forcedTargetId);

        if (!token || !target) {
            throw new Error("Não havia atacante nem alvo.")
        }

        // ID's dos usuários respectivos.
        const forcedUserId: string = await discoverCurrentUserId(forcedTargetId, battleState.mapId)

        const coercedChoice = { ...choice, targetId: forcedTargetId };


        const isPhysicalAttack = ["forca", "destreza"].includes(coercedChoice["attribute"] ?? "");
        const attackType = isPhysicalAttack ? "fisico" : "magico";

        if (!isInAttackRange(token, target, attackType)) {
            throw new Error("Ataque não foi bem sucedido, alvo tava fora de alcance.")
        }

        // 2) Saneamento
        const usedMana = Math.min((choice["usedMana"] as number) ?? 0, token.currentMana ?? 0);
        const usedActions = Math.max(1, Math.min((choice["usedActions"] as number) ?? 1, battle.accumulatedActions[attackerId] ?? 1));
        const wasCertainty = !!choice["usedCertaintyDie"]
        const elementUsed = resolveTokenMechanic(token, usedMana, choice.selectedMechanic);

        // 3) Proficiência await this.battleGetter.getParalysis(battleId, forcedTargetId
        const prevReaction = await this.battleGetter.getPrevReaction(battleId)
        const proficiencyBonus = await this.battleGetter.getTokenProficiency(token.id, choice["attribute"] ?? "")

        const elementalPos = (
            choice.attribute === "forca" &&
            hasTokenMechanicDisadvantage(target, elementUsed) &&
            usedMana > 0
        ) ? 2 * (prevReaction[attackerId] === "destreza" ? 2 : 1) : prevReaction[attackerId] === "destreza" ? 2 : 1;
        const attrPos = await this.battleGetter.searchTokenPosition(battleId, token.id, choice.attribute ?? "")

        const selectedItem = choice["item"];

        const usedItem = selectedItem ? CreateItemValidator.parse(selectedItem) : null;
        const usedItemId = getUsedItemId(selectedItem);

        const itemAdd = itemCoerentAdd(choice["attribute"] ?? "", usedItem)
        const tokenOcasionalAddition = await this.battleGetter.getTokenBonus(attackerId, choice["attribute"] ?? "")
        const params = {
            tokenId: attackerId,
            usedItemId,
            Q: usedActions,
            P: finalPos(elementalPos, attrPos),
            A: await this.battleGetter.getTokenAttributeValue(attackerId, choice["attribute"] ?? ""),
            PF: proficiencyBonus,
            O: tokenOcasionalAddition + (itemAdd ?? 0),
            N: (choice["attribute"] ?? "") === "forca" || (choice["attribute"] ?? "") === "sabedoria" ? 0 : proficiencyBonus ? 1 : 0,
            L: token.level,
            M: usedMana,
            certainty: wasCertainty,
            attribute: coercedChoice.attribute,
        };

        const baseRoll = await this.resolveActionRoll(
            battleId,
            params,
            "RESPONSE_ROLL",
            {
                attribute: choice.attribute,
                targetTokenId: forcedTargetId,
                mechanic: elementUsed,
                attackType,
            },
        );

        await this.battleSetter.tokenDecreaseAction(battleId, attackerId, usedActions)

        const otherCurrentActions = (battle.accumulatedActions[attackerId] ?? 0) - usedActions;

        const r = await this.battleGetter.getRemainingExtraActions(battleId)
        await this.battleSetter.setRemainingExtraActions(battleId, attackerId, Math.max(0, otherCurrentActions > 0 ? (r.extraActions ?? 1) - 1 : 0))
        const remainingExtraActions = await this.battleGetter.getRemainingExtraActions(battleId)

        // 6) Dado Certo
        const certaintyRoll = wasCertainty
            ? calculateCertainyDieRoll(baseRoll, usedActions)
            : null;
        const displayRoll = certaintyRoll?.displayRoll ?? baseRoll;
        const attackTotalForHistory = certaintyRoll?.attackTotalForHistory ?? baseRoll.total;
        const rawDamage = certaintyRoll?.rawDamage ?? baseRoll.total;

        if (wasCertainty) {
            await this.battleSetter.tokenDecreaseCertainyDie(attackerId)
        }

        // 7) Histórico
        await this.battleSetter.addActionHistory({
            battleStateId: battleId,
            tokenId: attackerId,
            choice: choice,
            wasCertainty,
            displayRoll: displayRoll
        })

        // 8) Desconta mana do responder
        if (usedMana > 0) {
            await this.operators.execute(OperatorType.MANA_DECREASE, {
                battleId,
                sourceTokenId: attackerId,
                amount: usedMana,
                cause: "RESPONSE_MANA_COST",
                metadata: { targetTokenId: forcedTargetId },
            })
        }

        // 9) Consumir lock e bloquear reação
        const hasLock = !!(await this.battleGetter.getFreeActionLock(battleId, attackerId, forcedTargetId));
        if (hasLock) {
            await this.battleSetter.removeFreeActionLock(battleId, attackerId, forcedTargetId)
        }

        const defenderParalysis = await this.battleGetter.getParalysis(battleId, forcedTargetId)

        const reactionPermittedByParalysis = canDefenderReact(usedMana, defenderParalysis);
        const isReactionAllowed = reactionPermittedByParalysis;

        // TIPAGEM EXPLÍCITA AQUI
        let reactions: PendingReaction[] = [];
        if (isReactionAllowed) {
            reactions = [
                { type: "destreza" as const, targetToken: target },
                { type: "consistencia" as const, targetToken: target },
            ];
        }

        const pending = await this.pendingSetter.setPendingAttack(
            pendingQueue.id,
            attackerId,
            forcedTargetId,
            rawDamage,
            attackTotalForHistory,
            usedMana,
            choice["attribute"] ?? "",
            reactions,
            isReactionAllowed,
            hasLock || false,
            usedActions,
            elementUsed,
            usedItem
        )

        runtime.emit(SocketEvent.PENDING_ATTACK, pending.pendingAttack)

        const currentParalysis = await this.battleGetter.getParalysis(battleId, forcedTargetId);
        const nextState = nextParalysisAfterHit(currentParalysis, usedMana, (remainingExtraActions.extraActions ?? 0));


        if (nextState === "paralisia_rapida" && (remainingExtraActions.extraActions ?? 0) <= 0) {
            await grantFreeActionNoReaction(
                this.battleSetter,
                this.pendingSetter,
                battleId,
                pendingQueue.id,
                attackerId,
                forcedTargetId,
                nextState,
                1
            )
        }


        if (!isReactionAllowed) {
            // Aplica dano direto + progressão de paralisia
            //spawnItemVFX(attackerId, forcedTargetId, pendingAttack?.usedItem, boardTokens, setBoardVfxElements, playSomeSFX);
            //playSomeSFX("public/sfx/impact.mp3");

            if (rawDamage > 0) {
                await MechanicEngine.createMechanic(
                    attackerId,
                    battleId,
                    elementUsed,
                    { targetId: forcedTargetId },
                )
            }
            
            await this.operators.execute(OperatorType.DAMAGE, {
                battleId,
                sourceTokenId: attackerId,
                targetTokenId: forcedTargetId,
                amount: rawDamage,
                element: elementUsed,
                metadata: {
                    attackType,
                    attackAttribute: choice.attribute,
                },
            })

            if (nextState !== currentParalysis) {
                await this.battleSetter.setParalysis(battleId, forcedTargetId, nextState)
            }

            const allowedNextAtackFlag = nextState === "paralisia_rapida" || nextState === "paralisia";
            await this.battleSetter.setPostParalyse(battleId, attackerId, forcedTargetId, allowedNextAtackFlag)

            await this.pendingSetter.cleanPendingAttack(pendingQueue.id)
            runtime.emit(SocketEvent.PENDING_ATTACK, null)

            await this.pendingSetter.cleanPendingEsquivaRoll(pendingQueue.id)
            runtime.emit(SocketEvent.PENDING_ESQUIVA_ROLL, null)
            runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, false)

            if (!allowedNextAtackFlag) {
                await this.battleSetter.cleanPostParalysis(battleId)
                await this.battleSetter.setParalysis(battleId, forcedTargetId, "none")
            }
            else {
                await this.battleSetter.setParalysis(battleId, forcedTargetId, nextState)
            }

            const hasLock = !!(await this.battleGetter.getFreeActionLock(battleId, attackerId, forcedTargetId));
            if (hasLock) {
                await this.battleSetter.removeFreeActionLock(battleId, attackerId, forcedTargetId)
            }

            if ((remainingExtraActions.extraActions ?? 0) <= 0) {
                await this.battleSetter.addLastAllUsedResponse(battleId, attackerId, true)
                await this.battleSetter.addLastAllUsedResponse(battleId, forcedTargetId, true)
            }

            const currentToken = await this.battleGetter.getCurrentBattleToken(battleId)
            const remainingActions = await this.battleGetter.getTokenAction(battleId, currentToken.id)

            if (nextState === "none") {
                await this.battleSetter.setActorUserId(battleId, forcedUserId)
                runtime.emit(SocketEvent.PENDING_FREE_RESPONSE, null)
                await this.pendingSetter.cleanPendingFreeResponse(pendingQueue.id)

                if(remainingActions <= 0) await this.battleEngineNextTurnService.execute(battleId)
            }


            await syncBattleState(battleId)
            return
        }
        else {
            await this.battleSetter.cleanRemainingExtraActions(battleId)
            runtime.emit(SocketEvent.PENDING_FREE_RESPONSE, null)
            await this.pendingSetter.cleanPendingFreeResponse(pendingQueue.id)
            await this.battleSetter.setParalysis(battleId, forcedTargetId, "none")

            await this.battleSetter.setActorUserId(battleId, forcedUserId)

        }

        await syncBattleState(battleId)
        return

    }

}
