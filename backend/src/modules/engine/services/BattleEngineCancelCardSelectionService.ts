import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { syncBattleState } from "../utils/syncBattleState";
import { BattleEngineService } from "./BattleEngineService";

/**
 * Abandons the card picker without consuming an action or advancing the turn.
 * The pending record is the authority for every client, so it must be cleared
 * on the server rather than merely closing a local modal.
 */
export class BattleEngineCancelCardSelectionService extends BattleEngineService {
  async execute(userId: string, battleId: string): Promise<void> {
    if (!battleId) {
      throw new Error("ID da batalha não foi fornecido.");
    }

    const battle = await this.battleStateRepository.findById(battleId);
    if (!battle || battle.status !== "In Battle") {
      throw new Error("Não existe uma batalha ativa para cancelar a seleção de card.");
    }

    const pendingQueue = await this.pendingQueueRepository.findById(
      battle.pendingQueueId,
    );
    if (!pendingQueue) {
      throw new Error("A fila de pendências da batalha não foi encontrada.");
    }

    const pending = await this.pendingGetter.getPendingCardResolution(
      pendingQueue.id,
    );
    const tokenId = pending && typeof pending.id === "string"
      ? pending.id
      : null;
    if (!tokenId) {
      throw new Error("Não há uma seleção de card pendente para cancelar.");
    }
    if (battle.currentActorId !== tokenId) {
      throw new Error("A seleção de card pendente não pertence ao turno atual.");
    }

    const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId);
    if (!token || token.mapId !== battle.mapId) {
      throw new Error("O token da seleção de card não pertence a esta batalha.");
    }

    const map = await this.mapRepository.findMapById(battle.mapId);
    const campaign = map
      ? await this.campaignRepository.findCampaignById(map.campaignId)
      : null;
    if (!campaign) {
      throw new Error("A campanha da batalha não foi encontrada.");
    }
    if (userId !== token.userId && userId !== campaign.ownerId) {
      throw new Error("Você não pode cancelar a seleção de card deste token.");
    }

    await this.pendingSetter.cleanPendingCardResolution(pendingQueue.id);
    runtime.emit(SocketEvent.PENDING_CARD_RESOLUTION, null);
    runtime.emit(SocketEvent.FRONTEND_CARD_SELECTION, false);
    await syncBattleState(battleId);
  }
}
