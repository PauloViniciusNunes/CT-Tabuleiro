import { OperatorType } from "../operators/OperatorType";
import { MoveTokenValidator } from "../validators/MoveTokenValidator";
import { BattleEngineService } from "./BattleEngineService";

function hasPendingPayload(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;
    return Array.isArray(value)
        ? value.length > 0
        : Object.keys(value).length > 0;
}

function hasPendingMovementBlockingResolution(pendingQueue: {
    readonly pendingAttack: unknown;
    readonly pendingOffensiveCard: unknown;
    readonly pendingSpecialResponse: unknown;
    readonly pendingFreeResponse: unknown;
    readonly pendingEsquivaRoll: unknown;
}): boolean {
    return [
        pendingQueue.pendingAttack,
        pendingQueue.pendingOffensiveCard,
        pendingQueue.pendingSpecialResponse,
        pendingQueue.pendingFreeResponse,
        pendingQueue.pendingEsquivaRoll,
    ].some(hasPendingPayload);
}

/**
 * Authoritative movement entry point for the board while a battle is active.
 *
 * Calling the MovementOperator is essential here: it is the sole path that
 * applies movement interceptors and publishes TOKEN_MOVED before battle state
 * synchronization.
 */
export class BattleEngineMoveTokenService extends BattleEngineService {
    async execute(
        userId: string,
        data: unknown,
        options: { readonly autonomous?: boolean } = {},
    ) {
        const input = MoveTokenValidator.parse(data);
        const battle = await this.battleStateRepository.findById(input.battleId);

        if (!battle || battle.status !== "In Battle") {
            throw new Error("O movimento pela engine exige uma batalha em andamento.");
        }

        const token = await this.tokenInstanceRepository.findTokenTemplateById(
            input.tokenId,
        );
        if (!token || token.mapId !== battle.mapId) {
            throw new Error("O token informado não pertence ao mapa da batalha.");
        }

        const isGameMaster = await this.assertCanManageToken(
            userId,
            token.userId,
            token.mapId,
        );

        const isAutonomousAi = options.autonomous === true && token.type === "ia";
        if ((!isAutonomousAi && token.type !== "player") || battle.currentActorId !== token.id) {
            throw new Error("Apenas o token do turno atual pode se mover.");
        }

        if (!isGameMaster && battle.currentActorUserId !== userId) {
            throw new Error("O movimento só é permitido durante a escolha de ação do token.");
        }

        const pendingQueue = await this.pendingQueueRepository.findById(
            battle.pendingQueueId,
        );
        if (!pendingQueue) {
            throw new Error("A fila de pendências da batalha não foi encontrada.");
        }

        const hasOffensiveCardResponders =
            Array.isArray(battle.tokensInOffensiveCard) &&
            battle.tokensInOffensiveCard.length > 0;
        const isSelectingAmbientPivot =
            typeof battle.tokenInAmbientPivotSelection === "string" &&
            battle.tokenInAmbientPivotSelection.length > 0;

        if (
            hasPendingMovementBlockingResolution(pendingQueue) ||
            hasOffensiveCardResponders ||
            isSelectingAmbientPivot
        ) {
            throw new Error(
                "O token não pode se mover enquanto uma ação ou reação está sendo resolvida.",
            );
        }

        return this.operators.execute(OperatorType.MOVEMENT, {
            battleId: battle.id,
            tokenId: token.id,
            to: input.to,
            cause: "BOARD_DRAG",
            metadata: { initiatorUserId: userId },
        });
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

        const campaign = await this.campaignRepository.findCampaignById(
            map.campaignId,
        );
        if (!campaign) {
            throw new Error("Campanha da instância de token não encontrada.");
        }

        if (userId !== tokenOwnerId && userId !== campaign.ownerId) {
            throw new Error("Usuário não pode mover este token.");
        }

        return userId === campaign.ownerId;
    }
}
