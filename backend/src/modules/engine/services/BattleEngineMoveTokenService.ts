import { OperatorType } from "../operators/OperatorType";
import { MoveTokenValidator } from "../validators/MoveTokenValidator";
import { BattleEngineService } from "./BattleEngineService";

/**
 * Authoritative movement entry point for the board while a battle is active.
 *
 * Calling the MovementOperator is essential here: it is the sole path that
 * applies movement interceptors and publishes TOKEN_MOVED before battle state
 * synchronization.
 */
export class BattleEngineMoveTokenService extends BattleEngineService {
    async execute(userId: string, data: unknown) {
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

        await this.assertCanManageToken(userId, token.userId, token.mapId);

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
    }
}
