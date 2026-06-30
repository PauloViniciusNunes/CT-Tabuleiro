import type { EngineContext } from "../../types/BoardEngineContext";
import type { ExecuteChoice } from "../../types/executeChoice";
import { calculateActionRoll, isInAttackRange, calculateDistance, finalPos } from "../../utils/battleCalculations";
import type { RollResult, ActionChoice, PendingReaction } from "../../types/battle";
import { getParalysis } from "../../state/stateParalysis";
import { nextParalysisAfterHit, canDefenderReact } from "../../utils/paralysis";
import { grantFreeActionNoReaction } from "../../state/stateFreeAction";
import { applyTokenEffect } from "../../effects/effectsApplication";
import { defineRemainingPrevisionAttacks } from "../combatPrevisions";
import { playSomeSFX } from "../../audio/playSomeSFX";
import { spawnItemVFX } from "../../types/elementoVFX";
import type { Token } from "../../types/token";
import { elementToEffect } from "../../types/effects";
import { setParalysis } from "../../state/stateParalysis";
import { rollInitiative } from "../../utils/battleCalculations";
import type { InitiativeData,BattleState } from "../../types/battle";
import { initializeBattleStats } from "../../utils/battleCalculations";
import { AICombatPhase } from "../../types/ai/AICombatPhase";
import { applyCardEntityEffect, decreaseCardEntityDuration } from "../../cards/cardEffects";
import { stepTokenEffect } from "../../effects/stepSystem";
import { reduceTimeToRecharge } from "../combatRecharge";
import { applyEffectsCausality } from "../../effects/effectsApplication";
import processTurnEffects from "../../utils/battleEffects";

export class BattleEngine {
    private context!: EngineContext;
    private lastAccumulatedActionsTurnKey = "";

    private searchTokenPosition(tokenId: string, attr: string) {
        const key = `${tokenId}->${attr}`;
        return this.context.tokensBattlePosition[key] ?? 1;
    }

    private applyTokenDamage(attackerId: string, targetId: string, rawDamage: number): void {
        this.context.setBoardTokens((prev) =>
            prev.map((t) =>
                t.id === targetId
                    ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - rawDamage), lastDamagerId: attackerId }
                    : t
            )
        );
    }

    private handleEndReaction() {
        this.context.setPendingAttack(null);
        this.context.setPendingEsquivaRoll(null);
        this.context.setIsInDefenseResolution(false);
    }

    private handleDefenseCardResolution(triggerToken: Token) {
        this.context.setPendingCardResolution(triggerToken);
        this.context.setPendingAttack(null);
        this.context.setInDefenseCardResolution(true);
        this.context.setInCardSelection(true);
    }

    public setContext(context: EngineContext) {
        this.context = context;
        this.syncRefs();
    }

    public update = () => {
        this.syncRefs();
        this.reallocateAndRemoveDeadTokens();
        this.cleanupPendingStatesForDeadTokens();
        this.checkBattleEnd();
        this.processPostParalyse();
        this.processExhaustedExtraActions();
        this.processAutoAdvanceTurn();
        this.calculateAccumulatedActionsForCurrentTurn();
        this.syncRefs();
    };

    private syncRefs() {
        this.context.boardTokensRef.current = this.context.boardTokens;
        this.context.battleStateRef.current = this.context.battleState;
        this.context.pendingAttackRef.current = this.context.pendingAttack;
    }

    private getLivingTokenIds(): Set<string> {
        return new Set(
            this.context.boardTokens
                .filter((token) => (token.currentLife ?? 1) > 0)
                .map((token) => token.id)
        );
    }

    private reallocateAndRemoveDeadTokens() {
        if (this.context.battleStateRef.current.status !== "In Battle") return;

        const deadTokenIds = this.context.boardTokens
            .filter((token) => (token.currentLife ?? 0) <= 0)
            .map((token) => token.id);

        if (deadTokenIds.length === 0) return;

        const aliveTokenIds = this.context.boardTokens
            .filter((token) => (token.currentLife ?? 0) > 0)
            .map((token) => token.id);

        this.context.setBattleState((prev) => {
            if (prev.status !== "In Battle") return prev;

            const newTurnOrder = prev.turnOrder.filter((turn) =>
                aliveTokenIds.includes(turn.tokenId)
            );
            const currentTurn = prev.turnOrder[prev.currentTurnIndex];
            let newCurrentIndex = newTurnOrder.findIndex(
                (turn) => turn.tokenId === currentTurn?.tokenId
            );

            if (newCurrentIndex < 0) newCurrentIndex = 0;

            return {
                ...prev,
                isReallocatingTurns: false,
                turnOrder: newTurnOrder,
                currentTurnIndex: newCurrentIndex,
                currentActorId: newTurnOrder[newCurrentIndex]?.tokenId ?? null,
            };
        });

        this.context.setBoardTokens((prev) =>
            prev.filter((token) => !deadTokenIds.includes(token.id))
        );
    }

    private cleanupPendingStatesForDeadTokens() {
        if (this.context.battleState.status !== "In Battle") return;

        const livingIds = this.getLivingTokenIds();

        if (
            this.context.pendingAttack &&
            (!livingIds.has(this.context.pendingAttack.attackerId) ||
                !livingIds.has(this.context.pendingAttack.targetId))
        ) {
            this.handleEndReaction();
        }

        if (
            this.context.pendingFreeResponse &&
            (!livingIds.has(this.context.pendingFreeResponse.responderId) ||
                !livingIds.has(this.context.pendingFreeResponse.paralyzedId))
        ) {
            this.context.setPendingFreeResponse(null);
            this.context.remainingExtraActions.current = null;
        }

        this.context.setTokensInOffensiveCard((prev) =>
            prev.filter((token) => livingIds.has(token.id))
        );

        if (
            this.context.pendingCardResolution &&
            !livingIds.has(this.context.pendingCardResolution.id)
        ) {
            this.context.setInCardSelection(false);
            this.context.setPendingCardResolution(null);
        }
    }

    private checkBattleEnd() {
        if (this.context.battleState.status !== "In Battle") return;

        const aliveTeams = new Set(
            this.context.boardTokens
                .filter((token) => (token.currentLife ?? 0) > 0)
                .map((token) => token.team)
        );

        if (aliveTeams.size <= 1) {
            this.handleEndBattle();
        }
    }

    private processPostParalyse() {
        const postParalyse = this.context.postParalyse;
        if (!postParalyse?.allowedPostAtack) return;

        this.context.setPendingFreeResponse({
            responderId: postParalyse.responderId,
            paralyzedId: postParalyse.forcedId,
        });
        this.context.setPostParalyse(null);
    }

    private processExhaustedExtraActions() {
        if (!this.context.remainingExtraActions.current) return;
        if ((this.context.remainingExtraActions.current.extraActions ?? 0) > 0) return;

        this.context.remainingExtraActions.current = null;
        this.context.setPendingFreeResponse(null);
    }

    private processAutoAdvanceTurn() {
        this.syncRefs();

        if (
            this.context.shouldAdvanceTurn &&
            this.context.battleStateRef.current.status === "In Battle" &&
            !this.context.pendingAttackRef.current
        ) {
            this.context.setShouldAdvanceTurn(false);
            this.handleNextTurn();
        }
    }

    private calculateAccumulatedActionsForCurrentTurn() {
        if (this.context.battleState.status !== "In Battle") return;
        if (this.context.pendingEsquivaRoll != null) return;
        if (this.context.isInDefenseResolution) return;

        const current = this.context.battleState.turnOrder[this.context.battleState.currentTurnIndex];
        const currentTokenId = current?.tokenId;
        if (!currentTokenId) return;

        const turnKey = `${this.context.battleState.status}-${this.context.battleState.round}-${this.context.battleState.currentTurnIndex}-${currentTokenId}`;
        if (this.lastAccumulatedActionsTurnKey === turnKey) return;
        this.lastAccumulatedActionsTurnKey = turnKey;

        if (this.context.remainingExtraActions.current?.extraActions !== undefined &&
            this.context.remainingExtraActions.current.extraActions <= 0) {
            this.context.remainingExtraActions.current = null;
        }

        const actedPrev = !!this.context.lastTurnActed[currentTokenId];
        const movedPrev = !!this.context.lastTurnMoved[currentTokenId];
        const prevActions = this.context.battleState.accumulatedActions[currentTokenId] ?? 1;

        let newActions = prevActions;
        if (!this.context.hasEnteredFirstTurnRef.current[currentTokenId]) {
            this.context.hasEnteredFirstTurnRef.current[currentTokenId] = true;
            newActions = Math.max(1, prevActions);
        } else if (!actedPrev && !movedPrev) {
            newActions = Math.min(5, Math.max(1, prevActions) + 1);
        } else {
            newActions = Math.max(1, prevActions);
        }

        if (newActions === prevActions) return;

        this.context.setBattleState((prev) => ({
            ...prev,
            accumulatedActions: {
                ...prev.accumulatedActions,
                [currentTokenId]: newActions,
            },
        }));
    }

    public handleStartBattle = () => {
        const teams = new Set(this.context.boardTokens.map((t) => t.team));
        if (teams.size < 2 || this.context.boardTokens.length < 2) {
            alert("É necessário ter tokens de times diferentes para iniciar.");
            return;
        }

        const initialized = this.context.boardTokens
            .map(initializeBattleStats)
            .map(t => ({
                ...t,
                ocassionalAddition: {
                    ...(t.ocassionalAddition ?? {}), // <-- primeiro os existentes

                    // Agora, garanta os que faltam
                    forca: t.ocassionalAddition?.forca ?? 0,
                    destreza: t.ocassionalAddition?.destreza ?? 0,
                    consistencia: t.ocassionalAddition?.consistencia ?? 0,
                    inteligencia: t.ocassionalAddition?.inteligencia ?? 0,
                    sabedoria: t.ocassionalAddition?.sabedoria ?? 0,
                    carisma: t.ocassionalAddition?.carisma ?? 0,
                }
            })) as Token[];

        const attributeTableInit: Record<string, Record<string, number>> = {};

        initialized.forEach(t => {
            attributeTableInit[t.id] = {
                forca: 0,
                destreza: 0,
                consistencia: 0,
                inteligencia: 0,
                sabedoria: 0,
                carisma: 0
            };
        });

        this.context.attributeTable.current = attributeTableInit;

        this.context.setBoardTokens(initialized);
        const inits: InitiativeData[] = initialized.map((token) => ({
            tokenId: token.id,
            initiative: rollInitiative(
                token.attributes.destreza,
                token.proficiencies.destreza,
                token.attributes.level
            ),
            hasExtraTurn: false,
        }));
        inits.sort((a, b) => b.initiative - a.initiative);
        if (inits[0]) inits[0].hasExtraTurn = true;

        const acc: Record<string, number> = {};
        const didActObj: Record<string, boolean> = {};
        const movedObj: Record<string, boolean> = {};

        inits.forEach((i, idx) => {
            acc[i.tokenId] = idx === 0 ? 2 : 1;
            didActObj[i.tokenId] = false;
            movedObj[i.tokenId] = false;
        });

        Object.keys(acc).forEach((id) => {
            acc[id] = Math.max(1, Math.min(5, acc[id]));
        });

        const firstId = inits[0]?.tokenId;
        this.context.setBoardTokens((prev) =>
            prev.map((t) =>
                t.id === firstId ? { ...t, startPosition: { ...t.position } } : t
            )
        );

        this.context.setBoardTokens(prev =>
            prev.map(t => ({
                ...t,
                certaintyDiceRemaining: 2, // 2 por batalha
            }))
        );


        const lastAct: Record<string, boolean> = {};
        const lastMove: Record<string, boolean> = {};
        inits.forEach(i => {
            lastAct[i.tokenId] = false;
            lastMove[i.tokenId] = false;
        });
        this.context.setLastTurnActed(lastAct);
        this.context.setLastTurnMoved(lastMove);

        this.context.hasEnteredFirstTurnRef.current = {};

        this.context.setBattleState({
            status: "In Battle",
            round: 1,
            turnOrder: inits,
            currentTurnIndex: 0,
            currentActorId: firstId,
            phase: "Initiative",
            locks: { aiActing: false, reallocating: false, resolvingAction: false },
            accumulatedActions: acc,
            activeEffects: {},
            actionHistory: [],
            isReallocatingTurns: false,
            isAIActing: false,
            turnVersion: 1,
        });


        this.context.setDidActThisTurn(didActObj);
        this.context.setMovedThisTurn(movedObj);
        /*         if (boardBoss) {
            this.context.setIntroductionAnimation(true);
        } */

    };

    public handleExecuteAction = (choice: ExecuteChoice): boolean => {
        if (this.context.battleState.status !== "In Battle") return false;
        //setInTargetSelection(false)
        console.warn("[HANDLE] EXECUTE CHOICE RECEBIDA: ", choice);
        const liveBattleState = this.context.battleStateRef.current;
        const liveBoardTokens = this.context.boardTokensRef.current;
        const current = liveBattleState.turnOrder[liveBattleState.currentTurnIndex];
        if (!current) return false;
        const tokenId = current.tokenId;

        const token = liveBoardTokens.find((t) => t.id === tokenId);
        const target = liveBoardTokens.find((t) => t.id === choice.targetId);

        if (token && choice.actionType === "card_selection") {
            console.log("ENTROU NA OPÇÂO DE SELEÇÂO DE CARD!")
            this.context.setInCardSelection(true);
            this.context.setPendingCardResolution(token);
            return true;
        }

        console.warn("[HANDLE] ACTION CHOICE RECEBIDA: ", choice);
        if (token && choice.actionType === "mana_recover") {

            const usedActions = Math.max(
                1,
                Math.min(choice.usedActions ?? 1, liveBattleState.accumulatedActions[tokenId] ?? 1)
            );
            const recovering = 3 * (Math.floor((((token.attributes.level - 10) / 4) + 4) / 2))
            this.context.setBoardTokens((prev) =>
                prev.map((t) =>
                    t.id === tokenId
                        ? { ...t, currentMana: Math.min(t.maxMana ?? 0, (t.currentMana ?? 0) + recovering * usedActions) }
                        : t
                )
            );

            const currentActions = liveBattleState.accumulatedActions[tokenId] ?? 1;
            const remainingActions = Math.max(0, currentActions - usedActions);
            this.context.setBattleState((prev) => ({
                ...prev,
                accumulatedActions: { ...prev.accumulatedActions, [tokenId]: remainingActions },
            }));

            console.error(`[HANDLE] ${tokenId} recuperou mana usando ${usedActions} ações, recuperando ${recovering * usedActions} de mana. Ações restantes: ${remainingActions}`);
            if (remainingActions <= 0) {
                console.warn("[HANDLE] Mana recover usou todas as ações, avançando turno");
                this.context.setShouldAdvanceTurn(true);
            }
            return true;
        }

        if (!token || !target) return false;

        const isPhysicalAttack = ["forca", "destreza"].includes(choice.attribute);
        const attackType = isPhysicalAttack ? "fisico" : "magico";
        if (!isInAttackRange(token, target, attackType)) {
            const distance = calculateDistance(token, target);
            const maxRange = isPhysicalAttack ? (token.bodytobodyRange || 1) : (token.magicalRange || 6);
            console.warn(
                `${token.id} está fora do alcance para atacar ${target.name}. ` +
                `Distância: ${distance}, Alcance máximo: ${maxRange}`
            );

            return false;
        }

        // 2) Saneamento de custos (mesma lógica)
        const usedMana = Math.min(choice.usedMana ?? 0, token.currentMana ?? 0);
        const usedActions = Math.max(
            1,
            Math.min(choice.usedActions ?? 1, liveBattleState.accumulatedActions[tokenId] ?? 1)
        );
        const wasCertainty = !!choice.usedCertaintyDie;

        // 3) Bônus de proficiência (mesma fórmula usada antes)
        const proficiencyBonus = token.proficiencies[choice.attribute]
            ? Math.ceil((token.attributes.level - 10) / 4 + 4)
            : 0;



        const elementalPos = (choice.attribute === "forca" && target.tokenPrimaryDisvantege === token.tokenPrimaryElement && usedMana > 0) ? 2 * (choice.pos ?? 1) : choice.pos ?? 1;
        const attrPos = this.searchTokenPosition(token.id, choice.attribute);

        const respectiveAtribute = choice.attribute;
        const selectedItem = choice.item;
        const itemOcasionalAdd = selectedItem?.ocasionalAdd;

        const itemCoerentAdd = respectiveAtribute === selectedItem?.atributeToOcasionalAdd ? itemOcasionalAdd : 0;
        const params = {
            tokenId: tokenId,
            Q: usedActions,
            P: finalPos(elementalPos, attrPos),
            A: token.attributes[choice.attribute],
            PF: proficiencyBonus,
            O: token.ocassionalAddition[choice.attribute] + (itemCoerentAdd ?? 0),
            N:
                choice.attribute === "forca" || choice.attribute === "sabedoria"
                    ? 0
                    : token.proficiencies[choice.attribute]
                        ? 1
                        : 0,
            L: token.attributes.level,
            M: usedMana,
            certainty: wasCertainty,
            attribute: choice.attribute,
        };

        // 5) Rolagem base
        const baseRoll = calculateActionRoll(params) as RollResult;

        // 6) Calcula ações restantes (mantém logs/estado)
        this.context.setDidActThisTurn((prev) => ({ ...prev, [tokenId]: true }));
        const currentActions = liveBattleState.accumulatedActions[tokenId] ?? 1;
        const remainingActions = Math.max(0, currentActions - usedActions);
        this.context.setBattleState((prev) => ({
            ...prev,
            accumulatedActions: { ...prev.accumulatedActions, [tokenId]: remainingActions },
        }));


        // 7) Dado Certo (MULT igual ao antigo)
        const MULT = 4;

        // Extrai d20s se existir rawRolls, para estimar mods por dado
        const raw = Array.isArray((baseRoll as any).rawRolls)
            ? ((baseRoll as any).rawRolls as number[])
            : [];
        const somaD20sBase =
            raw.length >= usedActions
                ? raw.slice(0, usedActions).reduce((a, b) => a + b, 0)
                : raw.length > 0
                    ? raw.reduce((a, b) => a + b, 0)
                    : usedActions * 10;

        const totalBase = baseRoll.total;
        const modsTotaisAproximados = totalBase - somaD20sBase;
        const modsPorDado = usedActions > 0 ? modsTotaisAproximados / usedActions : 0;

        let displayRoll: RollResult = baseRoll;
        let attackTotalForHistory = baseRoll.total;
        let rawDamage = baseRoll.total;

        if (wasCertainty) {
            const forcedRaw = Array.from({ length: usedActions }, () => 20);
            const critTotalPorDado = MULT * (20 + modsPorDado);
            const critTotal = Math.round(critTotalPorDado * usedActions);

            displayRoll = {
                ...baseRoll,
                rawRolls: forcedRaw,
                total: critTotal,
            };

            attackTotalForHistory = critTotal;
            rawDamage = critTotal;

            // Consome 1 carga de Dado Certo do atacante
            this.context.setBoardTokens((prev) =>
                prev.map((t) =>
                    t.id === tokenId
                        ? { ...t, certaintyDiceRemaining: Math.max(0, (t.certaintyDiceRemaining ?? 0) - 1) }
                        : t
                )
            );
        }

        // 8) Atualiza histórico
        if (baseRoll.rawRolls[0] === 1) {
            this.context.setBattleState((prev) => ({
                ...prev,
                actionHistory: [
                    ...prev.actionHistory,
                    {
                        attribute: choice.attribute,
                        type: `${choice.type} | FALHA CRÍTICA!`,
                        rollResult: displayRoll,
                        attackerId: tokenId,
                        targetId: choice.targetId,
                        round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                ],
            }));
        }
        else {
            this.context.setBattleState((prev) => ({
                ...prev,
                actionHistory: [
                    ...prev.actionHistory,
                    {
                        attribute: choice.attribute,
                        type: wasCertainty ? `${choice.type} | DADO CERTO` : choice.type,
                        rollResult: displayRoll,
                        attackerId: tokenId,
                        targetId: choice.targetId,
                        round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                ],
            }));
        }


        // 9) Desconta mana do atacante somente após os registros (mantém ordem da função antiga)
        if (usedMana > 0) {
            this.context.setBoardTokens((prev) =>
                prev.map((t) =>
                    t.id === tokenId
                        ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedMana) }
                        : t
                )
            );
        }

        // 10) Agenda reações com o dano “travado” (fora de qualquer if de mana)
        const defenderParalysis = getParalysis(this.context, choice.targetId);
        if (defenderParalysis !== "none") {
            console.log("ESTADO DE PARALISIA DE UM TOKEN ESTÁ COMO: ", defenderParalysis);
        }

        // Lock de ação livre (sem reação) — consome se existir
        const lockKey = `${tokenId}->${choice.targetId}`;
        const hasLock = !!this.context.freeActionLock[lockKey];
        if (hasLock) {
            this.context.setFreeActionLock((prev) => {
                const cp = { ...prev };
                delete cp[lockKey];
                return cp;
            });
        }

        // Permissão por Paralisia/Paralisia Rápida
        const reactionPermittedByParalysis = canDefenderReact(usedMana, defenderParalysis);
        const isReactionAllowed = hasLock ? false : reactionPermittedByParalysis;

        // Apenas se permitido, ofereça Destreza/Consistência
        const reactions: PendingReaction[] = isReactionAllowed
            ? [
                { type: "destreza", targetToken: target },
                { type: "consistencia", targetToken: target },
            ]
            : [];


        const elementUsed = usedMana > 0 ? token.tokenPrimaryElement ?? "neutro" : "neutro"

        this.context.setPendingAttack({
            attackerId: tokenId,
            targetId: choice.targetId,
            rawDamage, // já crítico se Dado Certo
            attackRoll: attackTotalForHistory,
            usedMana: usedMana,
            attackAttribute: choice.attribute, // 'forca' | 'destreza' | ...
            pendingReactions: reactions,
            isReactionAllowed,
            isFreeAttack: hasLock || false,
            usedActions: usedActions,
            atackElement: elementUsed,
            usedItem: (choice.item === null ? undefined : choice.item),
        });

        // 11) Se não pode reagir, aplica dano e trata Paralisia já neste passo
        if (!isReactionAllowed) {
            this.applyTokenDamage(tokenId, choice.targetId, rawDamage);
            const currentParalysis = getParalysis(this.context, choice.targetId);
            const nextState = nextParalysisAfterHit(currentParalysis, usedMana, (this.context.remainingExtraActions.current?.extraActions ?? 0));
            if (nextState !== currentParalysis) {
                grantFreeActionNoReaction(this.context, tokenId, choice.targetId, nextState, 1)
            }

            this.context.setPendingAttack(null);
            this.context.setPendingEsquivaRoll(null);
            this.context.setIsInDefenseResolution(false);
            if (remainingActions <= 0) {
                console.warn("[HANDLE] Setando como pode passar o turno")
                this.context.setShouldAdvanceTurn(true);
            }
            return true;
        }

        // 12) Caso possa reagir, não faz mais nada aqui — o ReactionPrompt será exibido pelo JSX
        this.context.setSelectedTarget(null)
        return true;
    };

    public handleReaction = (
        reactionType: "consistencia" | "destreza" | "inteligencia" | "sabedoria" | "card",
        usedMana: number,
        usedActions: number,
        roll: RollResult,
        usedCertaintyDie: boolean
    ) => {

        if (!this.context.pendingAttack) return;
        if (this.context.battleState.status !== "In Battle") return;

        const attackerId = this.context.pendingAttack.attackerId;
        const defenderId = this.context.pendingAttack.targetId;

        const attackerToken = this.context.boardTokens.find(t => t.id === attackerId);
        const defenderToken = this.context.boardTokens.find(t => t.id === defenderId);
        const defender = this.context.boardTokens.find((t) => t.id === defenderId);

        if (!defender) return;

        if (reactionType === "card" && defenderToken) {
            console.debug("Chegando aqui: ", defenderToken.name)
            this.handleDefenseCardResolution(defenderToken);
            this.handleEndReaction();
            return;
        }

        // Saneamento de custos do defensor
        const availableActionsDef = this.context.battleState.accumulatedActions[defenderId] ?? 1;
        const usedActionsClamped = Math.max(1, Math.min(usedActions ?? 1, availableActionsDef));
        const usedManaClamped = Math.min(usedMana ?? 0, defender.currentMana ?? 0);

        // Consome mana do defensor (se houver)
        if (usedManaClamped > 0) {
            this.context.setBoardTokens((prev) =>
                prev.map((t) =>
                    t.id === defenderId
                        ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedManaClamped) }
                        : t
                )
            );
        }

        // Marca que o defensor agiu
        this.context.setDidActThisTurn((prev) => ({ ...prev, [defenderId]: true }));

        // Atualiza ações do defensor (TA padrão: gastar exatamente usedActionsClamped)
        const currentActionsDef = this.context.battleState.accumulatedActions[defenderId] ?? 1;
        const remainingActionsDef = Math.max(0, currentActionsDef - usedActionsClamped);
        this.context.setBattleState((prev) => ({
            ...prev,
            accumulatedActions: {
                ...prev.accumulatedActions,
                [defenderId]: remainingActionsDef,
            },
        }));

        // Caso especial: Dado Certo na reação → imunidade imediata
        if (usedCertaintyDie) {
            console.log("🟣 ENTROU NO USO DO DADO CERTO");

            // Consome 1 carga de Dado Certo do defensor
            this.context.setBoardTokens((prev) =>
                prev.map((t) =>
                    t.id === defenderId
                        ? {
                            ...t,
                            certaintyDiceRemaining: Math.max(0, (t.certaintyDiceRemaining ?? 0) - 1),
                        }
                        : t
                )
            );

            // Apenas para exibição no histórico: replicar a mesma estética de "dados travados"
            // Força Q dados a 20 e monta total crítico visual.
            const Q = usedActionsClamped;
            const MULT = 4;

            // Heurística para separar mods do roll do defensor, se necessário
            const raw = Array.isArray((roll as any).rawRolls)
                ? ((roll as any).rawRolls as number[])
                : [];
            const somaD20sBase =
                raw.length >= Q
                    ? raw.slice(0, Q).reduce((a, b) => a + b, 0)
                    : raw.length > 0
                        ? raw.reduce((a, b) => a + b, 0)
                        : Q * 10; // aproximação (apenas para extrair mods)
            const totalBase = roll.total;
            const modsTotaisAproximados = totalBase - somaD20sBase;
            const modsPorDado = Q > 0 ? modsTotaisAproximados / Q : 0;

            const forcedRaw = Array.from({ length: Q }, () => 20);
            const critTotalPorDado = MULT * (20 + modsPorDado);
            const critTotal = Math.round(critTotalPorDado * Q);

            const displayRoll: RollResult = {
                ...roll,
                rawRolls: forcedRaw,
                total: critTotal,
            };

            // Histórico da reação com Dado Certo
            this.context.setBattleState((prev) => ({
                ...prev,
                actionHistory: [
                    ...prev.actionHistory,
                    {
                        attribute: reactionType,
                        type:
                            reactionType === "destreza"
                                ? "Reação - Esquiva (Dado Certo)"
                                : "Reação - Defesa (Dado Certo)",
                        rollResult: displayRoll,
                        attackerId: defenderId,
                        targetId: attackerId,
                        round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                ],
            }));


            this.handleEndReaction()

            // Avança o turno do atacante se ele já não tiver ações
            const attackerActions = this.context.battleState.accumulatedActions[attackerId] ?? 1;
            console.log("ATACCKER ID: ", attackerActions);
            if (attackerActions <= 0) this.context.setShouldAdvanceTurn(true);
            return;
        }

        if (reactionType === "inteligencia" && this.context.pendingAttack.attackAttribute === "inteligencia") {
            if (!this.context.pendingAttack) return;

            if (this.context.pendingAttack.attackRoll > roll.total) {
                defineRemainingPrevisionAttacks(this.context, attackerId, defenderId, 1);
            }

            this.context.setBattleState((prev) => ({
                ...prev,
                actionHistory: [
                    ...prev.actionHistory,
                    {
                        attribute: "inteligencia",
                        type: "Reação - Prever",
                        rollResult: roll,
                        attackerId: defenderId,
                        targetId: attackerId,
                        round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                ],
            }));

            this.handleEndReaction()

            const attackerActions = this.context.battleState.accumulatedActions[attackerId] ?? 1;
            console.log("ATACCKER ID: ", attackerActions);
            if (attackerActions <= 0) this.context.setShouldAdvanceTurn(true);

            return;
        }

        if (reactionType === "sabedoria" && this.context.pendingAttack.attackAttribute === "sabedoria") {
            if (roll.total > this.context.pendingAttack.attackRoll) {
                this.context.setBattleState((prev) => ({
                    ...prev,
                    accumulatedActions: { ...prev.accumulatedActions, [defenderId]: Math.min(5, this.context.battleState.accumulatedActions[defenderId] + this.context.battleState.accumulatedActions[attackerId]) },
                }));
                this.context.setBattleState((prev) => ({
                    ...prev,
                    accumulatedActions: { ...prev.accumulatedActions, [attackerId]: 1 },
                }));
                const token = this.context.boardTokens.find(t => t.id === defenderId);
                const targetToken = this.context.boardTokens.find(t => t.id === attackerId);

                if (!token || !targetToken) {
                    console.warn("Token ou targetToken não encontrado");
                    return;
                }

                if (isInAttackRange(token, targetToken, 'fisico')) {
                    grantFreeActionNoReaction(this.context, defenderId, attackerId, "paralisia", 1);
                }

            }
            else if (roll.total < this.context.pendingAttack.attackRoll) {
                this.context.setBattleState((prev) => ({
                    ...prev,
                    accumulatedActions: { ...prev.accumulatedActions, [attackerId]: Math.min(5, this.context.battleState.accumulatedActions[defenderId] + this.context.battleState.accumulatedActions[attackerId]) },
                }));
                this.context.setBattleState((prev) => ({
                    ...prev,
                    accumulatedActions: { ...prev.accumulatedActions, [defenderId]: 1 },
                }));

                const token = this.context.boardTokens.find(t => t.id === attackerId);
                const targetToken = this.context.boardTokens.find(t => t.id === defenderId);

                if (!token || !targetToken) {
                    console.warn("Token ou targetToken não encontrado");
                    return; // interrompe para evitar erro
                }

                if (isInAttackRange(token, targetToken, 'fisico')) {
                    grantFreeActionNoReaction(this.context, defenderId, attackerId, "paralisia", 1);
                }
            }

            this.context.setBattleState((prev) => ({
                ...prev,
                actionHistory: [
                    ...prev.actionHistory,
                    {
                        attribute: "sabedoria",
                        type: "Reação - Desnortear",
                        rollResult: roll,
                        attackerId: defenderId,
                        targetId: attackerId,
                        round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                ],
            }));
            this.handleEndReaction()

            const attackerActions = this.context.battleState.accumulatedActions[attackerId] ?? 1;
            if (attackerActions <= 0) this.context.setShouldAdvanceTurn(true);

            return;
        }

        if (reactionType === "destreza" && this.context.pendingAttack.attackAttribute === "destreza") {
            if (!this.context.pendingAttack) return;

            if (roll.total > this.context.pendingAttack.attackRoll) {
                grantFreeActionNoReaction(this.context, defenderId, attackerId, "paralisia", 1);
            }
            else if (roll.total < this.context.pendingAttack.attackRoll) {
                grantFreeActionNoReaction(this.context, defenderId, attackerId, "paralisia", 3);
            }

            this.context.setBattleState((prev) => ({
                ...prev,
                actionHistory: [
                    ...prev.actionHistory,
                    {
                        attribute: "destreza",
                        type: "Reação - Surpreender",
                        rollResult: roll,
                        attackerId: defenderId,
                        targetId: attackerId,
                        round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                ],
            }));

            this.handleEndReaction()
        }
        else if (reactionType === "destreza") {
            // Esquiva binária: guarda rolagem do defensor e vai para resolução com rolagem de definição do atacante
            this.context.setPendingEsquivaRoll(roll);

            this.context.setPrevReaction(prev => ({
                ...prev,
                [defenderId]: "destreza"
            }));

            this.context.setBattleState((prev) => ({
                ...prev,
                actionHistory: [
                    ...prev.actionHistory,
                    {
                        attribute: "destreza",
                        type: "Reação - Esquiva",
                        rollResult: roll,
                        attackerId: defenderId,
                        targetId: attackerId,
                        round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                ],
            }));

            // Ativa UI de resolução (definição do atacante)
            this.context.setIsInDefenseResolution(true);
            return;
        }

        // Defesa por consistência: reduz o dano do ataque atual e aplica restante
        if (reactionType === "consistencia") {


            if (this.context.pendingAttack && this.context.pendingAttack.attackAttribute === 'forca' && roll.total > this.context.pendingAttack.attackRoll) {
                grantFreeActionNoReaction(this.context, defenderId, attackerId, "paralisia", 1);
            }
            if (!this.context.pendingAttack) return;
            const pendingAttack = this.context.pendingAttack;

            this.context.setPrevReaction(prev => ({
                ...prev,
                [defenderId]: "consistencia"
            }));

            const reduction = Math.max(0, roll.total);
            const mitigatedRoll = Math.max(0, pendingAttack.attackRoll - reduction);
            const finalDamage = Math.max(0, Math.min(pendingAttack.rawDamage, mitigatedRoll));

            // Histórico da defesa
            this.context.setBattleState((prev) => ({
                ...prev,
                actionHistory: [
                    ...prev.actionHistory,
                    {
                        attribute: "consistencia",
                        type: "Reação - Defesa",
                        rollResult: roll,
                        attackerId: defenderId,
                        targetId: attackerId,
                        round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                ],
            }));

            // Aplica dano restante no defensor
            if (finalDamage > 0) {


                const intesityCalculus = Math.ceil(((attackerToken?.attributes.level ?? 1) - 10) / 4 + 4);

                if (defenderToken) applyTokenEffect(this.context, defenderToken, pendingAttack.atackElement, elementToEffect[pendingAttack.atackElement], 8, intesityCalculus, "InTurn");

                spawnItemVFX(attackerId, defenderId, (pendingAttack.usedItem === null ? undefined : pendingAttack.usedItem), this.context.boardTokens, this.context.setBoardVfxElements, playSomeSFX)
                playSomeSFX("public/sfx/impact.mp3");
                this.applyTokenDamage(attackerId, defenderId, finalDamage)

                if (pendingAttack.usedMana > 0) {
                    grantFreeActionNoReaction(this.context, attackerId, defenderId, "paralisia_rapida", 1);
                }
            }

            // Limpeza do ataque corrente
            this.handleEndReaction()

            // Avança turno do atacante se sem ações
            const attackerActions = this.context.battleState.accumulatedActions[attackerId] ?? 1;
            const isDefensesEqualAtack = pendingAttack.rawDamage === reduction;
            if (attackerActions <= 0 && (this.context.remainingExtraActions.current?.extraActions ?? 0) <= 0 && (isDefensesEqualAtack || pendingAttack.usedMana === 0)) {
                this.context.setShouldAdvanceTurn(true);
            }

            return;
        }
    };

    public handleNextTurn = (isVoluntaryPass: boolean = false) => {
        console.log("-----------------------------------------------------------------------------------------------");
        console.warn("[HANDLE] Entrou no handleNextTurn");
        const liveBattleState = this.context.battleStateRef.current;
        const liveBoardTokens = this.context.boardTokensRef.current;

        // Já está avançando? Evita reentrância
        if (this.context.isAdvancingTurnRef.current) {
            console.log("🚫 BLOQUEADO, JÁ ESTÁ AVANÇANDO");
            return;
        }

        // Só funciona em batalha
        if (liveBattleState.status !== "In Battle") {
            console.log("⚠️ NOT IN BATTLE, ABORDANDO");
            return;
        }

        // Não pode avançar com resolução pendente
        if (this.context.pendingAttackRef.current ||this.context.isInDefenseResolution || this.context.pendingEsquivaRoll != null) {
            console.warn("[HANDLE] Há resolução de ataque/defesa pendente, abortando");
            return;
        }

        const currentIdx = liveBattleState.currentTurnIndex;
        const currentTokenId = liveBattleState.turnOrder[currentIdx]?.tokenId;

        reduceTimeToRecharge(this.context, currentTokenId);

        // battleState.accumulatedActions[ battleState.turnOrder[battleState.currentTurnIndex]?.tokenId;] ?? 1

        if (!currentTokenId) {
            console.log("⚠️ Sem tokenId atual, abortando");
            return;
        }

        const tokenName = liveBoardTokens.find(t => t.id === currentTokenId)?.name ?? "Desconhecido";
        console.warn("[HANDLE] FINALIZANDO TURNO DE:", tokenName);
        

        // Se não é passe voluntário e ainda há ações, não pode auto-passar
        const currentActions = liveBattleState.accumulatedActions[currentTokenId] ?? 1;
        if (!isVoluntaryPass && currentActions > 0 && !(this.context.lastAllUsedResponse[currentTokenId] ?? false)) {
            console.error("[HANDLE]🚫 BLOQUEADO, AINDA RESTAM AÇÕES");
            return;
        }

        console.log("REMAINING EXTRA ACTIONS: ", (this.context.remainingExtraActions.current?.extraActions));
        console.log("PEDDING ATACK: ", this.context.pendingAttackRef.current);
        console.log("PEDDING FREE RESPONSE: ", this.context.pendingFreeResponse);
        if (!this.context.pendingAttackRef.current && !this.context.pendingFreeResponse && !((this.context.remainingExtraActions.current?.extraActions ?? 0) > 0)) {
            console.log("ESTÁ ENTRANDO NESSA CONDIÇÂO BIZARRA!");
        }
        // Inicia trava
        this.context.isAdvancingTurnRef.current = true;
        console.error("[HANDLE] handleNextTurn INICIADO");

        try {

            const actedNow = !!this.context.didActThisTurn[currentTokenId];
            const movedNow = !!this.context.movedThisTurn[currentTokenId];

            // Snapshot do turno que está encerrando
            this.context.setLastTurnActed(prev => ({ ...prev, [currentTokenId]: actedNow }));
            this.context.setLastTurnMoved(prev => ({ ...prev, [currentTokenId]: movedNow }));

            const nextIdx = (currentIdx + 1) % liveBattleState.turnOrder.length;
            const nextTokenId = liveBattleState.turnOrder[nextIdx]?.tokenId;
            decreaseCardEntityDuration(this.context, nextTokenId)
            const nextTokenName = liveBoardTokens.find(t => t.id === nextTokenId)?.name ?? "Desconhecido";
            const nextToken = liveBoardTokens.find(t => t.id === nextTokenId);
            console.log(`➡️ AVANÇANDO: idx ${currentIdx} -> ${nextIdx} | Próximo: ${nextTokenName}`);

            // Atualiza estado de batalha: índice, round e aplica efeitos de turno
            this.context.setBattleState(prev => {
                // Evita condição de corrida: garante que ainda estamos no mesmo índice
                if (prev.currentTurnIndex !== currentIdx) {
                    console.log("⚠️ ESTADO JÁ FOI ATUALIZADO POR OUTRO FLUXO, IGNORANDO ESTA ETAPA.");
                    return prev;
                }

                const shouldIncrementRound = nextIdx === 0;
                const newRound = shouldIncrementRound ? prev.round + 1 : prev.round;
                const newTurnVersion = prev.turnVersion + 1;
                const updated: BattleState = {
                    ...prev,
                    currentTurnIndex: nextIdx,
                    currentActorId: nextTokenId || null,
                    round: newRound,
                    turnVersion: newTurnVersion,
                };

                if (nextToken) {
                    if (!nextToken.tokenEffects || nextToken.tokenEffects.length === 0) {
                        console.log(`Token ${nextToken.id} não possui efeitos.`);
                    } else {
                        console.log(`Efeitos do token '${nextToken.id}':`);
                        nextToken.tokenEffects.forEach((e, i) => {
                            console.log(
                                `#${i + 1} | Tipo: ${e.effectType} | Duração: ${e.duration} | Intensidade: ${e.intensity}`
                            );
                        });
                    }

                    applyEffectsCausality(nextToken, this.context);
                    stepTokenEffect(this.context, nextToken);

                };
                applyCardEntityEffect(this.context)
                return processTurnEffects(updated, liveBoardTokens);
            });

            // Marca a posição inicial do PRÓXIMO token para rastrear movimento dentro do turno
            if (nextTokenId) {
                this.context.setDidActThisTurn(prev => ({ ...prev, [nextTokenId]: false }));
                this.context.setMovedThisTurn(prev => ({ ...prev, [nextTokenId]: false }));
                this.context.setBoardTokens(prev =>
                    prev.map(t =>
                        t.id === nextTokenId
                            ? { ...t, startPosition: { ...t.position } }
                            : t
                    )
                );
            }

            console.log("✅ handleNextTurn CONCLUÍDO");
        } finally {
            this.context.isAdvancingTurnRef.current = false;
            console.log("🔓 LOCK LIBERADO");
        }
    };

    public handleDefenseResolution = (
        usedActions: number,
        definicaoRoll: RollResult,
        usedMana: number
    ) => {
        // Precisa haver ataque e rolagem de esquiva armazenada
        if (!this.context.pendingAttack || this.context.pendingEsquivaRoll == null) return;
        if (this.context.battleState.status !== "In Battle") return;

        const attackerId = this.context.pendingAttack.attackerId;
        const defenderId = this.context.pendingAttack.targetId;

        const attackerToken = this.context.boardTokens.find(t => t.id === attackerId);
        const defenderToken = this.context.boardTokens.find(t => t.id === defenderId);

        // Leitura das rolagens
        const defenderEsquiva = this.context.pendingEsquivaRoll?.total ?? 0;
        const atacanteDefinicao = definicaoRoll.total;

        // TA-1 aplicado ao ATACANTE: consome (usedActions - 1), nunca negativo
        const totalActionsToDecrement = Math.max(0, (usedActions ?? 0) - 1);

        // Leia o saldo real
        const currentActionsAttacker = this.context.battleState.accumulatedActions[attackerId] ?? 0;
        const remainingActionsAttacker = Math.max(
            0,
            currentActionsAttacker - totalActionsToDecrement
        );

        // Marque o atacante como tendo agido
        this.context.setDidActThisTurn((prev) => ({ ...prev, [attackerId]: true }));

        // Desconta mana do atacante usada na definição (validada)
        const attackerMana = this.context.boardTokens.find((t) => t.id === attackerId)?.currentMana ?? 0;
        const validatedUsedMana = Math.min(usedMana ?? 0, attackerMana);
        if (validatedUsedMana > 0) {
            this.context.setBoardTokens((prev) =>
                prev.map((t) =>
                    t.id === attackerId
                        ? {
                            ...t,
                            currentMana: Math.max(0, (t.currentMana ?? 0) - validatedUsedMana),
                        }
                        : t
                )
            );
        }

        // Atualize accumulatedActions do atacante apenas se mudou
        if (remainingActionsAttacker !== currentActionsAttacker) {
            this.context.setBattleState((prev) => ({
                ...prev,
                accumulatedActions: {
                    ...prev.accumulatedActions,
                    [attackerId]: remainingActionsAttacker,
                },
            }));
        }

        // Resultado binário: esquiva tem sucesso se a esquiva do defensor for >= definição do atacante
        const esquivaSuccessful = defenderEsquiva >= atacanteDefinicao;

        if (esquivaSuccessful) {
            grantFreeActionNoReaction(this.context, defenderId, attackerId, "paralisia", 1);
        }

        const finalDamage = esquivaSuccessful ? 0 : this.context.pendingAttack.rawDamage;

        // Aplica dano no defensor quando houver
        if (finalDamage > 0) {


            const intesityCalculus = Math.ceil(((attackerToken?.attributes.level ?? 1) - 10) / 4 + 4);

            if (defenderToken) applyTokenEffect(this.context, defenderToken, this.context.pendingAttack.atackElement, elementToEffect[this.context.pendingAttack.atackElement], 8, intesityCalculus, "InTurn");
            spawnItemVFX(attackerId, defenderId, this.context.pendingAttack.usedItem, this.context.boardTokens, this.context.setBoardVfxElements, playSomeSFX);
            playSomeSFX("public/sfx/impact.mp3");
            this.applyTokenDamage(attackerId, defenderId, finalDamage)
        }


        if (finalDamage > 0 && this.context.pendingAttack) {
            const current = getParalysis(this.context, defenderId);
            const nextState = nextParalysisAfterHit(current, this.context.pendingAttack.usedMana, (this.context.remainingExtraActions.current?.extraActions ?? 0));
            if (nextState !== current) {
                grantFreeActionNoReaction(this.context, attackerId, defenderId, nextState, 1);
            }
        }

        // Registra histórico da resolução
        this.context.setBattleState((prev) => ({
            ...prev,
            actionHistory: [
                ...prev.actionHistory,
                {
                    attribute: "destreza",
                    type: "Resolução de Esquiva",
                    rollResult: definicaoRoll,
                    attackerId: this.context.pendingAttack?.attackerId,
                    targetId: this.context.pendingAttack?.targetId,
                    round: prev.round,
                } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
            ],
        }));

        // Limpeza do estado de resolução
        this.context.setPendingEsquivaRoll(null);
        this.context.setPendingAttack(null);
        this.context.setIsInDefenseResolution(false);

    };

    public handleExecuteResponseAction = (attackerId: string, forcedTargetId: string, choice: ExecuteChoice): boolean => {

        if (this.context.battleState.status !== "In Battle") return false;

        const token = this.context.boardTokens.find((t) => t.id === attackerId);
        const target = this.context.boardTokens.find((t) => t.id === forcedTargetId);

        if (!token || !target) return false;

        console.error("[HANDLE] Entrou em handleExecuteResponseAction, mas ele ainda não tem validações internas.");

        const coercedChoice = { ...choice, targetId: forcedTargetId };


        const isPhysicalAttack = ["forca", "destreza"].includes(coercedChoice.attribute);
        const attackType = isPhysicalAttack ? "fisico" : "magico";
        if (!isInAttackRange(token, target, attackType)) {

            return false;
        }

        console.error("[HANDLE] Entrou em handleExecuteResponseAction.");
        // 2) Saneamento
        const usedMana = Math.min(coercedChoice.usedMana ?? 0, token.currentMana ?? 0);
        const usedActions = Math.max(1, Math.min(coercedChoice.usedActions ?? 1, this.context.battleState.accumulatedActions[attackerId] ?? 1));
        const wasCertainty = !!coercedChoice.usedCertaintyDie;

        // 3) Proficiência
        const proficiencyBonus = token.proficiencies[coercedChoice.attribute]
            ? Math.ceil((token.attributes.level - 10) / 4 + 4)
            : 0;


        const elementalPos = (choice.attribute === "forca" && target.tokenPrimaryDisvantege === token.tokenPrimaryElement && usedMana > 0) ? 2 * (this.context.prevReaction[attackerId] === "destreza" ? 2 : 1) : this.context.prevReaction[attackerId] === "destreza" ? 2 : 1;
        const attrPos = this.searchTokenPosition(token.id, choice.attribute)


        const respectiveAtribute = choice.attribute;
        const selectedItem = choice.item;
        const itemOcasionalAdd = selectedItem?.ocasionalAdd;

        const itemCoerentAdd = respectiveAtribute === selectedItem?.atributeToOcasionalAdd ? itemOcasionalAdd : 0;
        const params = {
            tokenId: attackerId,
            Q: usedActions,
            P: finalPos(elementalPos, attrPos),
            A: token.attributes[coercedChoice.attribute],
            PF: proficiencyBonus,
            O: token.ocassionalAddition[choice.attribute] + (itemCoerentAdd ?? 0),
            N:
                coercedChoice.attribute === "forca" || coercedChoice.attribute === "sabedoria"
                    ? 0
                    : token.proficiencies[coercedChoice.attribute]
                        ? 1
                        : 0,
            L: token.attributes.level,
            M: usedMana,
            certainty: wasCertainty,
            attribute: coercedChoice.attribute,
        };

        const baseRoll = calculateActionRoll(params) as RollResult;

        const currentActions = this.context.battleState.accumulatedActions[attackerId] ?? 1;
        const remainingActions = Math.max(0, (currentActions) - usedActions);

        this.context.setBattleState((prev) => ({
            ...prev,
            accumulatedActions: { ...prev.accumulatedActions, [attackerId]: remainingActions },
        }));


        const otherCurrentActions = (this.context.battleState.accumulatedActions[attackerId] ?? 0) - usedActions;
        console.log("AÇÕES ACUMULADAS: ", (this.context.battleState.accumulatedActions[attackerId] ?? 0) - usedActions);
        this.context.remainingExtraActions.current = { attackerId: attackerId, extraActions: Math.max(0, otherCurrentActions > 0 ? (this.context.remainingExtraActions.current?.extraActions ?? 1) - 1 : 0) };
        console.log("REMAINING EXTRA ACTIONS: ", (this.context.remainingExtraActions.current?.extraActions));

        // 6) Dado Certo: mesmo tratamento do handleExecuteAction
        const raw = Array.isArray((baseRoll as any).rawRolls) ? ((baseRoll as any).rawRolls as number[]) : [];
        const somaD20sBase = raw.length >= usedActions
            ? raw.slice(0, usedActions).reduce((a, b) => a + b, 0)
            : raw.length > 0 ? raw.reduce((a, b) => a + b, 0) : usedActions * 10;
        const totalBase = baseRoll.total;
        const modsTotaisAproximados = totalBase - somaD20sBase;
        const modsPorDado = usedActions > 0 ? modsTotaisAproximados / usedActions : 0;

        let displayRoll: RollResult = baseRoll;
        let attackTotalForHistory = baseRoll.total;
        let rawDamage = baseRoll.total;

        if (wasCertainty) {
            const forcedRaw = Array.from({ length: usedActions }, () => 20);
            const MULT = 4;
            const critTotalPorDado = MULT * (20 + modsPorDado);
            const critTotal = Math.round(critTotalPorDado * usedActions);
            displayRoll = { ...baseRoll, rawRolls: forcedRaw, total: critTotal };
            attackTotalForHistory = critTotal;
            rawDamage = critTotal;

            this.context.setBoardTokens((prev) =>
                prev.map((t) =>
                    t.id === attackerId ? { ...t, certaintyDiceRemaining: Math.max(0, (t.certaintyDiceRemaining ?? 0) - 1) } : t
                )
            );
        }

        // 7) Histórico
        this.context.setBattleState((prev) => ({
            ...prev,
            actionHistory: [
                ...prev.actionHistory,
                {
                    attribute: coercedChoice.attribute,
                    type: wasCertainty ? `${coercedChoice.type} (Dado Certo)` : coercedChoice.type,
                    rollResult: displayRoll,
                    attackerId,
                    targetId: forcedTargetId,
                    round: prev.round,
                } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
            ],
        }));

        // 8) Desconta mana do responder
        if (usedMana > 0) {
            this.context.setBoardTokens((prev) =>
                prev.map((t) =>
                    t.id === attackerId ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedMana) } : t
                )
            );
        }

        // 9) Consumir lock e bloquear reação
        const lockKey = `${attackerId}->${forcedTargetId}`;
        const hasLock = !!this.context.freeActionLock[lockKey];
        if (hasLock) {
            this.context.setFreeActionLock((prev) => {
                const cp = { ...prev };
                delete cp[lockKey];
                return cp;
            });
        }

        const defenderParalysis = getParalysis(this.context, forcedTargetId);
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

        const elementUsed = usedMana > 0 ? token.tokenPrimaryElement ?? "neutro" : "neutro";
        this.context.setPendingAttack({
            attackerId,
            targetId: forcedTargetId,
            rawDamage,
            attackRoll: attackTotalForHistory,
            usedMana,
            attackAttribute: coercedChoice.attribute,
            pendingReactions: reactions,
            isReactionAllowed,
            isFreeAttack: hasLock || false,
            usedActions: usedActions,
            atackElement: elementUsed
        });

        const currentParalysis = getParalysis(this.context, forcedTargetId);
        const nextState = nextParalysisAfterHit(currentParalysis, usedMana, (this.context.remainingExtraActions.current.extraActions ?? 0));
        console.log("QUAL PRÓXIMO ESTADO DE PARALISIA?: ", nextState);
        console.log("CALCULANDO ESSE MALDITO REMAINING ACTIONS: ", this.context.remainingExtraActions.current.extraActions);
        console.log("QUANTO QUE TÁ O BENDITO ACCUMULATED ACTIONS HEIN?: ", this.context.battleState.accumulatedActions[attackerId]);

        if (nextState === "paralisia_rapida" && (this.context.remainingExtraActions.current.extraActions ?? 0) <= 0) {
            grantFreeActionNoReaction(this.context, attackerId, forcedTargetId, nextState, 1);
        }


        if (!isReactionAllowed) {
            // Aplica dano direto + progressão de paralisia
            spawnItemVFX(attackerId, forcedTargetId, this.context.pendingAttack?.usedItem, this.context.boardTokens, this.context.setBoardVfxElements, playSomeSFX);
            playSomeSFX("public/sfx/impact.mp3");
            this.applyTokenDamage(attackerId, forcedTargetId, rawDamage);

            if (rawDamage > 0) {

                const intesityCalculus = Math.ceil(((token?.attributes.level ?? 1) - 10) / 4 + 4);
                if (target && usedMana > 0) applyTokenEffect(this.context, target, token.tokenPrimaryElement ?? "neutro", elementToEffect[token.tokenPrimaryElement ?? "neutro"], 8, intesityCalculus, "InTurn");

            }

            if (nextState !== currentParalysis) {
                setParalysis(this.context, forcedTargetId, nextState);
            }

            const allowedNextAtackFlag = nextState === "paralisia_rapida" || nextState === "paralisia";
            this.context.setPostParalyse({ responderId: attackerId, forcedId: forcedTargetId, allowedPostAtack: allowedNextAtackFlag });

            this.context.setPendingAttack(null);
            this.context.setPendingEsquivaRoll(null);
            this.context.setIsInDefenseResolution(false);

            if (!allowedNextAtackFlag) {
                this.context.setPostParalyse(null);
                setParalysis(this.context, forcedTargetId, 'none');
            }
            else {
                setParalysis(this.context, forcedTargetId, nextState);
            }

            const lockKey = `${attackerId}->${forcedTargetId}`;
            const hasLock = !!this.context.freeActionLock[lockKey];
            if (hasLock) {
                this.context.setFreeActionLock((prev) => {
                    const cp = { ...prev };
                    delete cp[lockKey];
                    return cp;
                });
            }

            if ((this.context.remainingExtraActions.current.extraActions ?? 0) <= 0) {
                console.log("> ENTROU NA FORÇAGEM DE PASSAR O TURNO");
                this.context.setLastAllUsedResponse(prev => ({
                    ...prev,
                    [attackerId]: true,
                    [forcedTargetId]: true
                }));
                this.context.setShouldAdvanceTurn(true);
                this.context.setPendingFreeResponse(null);
            }
            else if (this.context.battleState.accumulatedActions[forcedTargetId] === 0 && nextState === 'none') {
                this.context.setShouldAdvanceTurn(true);
                this.context.setPendingFreeResponse(null);
            }

            console.error("[HANDLE] Saindo de handleExecuteResponseAction pelo caminho de 'reação não permitida'.");
            return true;
        }
        else {
            console.warn("ENTROU AQUI!");
            this.context.remainingExtraActions.current = null;
            this.context.setPendingFreeResponse(null);
            setParalysis(this.context, forcedTargetId, "none");
            console.error("[HANDLE] Saindo de handleExecuteResponseAction pelo caminho de 'reação permitida'.");
        }

        return true;

    };

    public handleEndBattle = () => {

        this.context.setBattleState({
            status: "Not in Battle",
            round: 0,
            turnOrder: [],
            currentTurnIndex: 0,
            currentActorId: null,
            phase: "Initiative",
            locks: {
                aiActing: false,
                reallocating: false,
                resolvingAction: false
            },
            accumulatedActions: {},
            activeEffects: {},
            actionHistory: [],
            isReallocatingTurns: false,
            isAIActing: false,
            turnVersion: 0,
        });

        console.warn("[BATTLE START STATE]", {
            battleState: this.context.battleState,
            pendingAttack: this.context.pendingAttack,
            pendingFreeResponse: this.context.pendingFreeResponse,
            pendingEsquivaRoll: this.context.pendingEsquivaRoll,
            aiTurnToken: false,
        });

        this.context.setBoardTokens((prev) =>
            prev.map((t) => ({
                ...t,
                currentLife: undefined,
                maxLife: undefined,
                currentMana: undefined,
                maxMana: undefined,
                startPosition: undefined,
            }))
        );
        // Ao finalizar a batalha:
        this.context.setBoardTokens(prev =>
            prev.map(t => {
                const { certaintyDiceRemaining, ...rest } = t as any;
                return rest; // remove o campo de runtime
            })
        );

        this.context.setBoardTokens(prev =>
            prev.map(t => ({
                ...t,
                tokenEffects: [] // zera os efeitos
            }))
        );

        this.context.setBoardTokens(prev =>
            prev.map(t => ({
                ...t,
                ocassionalAddition: {
                    forca: 0,
                    destreza: 0,
                    consistencia: 0,
                    inteligencia: 0,
                    sabedoria: 0,
                    carisma: 0,
                },
            }))
        );

        this.context.setPendingAttack(null);
        this.context.setMovedThisTurn({});
        this.context.setFreeActionLock({});
        this.context.setTokenParalysis({});
        this.context.setLastAllUsedResponse({});
        this.context.setPostParalyse(null);
        this.context.setPendingFreeResponse(null);
        this.context.setIsInDefenseResolution(false);

        this.context.remainingExtraActions.current = null;
        this.context.remainingPrevisionAttacks.current = {};
        this.context.cardsNotRechargeds.current = {};
        this.context.timeToRechargeCard.current = {};

        this.context.totalActionsReturn.current = 0;
        this.context.hasEnteredFirstTurnRef.current = {}; // ⬅️ Limpar ref
        this.context.remainingExtraActions.current = null; // Reset das ações extras no fim do turno
        this.context.maxSelectablePivots.current = 0;
        this.context.setAIUnlock();
        this.context.aiTurnTokenRef.current = null;

        // Cancela qualquer fase da IA em andamento (setTimeout de 500ms pendente).
        // Sem isso, a IA pode disparar executeAITurn/executeAIReaction DEPOIS que
        // handleEndBattle rodou, corrompendo o estado inicial da próxima batalha.
        if (this.context.aiPhaseCleanup.current) {
            this.context.aiPhaseCleanup.current();
            this.context.aiPhaseCleanup.current = null;
        }
        // Zera o mutex síncrono junto com o reset do estado.
        this.context.isAIActingRef.current = false;
        this.context.aiStateMachine.current.transition(AICombatPhase.IDLE);

        this.context.setInCardSelection(false);
        this.context.setPendingCardResolution(null);
        this.context.setTokensInOffensiveCard([]);
        this.context.setOffensiveCardScore(null);
        this.context.setOffensiveCardTestScore(null);
        this.context.setTokensBattlePosition({});
        this.context.setOffensivePendingCard(undefined);
        this.context.setCardEntities([]);
        this.context.setArmedCard(undefined);
        this.context.setIsAmbientPivotSelection(false);
        this.context.setSelectedPivots([]);
        this.context.setPreviewCells(new Set());
        this.context.setIsAIThinking(false);
        this.context.setShouldAdvanceTurn(false);
        this.context.setInDefenseCardResolution(false);
        this.context.setInTargetSelection(false);
        this.context.setSelectedTarget(null)
    };

}
