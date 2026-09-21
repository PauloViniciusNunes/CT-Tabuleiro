import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository"
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository"
import { PendingGetter } from "../context/PendingGetter"
import { discoverCurrentUserId } from "@/shared/utils/discoverCurrentUserId"
import { UserRepository } from "@/modules/auth/repositories/UserRepository"
import type { MechanicInstance } from "../mechanic/mechanics/MechanicInstance"

const pendingQueueRepository = new PendingQueueRepository()
const battleStateRepository = new BattleStateRepository()
const userRepository = new UserRepository()
const pendingGetter = new PendingGetter()

/**
 * 
 * @param battleId id da batalha corrente
 * Mantém o usuário do ator alinhado com o único formulário que deve receber
 * interação. A ordem abaixo espelha a precedência dos formulários no BoardPage.
 */
export async function syncUserActorId(battleId: string) {

    if(!battleId) {
        console.error("Id da batalha está incoerente.")
        return
    }
    const battleState = await battleStateRepository.findById(battleId)
    const pendingQueue = await pendingQueueRepository.findByBattleStateId(battleId)

    if(!pendingQueue || !battleState) {
        console.error("Não foi possível encontrar battleId para syncuserActorId.")
        return    }

    //ID da fila de pendências
    const pendingQueueId = pendingQueue.id

    console.log("[FILA DE PENDENCIAS]: ", pendingQueue)

    const pendingAttack = await pendingGetter.getPendingAttack(pendingQueueId)
    const pendingEsquivaRoll = await pendingGetter.getPendingEsquivaRoll(pendingQueueId)
    const pendingFreeResponse = await pendingGetter.getPendingFreeResponse(pendingQueueId)
    const pendingCardResolution = await pendingGetter.getPendingCardResolution(pendingQueueId)

    let actorTokenId: string | null = null

    // A resposta livre é renderizada antes dos demais formulários e bloqueia
    // a ação normal enquanto estiver pendente.
    console.log("[EXISTE PENDING RESPONDER?]: ", pendingFreeResponse)
    console.log("[QUEM É O PENDING FREE RESPONDER]: ", pendingFreeResponse?.responderId)

    
    if (pendingFreeResponse?.responderId) {
        actorTokenId = pendingFreeResponse.responderId
    }
    // Após uma esquiva, o atacante escolhe a resolução da defesa.
    else if (pendingAttack && pendingEsquivaRoll) {
        actorTokenId = pendingAttack.attackerId
    }
    // Antes da esquiva, quem pode reagir é o alvo do ataque.
    else if (pendingAttack) {
        actorTokenId = pendingAttack.targetId
    }
    // A seleção de carta pertence ao token que abriu o formulário.
    else if (pendingCardResolution?.id) {
        actorTokenId = pendingCardResolution.id
    }
    // Respostas ofensivas são tratadas uma por vez, na ordem persistida.
    else if (Array.isArray(battleState.tokensInOffensiveCard) && battleState.tokensInOffensiveCard.length > 0) {
        const currentDefender = battleState.tokensInOffensiveCard[0] as { id?: string } | undefined
        actorTokenId = currentDefender?.id ?? null
    }
    // Sem pendências, o ator é o token do turno corrente.
    else {
        actorTokenId = battleState.currentActorId
    }

    const activeMechanics = Array.isArray(battleState.activeMechanics)
        ? battleState.activeMechanics as unknown as MechanicInstance[]
        : []
    const activeControl = actorTokenId === battleState.currentActorId
        ? activeMechanics.find((mechanic) =>
            mechanic.metadata.controlsTarget === true &&
            mechanic.metadata.nextTurnActive === true &&
            mechanic.metadata.targetId === actorTokenId,
        )
        : undefined
    const controllingTokenId = activeControl?.sourceTokenId

    const userId = controllingTokenId
        ? await discoverCurrentUserId(controllingTokenId, battleState.mapId)
        : actorTokenId
            ? await discoverCurrentUserId(actorTokenId, battleState.mapId)
            : ""

    
    let userResponder: any;
    let userPendingFreeResponderId: string;

    if(pendingFreeResponse?.responderId) {
        userPendingFreeResponderId = await discoverCurrentUserId(pendingFreeResponse?.responderId, battleState.mapId)
        userResponder = await userRepository.findById(userPendingFreeResponderId)
    }

    if(userResponder) {
        console.log("[QUAL NOME DELE?]: ", userResponder.name)
    }
    

    if (battleState.currentActorUserId !== userId) {
        await battleStateRepository.update(battleId, {
            currentActorUserId: userId,
        })
    }


}
