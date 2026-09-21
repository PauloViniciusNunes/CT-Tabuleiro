import { PendingSetter } from "../PendingSetter";
import { BattleSetter } from "../BattleSetter";
import { BattleGetter } from "../BattleGetter";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { isInAttackRange } from "../../utils/calculations";
import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { MechanicEntityInstance } from "../../mechanic/types/mechanicEntity";
import { MechanicEngine } from "../../mechanic/MechanicEngine";
import { mountMechanicEntity } from "../../mechanic/utils/functions";
import { PivotCandidate } from "../dao/pendingDaos";
import { PendingGetter } from "../PendingGetter";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";

export function itemCoerentAdd(respectiveAttribute: string, usedItem: any) {

  if (!usedItem?.atributeToOcasionalAdd) {
    return 0
  }

  return respectiveAttribute === usedItem.atributeToOcasionalAdd ? usedItem.ocasionalAdd : 0
}


export function nextParalysisAfterHit(current: string, attackUsedMana: number, remainingActions: number): string {

  console.log("> DELTA ACTIONS: ", remainingActions);
  if (remainingActions > 0 && (current === 'paralisia_rapida' && attackUsedMana <= 0)) {
    return current;
  }

  if (remainingActions > 0 && current === 'paralisia') {
    return current;
  }

  if (current === 'paralisia' && attackUsedMana > 0) {
    return 'paralisia_rapida';
  }

  return 'none';
}


export function canDefenderReact(attackUsedMana: number, state: string): boolean {
  if (state === 'paralisia') {
    return false;
  }
  if (state === 'paralisia_rapida') {
    // Rápida: não reage apenas a ataques SEM mana
    return attackUsedMana > 0;
  }
  return true;
}

export async function grantFreeActionNoReaction(
  battleSetter: BattleSetter,
  pendingSetter: PendingSetter,
  battleId: string,
  pendingQueueId: string,
  nextActorId: string,
  nextDefenderId: string,
  paralasysType: string,
  totalActions: number
): Promise<boolean> {

  const tokenInstanceRepository = new TokenTemplateRepository()

  const responder = await tokenInstanceRepository.findTokenTemplateById(nextActorId);

  if (!responder) {
    throw new Error("Não existe um Token Responder.")
  }

  const target = await tokenInstanceRepository.findTokenTemplateById(nextDefenderId);

  if (!target) {
    throw new Error("Não existe um Token Target.")
  }

  // A resposta livre do fluxo atual é um golpe físico. Não concede ações,
  // locks ou paralisia quando esse golpe não alcança o alvo.
  if (!isInAttackRange(responder, target, "fisico")) return false;

  if (paralasysType !== 'none') {
    await battleSetter.tokenAddAction(battleId, nextActorId, totalActions)
  }

  await battleSetter.addFreeActionLock(battleId, nextActorId, nextDefenderId, totalActions.toString())
  runtime.emit(SocketEvent.FRONTEND_SELECTED_TARGET, target)

  await battleSetter.setRemainingExtraActions(battleId, nextActorId, totalActions)
  await battleSetter.setTotalActionsReturn(battleId, totalActions + 1)

  await battleSetter.setParalysis(battleId, nextDefenderId, paralasysType)

  const pending = await pendingSetter.setPendingFreeResponse(pendingQueueId, nextActorId, nextDefenderId)
  runtime.emit(SocketEvent.PENDING_FREE_RESPONSE, pending.pendingFreeResponse)
  return true;
}

export async function defineRemainingPrevisionAttacks(battleSetter: BattleSetter, battleId: string, defenderId: string, attackerId: string, numbersActions: number) {
  const formatedKey = `${defenderId}->${attackerId}`;

  const battleStateRepository = new BattleStateRepository()
  const battleState = await battleStateRepository.findById(battleId)

  if (!battleState) {
    throw new Error("Batalha não foi encontrada.")
  }

  const previsionAttacks = (battleState.previsionActions as Record<string, number>)
  await battleSetter.addPrevisionAttack(battleId, formatedKey, numbersActions)
}

type Position = {
  col: number,
  row: number
}

export function getCellsInRadius(
  center: Position,
  radius: number,
  gridCells: Position[]
): Position[] {
  return gridCells.filter(cell => {
    const dx = Math.abs(cell.col - center.col);
    const dy = Math.abs(cell.row - center.row);
    return dx <= radius && dy <= radius;
  });
}

export async function applyMechanicToToken(
  battleRepository: BattleStateRepository,
  tokensInstanceRepository: TokenTemplateRepository,
  battleId: string,
  cardEntity: MechanicEntityInstance,
  targetToken: any
) {

  console.log("[TARGET TOKEN TEAM]: ", targetToken.team)
  if (targetToken.team === cardEntity.friendlyTeam) {
    return;
  }

  const battleState = await battleRepository.findById(battleId)

  if (!battleState)
    throw new Error("Não possui battleState para applyMechanicToToken.")

  const boardTokens = await tokensInstanceRepository.listByMapId(battleState.mapId)

  if (!boardTokens)
    throw new Error("Não foi encontrado boardTokens para applyMechanicToToken.")

  const triggerToken = boardTokens.find(t => t.id === cardEntity.triggerId);

  if (!triggerToken)
    throw new Error("Nenhum token é o triggerToken?")

  const effects = Array.isArray(cardEntity.effectToApply) ? cardEntity.effectToApply : [];

  for (const effect of effects) {
    await MechanicEngine.createMechanic(
      cardEntity.triggerId,
      battleId,
      effect,
      {
        "targetId": targetToken.id,
        "duration": cardEntity.duration
      }
    );
  }

}

export function getTokensInCardEntityRadius(
  tokens: any,
  position: Position,
  range: number,
  triggerId: string
): any[] {
  return tokens.filter((t: any) => {
    const dx = Math.abs(
      t.col - position.col
    );

    const dy = Math.abs(
      t.row - position.row
    );

    return (
      dx <= range &&
      dy <= range &&
      t.id !== triggerId
    );
  });
}

export async function resolveTriggerFixPivot(
  battleId: string,
  battleRepository: BattleStateRepository,
  tokenInstaceRepository: TokenTemplateRepository,
  battleSetter: BattleSetter,
  battleGetter: BattleGetter,
  triggerToken: any
) {

  if (!battleId)
    throw new Error("Não foi passado um battleId válido para resolveTriggerFixPivot.")

  const battleState = await battleRepository.findById(battleId)

  if (!battleState)
    throw new Error("Não foi possível obter battleState para resolveTriggerFixPivot.");


  const boardTokens = await tokenInstaceRepository.listByMapId(battleState.mapId)

  if (!boardTokens)
    throw new Error("Não foi possível obter boardTokens para resolveTriggerFixPivot.")

  const armedCard = await battleGetter.getArmedCard(battleId)

  if (!armedCard || !triggerToken) return;

  const instance = mountMechanicEntity(
    triggerToken.id,
    armedCard.effectToApply,
    armedCard.target.pivotSettings.areaImgUrl,
    armedCard.target.pivotSettings.pivotType,
    armedCard.target.pivotSettings.range,
    armedCard.duration ?? Infinity,
    triggerToken.col,
    triggerToken.row
  )

  const affectedTokens =
    getTokensInCardEntityRadius(
      boardTokens,
      instance.position,
      instance.pivotSettings.range,
      instance.triggerId
    );

  for(const token of affectedTokens) {
    await applyMechanicToToken(
      battleRepository,
      tokenInstaceRepository,
      battleId,
      instance,
      token
    )
  }

  await battleSetter.addMechanicEntity(
    battleId,
    triggerToken.id,
    armedCard.effectToApply,
    armedCard.target.pivotSettings.areaImgUrl,
    armedCard.target.pivotSettings.pivotType,
    armedCard.target.pivotSettings.range,
    armedCard.target.duration ?? Infinity,
    triggerToken.col,
    triggerToken.row
  )  
}

export async function resolvePivotPosition(
  battleId: string,
  battleRepository: BattleStateRepository,
  tokenInstanceRepository: TokenTemplateRepository,
  pendingQueueRepository: PendingQueueRepository,
  pendingGetter: PendingGetter,
  pivot: PivotCandidate
): Promise<Position> {

  const battleState = await battleRepository.findById(battleId)

  if (!battleState)
    throw new Error("Não foi possível obter battleState para resolvePivotPosition.");

  const boardTokens = await tokenInstanceRepository.listByMapId(battleState.mapId)

  if (!boardTokens)
    throw new Error("Não foi possível obter boardTokens para resolvePivotPosition.");

  const pendingQueue = await pendingQueueRepository.findByBattleStateId(battleId)

  if (!pendingQueue)
    throw new Error("Não foi possível obter uma fila de pendências para resolvePivotPosition.");

  const pendingCardResolution = await pendingGetter.getPendingCardResolution(pendingQueue.id)

  if (pivot.type === "cell") {
    return pivot.position;
  }

  if (pivot.type === "token") {
    const token =
      boardTokens.find(
        t => t.id === pivot.tokenId
      );

    if (!token) {
      throw new Error(
        "Token pivot não encontrado"
      );
    }

    const position = {
      col: token.col,
      row: token.row
    }

    return position;
  }

  if (pivot.type === "trigger") {
    if (!pendingCardResolution) {
      throw new Error(
        "Trigger-Fix sem token disparador"
      );
    }

    return pendingCardResolution.position as Position;
  }

  throw new Error("Pivot inválido");
}
