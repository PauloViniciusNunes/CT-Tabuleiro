import { Prisma, type Token, type TokenInstance } from "@prisma/client";

import { TokenRepository } from "@/modules/tokens/repositories/TokenRepository";
import { TokenTransformationService } from "@/modules/tokens/services/TokenTransformationService";
import { reconcileEquippedItemPassives } from "../utils/itemPassiveMechanics";
import { initializeBattleStats } from "../utils/calculations";
import { syncBattleState } from "../utils/syncBattleState";
import { reconcileTokenPassives } from "../utils/tokenPassiveMechanics";
import { parseTransformationStates } from "../transformation/types";
import type { MechanicInstance } from "../mechanic/mechanics/MechanicInstance";
import { BattleEngineService } from "./BattleEngineService";

export type TransformationCommand = {
    battleId: string;
    requestId: string;
    action: "submit" | "cancel";
    templateId?: string;
};

function scaleResource(current: number, sourceMax: number, targetMax: number): number {
    if (current <= 0 || targetMax <= 0) return 0;
    if (sourceMax <= 0) return Math.max(1, targetMax);
    return Math.min(targetMax, Math.max(1, Math.ceil(current * targetMax / sourceMax)));
}

function snapshotData(
    source: TokenInstance,
    target: Token,
): Prisma.TokenInstanceUpdateInput {
    const initializedTarget = initializeBattleStats(target);
    const targetMaxLife = Math.max(1, initializedTarget.maxLife);
    const targetMaxMana = Math.max(0, initializedTarget.maxMana);

    return {
        templateTokenId: target.id,
        isTransformation: target.isTransformation,
        baseTokenId: target.baseTokenId,
        inheritBaseCards: target.inheritBaseCards,
        attributeMultipliers: target.attributeMultipliers as Prisma.InputJsonValue,
        additionalCards: target.additionalCards as Prisma.InputJsonValue,
        additionalMechanics: target.additionalMechanics,
        additionalDisadvantages: target.additionalDisadvantages,
        additionalPassiveMechanics: target.additionalPassiveMechanics,
        transformationDurationMode: target.transformationDurationMode,
        transformationDurationRounds: target.transformationDurationRounds,
        transformationRecharge: target.transformationRecharge,
        name: target.name,
        // Transformation changes the sheet, not who controls the instance.
        // In particular, an autonomous token must remain autonomous afterward.
        type: source.type,
        imageUrl: target.imageUrl,
        inventoryDimensionsCols: target.inventoryDimensionsCols,
        inventoryDimensionsRows: target.inventoryDimensionsRows,
        primaryHandId: target.primaryHandId,
        offHandId: target.offHandId,
        neckId: target.neckId,
        ringId: target.ringId,
        armorId: target.armorId,
        commonSlotIds: [...target.commonSlotIds],
        economy: target.economy,
        forca: target.forca,
        destreza: target.destreza,
        consistencia: target.consistencia,
        inteligencia: target.inteligencia,
        sabedoria: target.sabedoria,
        carisma: target.carisma,
        level: target.level,
        xp: target.xp,
        bonusForca: target.bonusForca,
        bonusDestreza: target.bonusDestreza,
        bonusConsistencia: target.bonusConsistencia,
        bonusInteligencia: target.bonusInteligencia,
        bonusSabedoria: target.bonusSabedoria,
        bonusCarisma: target.bonusCarisma,
        profForca: target.profForca,
        profDestreza: target.profDestreza,
        profConsistencia: target.profConsistencia,
        profInteligencia: target.profInteligencia,
        profSabedoria: target.profSabedoria,
        profCarisma: target.profCarisma,
        class: target.class,
        bodyToBodyRange: target.bodyToBodyRange,
        magicalRange: target.magicalRange,
        naturalMovement: target.naturalMovement,
        currentLife: scaleResource(source.currentLife, source.maxLife, targetMaxLife),
        maxLife: targetMaxLife,
        currentMana: scaleResource(source.currentMana, source.maxMana, targetMaxMana),
        maxMana: targetMaxMana,
        tokenPrimaryElement: target.tokenPrimaryElement,
        tokenPrimaryDisvantage: target.tokenPrimaryDisvantage,
        passiveMechanics: target.passiveMechanics,
        tokenCards: target.tokenCards as Prisma.InputJsonValue,
        cards: target.cards as Prisma.InputJsonValue,
        bossSettings: target.bossSettings === null
            ? Prisma.JsonNull
            : target.bossSettings as Prisma.InputJsonValue,
    };
}

export class BattleEngineTransformService extends BattleEngineService {
    private readonly tokenRepository = new TokenRepository();
    private readonly transformationService = new TokenTransformationService(
        this.tokenRepository,
    );

    async execute(userId: string, command: TransformationCommand): Promise<void> {
        if (!command.battleId || !command.requestId) {
            throw new Error("A solicitação de transformação está incompleta.");
        }
        const battle = await this.battleStateRepository.findById(command.battleId);
        if (!battle || battle.status !== "In Battle") {
            throw new Error("A transformação exige uma batalha ativa.");
        }
        const pendingQueue = await this.pendingQueueRepository.findByBattleStateId(
            battle.id,
        );
        if (!pendingQueue) throw new Error("Fila de batalha não encontrada.");
        const pending = await this.pendingGetter.getPendingTransformationResolution(
            pendingQueue.id,
        );
        if (!pending || pending.requestId !== command.requestId) {
            throw new Error("A escolha de transformação expirou.");
        }
        const token = await this.tokenInstanceRepository.findTokenTemplateById(
            pending.tokenId,
        );
        if (!token || token.mapId !== battle.mapId) {
            throw new Error("O token da transformação não foi encontrado.");
        }
        const map = await this.mapRepository.findMapById(battle.mapId);
        const campaign = map
            ? await this.campaignRepository.findCampaignById(map.campaignId)
            : null;
        if (token.userId !== userId && campaign?.ownerId !== userId) {
            throw new Error("Você não pode transformar este token.");
        }

        if (command.action === "cancel") {
            await this.pendingSetter.cleanPendingTransformationResolution(
                pendingQueue.id,
            );
            await syncBattleState(battle.id);
            return;
        }
        if (command.action !== "submit" || !command.templateId) {
            throw new Error("Escolha uma transformação válida.");
        }
        const option = pending.options.find(
            (candidate) => candidate.templateId === command.templateId,
        );
        if (!option) throw new Error("A transformação escolhida não está disponível.");
        if (option.remainingRecharge > 0) {
            throw new Error(`Esta transformação recarrega em ${option.remainingRecharge} round(s).`);
        }

        const target = await this.requireResolvedTemplate(option.templateId);
        const states = parseTransformationStates(battle.transformationStates);
        const tokenState = states[token.id] ?? { cooldowns: {} };

        if (option.direction === "transform") {
            tokenState.active = {
                baseTemplateId: token.templateTokenId ?? target.baseTokenId ?? "",
                transformationTemplateId: target.id,
                remainingRounds: target.transformationDurationMode === "rounds"
                    ? Math.max(1, target.transformationDurationRounds ?? 1)
                    : null,
                rechargeRounds: Math.max(0, target.transformationRecharge),
            };
        } else {
            const active = tokenState.active;
            const transformedTemplateId = active?.transformationTemplateId
                ?? token.templateTokenId;
            const rechargeRounds = active?.rechargeRounds
                ?? token.transformationRecharge;
            delete tokenState.active;
            if (transformedTemplateId && rechargeRounds > 0) {
                tokenState.cooldowns[transformedTemplateId] = {
                    remainingRounds: rechargeRounds,
                    startedAtTurnVersion: battle.turnVersion,
                };
            }
        }
        states[token.id] = tokenState;

        await this.switchTemplate(battle.id, token, target);
        await this.battleStateRepository.update(battle.id, {
            transformationStates: states as unknown as Prisma.InputJsonValue,
        });
        await this.pendingSetter.cleanPendingTransformationResolution(
            pendingQueue.id,
        );
        await syncBattleState(battle.id);
    }

    async advanceForToken(battleId: string, tokenId: string): Promise<void> {
        const battle = await this.battleStateRepository.findById(battleId);
        if (!battle) return;
        const states = parseTransformationStates(battle.transformationStates);
        const state = states[tokenId];
        if (!state) return;

        for (const [templateId, cooldown] of Object.entries(state.cooldowns)) {
            if (cooldown.startedAtTurnVersion >= battle.turnVersion) continue;
            cooldown.remainingRounds -= 1;
            if (cooldown.remainingRounds <= 0) delete state.cooldowns[templateId];
        }

        if (state.active && state.active.remainingRounds !== null) {
            state.active.remainingRounds -= 1;
            if (state.active.remainingRounds <= 0) {
                const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId);
                const base = await this.tokenRepository.findById(state.active.baseTemplateId);
                if (token && base) {
                    const transformationId = state.active.transformationTemplateId;
                    const recharge = state.active.rechargeRounds;
                    await this.switchTemplate(battleId, token, await this.transformationService.resolveOne(base));
                    delete state.active;
                    if (recharge > 0) {
                        state.cooldowns[transformationId] = {
                            remainingRounds: recharge,
                            startedAtTurnVersion: battle.turnVersion,
                        };
                    }
                }
            }
        }

        states[tokenId] = state;
        await this.battleStateRepository.update(battleId, {
            transformationStates: states as unknown as Prisma.InputJsonValue,
        });
    }

    async restoreAllBeforeBattleEnd(battleId: string): Promise<void> {
        const battle = await this.battleStateRepository.findById(battleId);
        if (!battle) return;
        const tokens = await this.tokenInstanceRepository.listByMapId(battle.mapId);
        for (const current of tokens) {
            let token = current;
            const visited = new Set<string>();
            while (token.isTransformation && token.baseTokenId) {
                if (visited.has(token.baseTokenId)) break;
                visited.add(token.baseTokenId);
                const base = await this.tokenRepository.findById(token.baseTokenId);
                if (!base) break;
                token = await this.switchTemplate(
                    battleId,
                    token,
                    await this.transformationService.resolveOne(base),
                );
            }
        }
    }

    private async requireResolvedTemplate(templateId: string): Promise<Token> {
        const token = await this.tokenRepository.findById(templateId);
        if (!token) throw new Error("A forma escolhida não foi encontrada.");
        return this.transformationService.resolveOne(token);
    }

    private async switchTemplate(
        battleId: string,
        source: TokenInstance,
        target: Token,
    ): Promise<TokenInstance> {
        const updated = await this.tokenInstanceRepository.update(
            source.id,
            snapshotData(source, target),
        );
        const equippedIds = [
            updated.primaryHandId,
            updated.offHandId,
            updated.neckId,
            updated.ringId,
            updated.armorId,
        ].filter((id): id is string => Boolean(id));
        const items = await this.itemRepository.findManyByIds(equippedIds);
        await this.battleStateRepository.updateActiveMechanics(
            battleId,
            (raw) => {
                const mechanics = Array.isArray(raw)
                    ? raw as unknown as MechanicInstance[]
                    : [];
                return reconcileEquippedItemPassives(
                    reconcileTokenPassives(mechanics, updated),
                    updated.id,
                    items,
                ) as unknown as Prisma.InputJsonValue;
            },
        );
        return updated;
    }
}
