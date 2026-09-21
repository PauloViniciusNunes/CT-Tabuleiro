import type { TokenInstance } from "@prisma/client";

import { hydrateTokenInventoryItems } from "@/modules/tokens/utils/hydrateTokenInventoryItems";

import { ArtificeSettingsValidator } from "../../items/validators/ArtificeSettingsValidator";
import { MechanicRegistry } from "../mechanic/MechanicRegistry";
import { OperatorType } from "../operators/OperatorType";
import { syncBattleState } from "../utils/syncBattleState";
import { UseArtificeValidator } from "../validators/UseArtificeValidator";
import { BattleEngineCardResolution } from "./BattleEngineCardResolution";
import { BattleEngineService } from "./BattleEngineService";

type TargetPayload = {
    type: "Self" | "Target" | "Multi-Target" | "Ambient";
    tokenTarget: TokenInstance[] | null;
    numbersTarget: number | null;
    pivot: number[] | null;
    pivotSettings?: unknown;
};

const LEGACY_EFFECT_TO_MECHANIC: Readonly<Record<string, string>> = {
    queimando: "fogo",
};

/** Authoritative battle operation for using and consuming a finite item. */
export class BattleEngineUseArtificeService extends BattleEngineService {
    private static readonly tokenLocks = new Map<string, Promise<void>>();
    private readonly cardResolution = new BattleEngineCardResolution();

    async execute(userId: string, data: unknown) {
        const input = UseArtificeValidator.parse(data);
        return this.withTokenLock(input.tokenId, async () => {
            return this.executeLocked(userId, input);
        });
    }

    private async executeLocked(
        userId: string,
        input: ReturnType<typeof UseArtificeValidator.parse>,
    ) {
        const battle = await this.battleStateRepository.findById(input.battleId);

        if (!battle || battle.status !== "In Battle") {
            throw new Error("Artifícios só podem ser usados durante uma batalha.");
        }
        if (battle.currentActorId !== input.tokenId) {
            throw new Error("Apenas o token do turno atual pode usar um artifício.");
        }

        const token = await this.tokenInstanceRepository.findTokenTemplateById(input.tokenId);
        if (!token || token.mapId !== battle.mapId) {
            throw new Error("O token informado não pertence ao mapa da batalha.");
        }

        await this.assertCanManageToken(userId, token.userId, token.mapId);

        if (token.commonSlotIds[input.itemIndex] !== input.itemId) {
            throw new Error("O artifício não está mais no slot informado.");
        }

        const item = await this.itemRepository.findItemById(input.itemId);
        if (!item || !item.isArtifice) {
            throw new Error("O item informado não é um artifício.");
        }

        const settings = ArtificeSettingsValidator.parse(item.artficeSettings ?? {});
        const mechanicTag = this.resolveMechanicTag(
            settings.mechanicToApply,
            settings.effectToApply,
        );
        if (mechanicTag) {
            MechanicRegistry.map(mechanicTag);
        }

        const card = settings.cardDispachId
            ? await this.cardRepository.findCardById(settings.cardDispachId)
            : null;
        if (settings.cardDispachId && !card) {
            throw new Error("O card configurado no artifício não foi encontrado.");
        }

        const target = card
            ? await this.normalizeTarget(input.target, card.target, battle.mapId, token)
            : null;

        if (settings.lifeAdd > 0) {
            await this.operators.execute(OperatorType.LIFE_INCREMENT, {
                battleId: battle.id,
                sourceTokenId: token.id,
                targetTokenId: token.id,
                amount: settings.lifeAdd,
                cause: "ARTIFICE_USE",
                metadata: { itemId: item.id },
            });
        } else if (settings.lifeAdd < 0) {
            await this.operators.execute(OperatorType.LIFE_DECREASE, {
                battleId: battle.id,
                sourceTokenId: token.id,
                targetTokenId: token.id,
                amount: Math.abs(settings.lifeAdd),
                cause: "ARTIFICE_USE",
                metadata: { itemId: item.id },
            });
        }

        if (settings.manaAdd > 0) {
            await this.operators.execute(OperatorType.MANA_INCREMENT, {
                battleId: battle.id,
                sourceTokenId: token.id,
                amount: settings.manaAdd,
                cause: "ARTIFICE_USE",
                metadata: { itemId: item.id },
            });
        } else if (settings.manaAdd < 0) {
            await this.operators.execute(OperatorType.MANA_DECREASE, {
                battleId: battle.id,
                sourceTokenId: token.id,
                amount: Math.abs(settings.manaAdd),
                cause: "ARTIFICE_USE",
                metadata: { itemId: item.id },
            });
        }

        if (mechanicTag) {
            await this.operators.execute(OperatorType.MECHANIC_APPLICATION, {
                battleId: battle.id,
                sourceTokenId: token.id,
                tag: mechanicTag,
                cause: "ARTIFICE_USE",
                mechanicMetadata: {
                    targetId: token.id,
                    itemId: item.id,
                },
            });
        }

        if (card && target) {
            await this.cardResolution.execute(
                battle.id,
                {
                    battleId: battle.id,
                    currentId: token.id,
                    card: { id: card.id },
                    target,
                    isArtifice: true,
                },
                { trustedArtifice: true },
            );
        }

        const updated = await this.tokenInstanceRepository.consumeCommonSlotItem(
            token.id,
            item.id,
            input.itemIndex,
        );
        const [hydratedToken] = await hydrateTokenInventoryItems(
            [updated],
            this.itemRepository,
        );

        await syncBattleState(battle.id);
        return hydratedToken;
    }

    private async withTokenLock<Result>(
        tokenId: string,
        operation: () => Promise<Result>,
    ): Promise<Result> {
        const previous = BattleEngineUseArtificeService.tokenLocks.get(tokenId)
            ?? Promise.resolve();
        let release = () => {};
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const queued = previous.then(() => gate);
        BattleEngineUseArtificeService.tokenLocks.set(tokenId, queued);

        await previous;
        try {
            return await operation();
        } finally {
            release();
            if (BattleEngineUseArtificeService.tokenLocks.get(tokenId) === queued) {
                BattleEngineUseArtificeService.tokenLocks.delete(tokenId);
            }
        }
    }

    private resolveMechanicTag(
        mechanicToApply: string | null | undefined,
        legacyEffectToApply: string | null | undefined,
    ) {
        if (mechanicToApply) return mechanicToApply;
        if (!legacyEffectToApply || legacyEffectToApply === "none") return null;
        return LEGACY_EFFECT_TO_MECHANIC[legacyEffectToApply] ?? legacyEffectToApply;
    }

    private async normalizeTarget(
        rawTarget: unknown,
        rawCardTarget: unknown,
        mapId: string,
        sourceToken: TokenInstance,
    ): Promise<TargetPayload> {
        const cardTarget = rawCardTarget && typeof rawCardTarget === "object"
            ? rawCardTarget as Record<string, unknown>
            : {};
        const type = cardTarget.type;

        if (type === "Self") {
            return {
                type: "Self",
                tokenTarget: [sourceToken],
                numbersTarget: 1,
                pivot: null,
            };
        }
        if (type === "Ambient") {
            return {
                type: "Ambient",
                tokenTarget: null,
                numbersTarget: typeof cardTarget.numbersTarget === "number"
                    ? cardTarget.numbersTarget
                    : 1,
                pivot: null,
                pivotSettings: cardTarget.pivotSettings,
            };
        }
        if (type !== "Target" && type !== "Multi-Target") {
            throw new Error("O card do artifício possui um tipo de alvo inválido.");
        }

        const targetRecord = rawTarget && typeof rawTarget === "object"
            ? rawTarget as Record<string, unknown>
            : {};
        const requestedTargets = Array.isArray(targetRecord.tokenTarget)
            ? targetRecord.tokenTarget
            : [];
        const requestedIds = requestedTargets.flatMap((candidate) => {
            if (!candidate || typeof candidate !== "object") return [];
            const id = (candidate as Record<string, unknown>).id;
            return typeof id === "string" ? [id] : [];
        });
        const boardTokens = await this.tokenInstanceRepository.listByMapId(mapId);
        const allowedCount = type === "Target"
            ? 1
            : Math.max(1, Number(cardTarget.numbersTarget) || 1);
        const targets = [...new Set(requestedIds)]
            .map((id) => boardTokens.find((candidate) => candidate.id === id))
            .filter((candidate): candidate is TokenInstance => Boolean(candidate))
            .slice(0, allowedCount);

        if (targets.length === 0) {
            throw new Error("Selecione ao menos um alvo válido para o artifício.");
        }

        return {
            type,
            tokenTarget: targets,
            numbersTarget: allowedCount,
            pivot: null,
            pivotSettings: cardTarget.pivotSettings,
        };
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
            throw new Error("Usuário não pode usar itens deste token.");
        }
    }
}
