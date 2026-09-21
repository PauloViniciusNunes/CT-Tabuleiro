import { grantFreeActionNoReaction } from "../context/auxiliary/battleFunctions";
import { nextParalysisAfterHit } from "../context/auxiliary/battleFunctions";
import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { ChoiceValidator } from "../validators/ChoiceValidator";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { syncBattleState } from "../utils/syncBattleState";

import { BattleEngineNextTurnService } from "./micro-services/BattleEngineNextTurnService";
import { OperatorType } from "../operators/OperatorType";
import { BattleEngineService } from "./BattleEngineService";
import { attackTypeFromAttribute } from "../utils/attackType";
import { MechanicEngine } from "../mechanic/MechanicEngine";

export class BattleEngineDefenseResolutionService extends BattleEngineService {
    private readonly battleNextTurnService = new BattleEngineNextTurnService();

    async execute(battleId: string, data: unknown) {

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Impossível responder, houve um erro ao procurar batalha.")
        }

        const battle = BattleStateValidator.parse(battleState)

        const pendingQueue = await this.pendingQueueRepository.findById(battleState.pendingQueueId)

        if (!pendingQueue) {
            throw new Error("A fila de pendencias não foi encontrada, não foi possível realizar resposta.")
        }

        const choice = ChoiceValidator.parse(data)

        const pendingAttack = await this.pendingGetter.getPendingAttack(pendingQueue.id)
        const pendingEsquivaRoll = await this.pendingGetter.getPendingEsquivaRoll(pendingQueue.id)
        console.log("PENDING ATTACK: ", pendingAttack)
        console.log("PENDING ESQUIVA ROLL: ", pendingEsquivaRoll)
        if (!pendingAttack || !pendingEsquivaRoll) {
            throw new Error("Essa ação não pode ser realizada, não é válida.")
        };

        if (battleState.status !== "In Battle") return;

        const attackerId = pendingAttack.attackerId;
        const defenderId = pendingAttack.targetId;

        const attackerToken = await this.battleGetter.getToken(attackerId);
        const defenderToken = await this.battleGetter.getToken(defenderId);

        if (!attackerToken || !defenderToken) {
            throw new Error("Token atacante ou defensivo não foram encontrados. Essa ação não é possível")
        }

        //Cálculo da Rolagem
        const proficiencyBonus = await this.battleGetter.getTokenProficiency(attackerId, "destreza")

        const params = {
            tokenId: attackerId,
            usedItemId: undefined,
            Q: (choice.usedActions as number),
            P: 1,
            A: attackerToken.destreza,
            PF: proficiencyBonus,
            O: 0,
            N: (choice["usedMana"] as number) > 0 ? 1 : 0,
            L: attackerToken.level,
            M: (choice["usedMana"] as number),
        };

        const definicaoRoll = await this.resolveActionRoll(
            battleId,
            params,
            "DEFENSE_RESOLUTION_ROLL",
            {
                attribute: "destreza",
                targetTokenId: defenderId,
            },
        );

        // Leitura das rolagens
        const defenderEsquiva = pendingEsquivaRoll?.total ?? 0;
        const atacanteDefinicao = definicaoRoll.total;

        // TA-1 aplicado ao ATACANTE: consome (usedActions - 1), nunca negativo
        const totalActionsToDecrement = Math.max(0, (choice["usedActions"] as number ?? 0) - 1);

        // Leia o saldo real
        const currentActionsAttacker = battle.accumulatedActions[attackerId] ?? 0;
        const remainingActionsAttacker = Math.max(
            0,
            currentActionsAttacker - totalActionsToDecrement
        );

        // Marque o atacante como tendo agido

        await this.battleSetter.addDidActThisTurn(battleId, attackerId, true)
        // Desconta mana do atacante usada na definição (validada)
        const attackerMana = attackerToken.currentMana ?? 0;
        const validatedUsedMana = Math.min(choice["usedMana"] as number ?? 0, attackerMana);

        if (validatedUsedMana > 0) {
            await this.operators.execute(OperatorType.MANA_DECREASE, {
                battleId,
                sourceTokenId: attackerId,
                amount: validatedUsedMana,
                cause: "DEFENSE_RESOLUTION_MANA_COST",
                metadata: { targetTokenId: defenderId },
            })
        }

        // Atualize accumulatedActions do atacante apenas se mudou
        if (remainingActionsAttacker !== currentActionsAttacker) {
            await this.battleSetter.tokenDecreaseAction(battleId, attackerId, totalActionsToDecrement)
        }

        // Resultado binário: esquiva tem sucesso se a esquiva do defensor for >= definição do atacante
        const esquivaSuccessful = defenderEsquiva >= atacanteDefinicao;

        const responseGranted = esquivaSuccessful
            ? await grantFreeActionNoReaction(
                this.battleSetter,
                this.pendingSetter,
                battleId,
                pendingQueue.id,
                defenderId,
                attackerId,
                "paralisia",
                1
            )
            : false;

        if (esquivaSuccessful && !responseGranted) {
            await this.pendingSetter.cleanPendingFreeResponse(pendingQueue.id);
            runtime.emit(SocketEvent.PENDING_FREE_RESPONSE, null);
        }

        const finalDamage = esquivaSuccessful ? 0 : pendingAttack.rawDamage;

        // Aplica dano no defensor quando houver
        if (finalDamage > 0) {
            await MechanicEngine.createMechanic(
                attackerId,
                battleId,
                pendingAttack.atackElement,
                { targetId: defenderId },
            )

            //spawnItemVFX(attackerId, defenderId, pendingAttack.usedItem, boardTokens, setBoardVfxElements, playSomeSFX);
            //playSomeSFX("public/sfx/impact.mp3");
            await this.operators.execute(OperatorType.DAMAGE, {
                battleId,
                sourceTokenId: attackerId,
                targetTokenId: defenderId,
                amount: finalDamage,
                element: pendingAttack.atackElement,
                metadata: {
                    attackType: attackTypeFromAttribute(pendingAttack.attackAttribute),
                    attackAttribute: pendingAttack.attackAttribute,
                },
            })
        }


        if (finalDamage > 0 && pendingAttack) {
            const remainingExtraActions = await this.battleGetter.getRemainingExtraActions(battleId)
            const current = await this.battleGetter.getParalysis(battleId, defenderId)
            const nextState = nextParalysisAfterHit(current, pendingAttack.usedMana, (remainingExtraActions.extraActions ?? 0));
            if (nextState !== current) {
                await grantFreeActionNoReaction(
                    this.battleSetter,
                    this.pendingSetter,
                    battleId,
                    pendingQueue.id,
                    attackerId,
                    defenderId,
                    nextState,
                    1
                )
            }
        }


        // Atualizar tokens
        const updatedAttackerToken = await this.tokenInstanceRepository.findTokenTemplateById(attackerId)
        const updatedDefenderToken = await this.tokenInstanceRepository.findTokenTemplateById(defenderId)

        runtime.emit(SocketEvent.TOKEN_UPDATED, updatedAttackerToken)
        runtime.emit(SocketEvent.TOKEN_UPDATED, updatedDefenderToken)

        // Registra histórico da resolução
        await this.battleSetter.addActionHistory({
            battleStateId: battleId,
            tokenId: attackerId,
            choice: choice,
            wasCertainty: false,
            displayRoll: definicaoRoll
        })

        const updatedBattleState = await this.battleStateRepository.findById(battleId)
        runtime.emit(SocketEvent.BATTLE_UPDATED, updatedBattleState)

        // Limpeza do estado de resolução
        await this.pendingSetter.cleanPendingEsquivaRoll(pendingQueue.id)
        runtime.emit(SocketEvent.PENDING_ESQUIVA_ROLL, null)
        await this.pendingSetter.cleanPendingAttack(pendingQueue.id)
        runtime.emit(SocketEvent.PENDING_ATTACK, null)
        runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, false)

        if(remainingActionsAttacker <= 0 && !responseGranted) {
            await this.battleNextTurnService.execute(battleId)
            return
        }

        await syncBattleState(battleId)
    }
}
