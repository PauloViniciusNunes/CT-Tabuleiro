import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { resolveActionType } from "../context/ActionType";
import { OperatorType } from "../operators/OperatorType";
import { ChoiceValidator } from "../validators/ChoiceValidator";
import { BattleEngineService } from "./BattleEngineService";
import { BattleEngineNextTurnService } from "./micro-services/BattleEngineNextTurnService";

export class BattleEngineExecuteActionService extends BattleEngineService {
    private readonly battleEngineNextTurnService = new BattleEngineNextTurnService();

    async execute(battleId: string, data: unknown): Promise<boolean> {
        if (!battleId) {
            throw new Error("ID da batalha não foi fornecido.");
        }

        const battleState = await this.battleStateRepository.findById(battleId);
        if (!battleState || battleState.status !== "In Battle") {
            throw new Error("Não foi possível realizar a ação fora de uma batalha ativa.");
        }

        const battle = BattleStateValidator.parse(battleState);
        const currentTokenId = battle.turnOrder[battle.currentTurnIndex]?.tokenId;
        if (!currentTokenId) {
            return false;
        }

        const choice = ChoiceValidator.parse(data);
        const action = await this.operators.execute(OperatorType.ACTION_DISPATCH, {
            battleId,
            sourceTokenId: currentTokenId,
            actionType: resolveActionType(choice.actionType),
            choice,
            cause: "BATTLE_ACTION",
        });

        if (action.shouldAdvanceTurn) {
            await this.battleEngineNextTurnService.execute(battleId);
        }

        return action.outcome !== "rejected";
    }
}
