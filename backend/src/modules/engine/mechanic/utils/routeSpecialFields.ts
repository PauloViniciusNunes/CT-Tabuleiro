import { MechanicInstance } from "../mechanics/MechanicInstance"
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository"

import { BattleSetter } from "../../context/BattleSetter"
import { MechanicRegistry } from "../MechanicRegistry"
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository"

import { runtime } from "@/runtime"
import { SocketEvent } from "@/runtime/Events"

/* Criando os campos especiais */

const battleSetter = new BattleSetter()
const battleStateRepository = new BattleStateRepository()

const tokenInstanceRepository = new TokenTemplateRepository()

async function mechanicIsStillActive(
    battleId: string,
    mechanicId: string,
): Promise<boolean> {
    const battleState = await battleStateRepository.findById(battleId)
    const activeMechanics = Array.isArray(battleState?.activeMechanics)
        ? battleState.activeMechanics as unknown as MechanicInstance[]
        : []

    return activeMechanics.some((mechanic) => mechanic.id === mechanicId)
}

export async function routeSpecialFields(
    battleId: string,
    mechanic: MechanicInstance,
) {

    const definition = MechanicRegistry.findDefinition(mechanic.definitionId)

    const targetId = mechanic.metadata.targetId
    if (typeof targetId !== "string" || !targetId) return

    const visualOverlay = definition.getVisualOverlay()
    if (!visualOverlay) return

    const isActive = await mechanicIsStillActive(battleId, mechanic.id)

    if (isActive) {
        await battleSetter.applyTokenOverlay(
            targetId,
            {
                ...visualOverlay,
                mechanicInstanceIds: [mechanic.id],
            },
        )
    } else {
        // A instância já foi retirada de activeMechanics. Remover apenas a
        // referência dela preserva overlays compartilhados por outras
        // MechanicInstances ainda ativas no mesmo token.
        await battleSetter.removeMechanicOverlay(
            targetId,
            mechanic.id,
            visualOverlay.type,
        )
    }

    const token = await tokenInstanceRepository.findTokenTemplateById(targetId)
    if (token) {
        runtime.emit(SocketEvent.TOKEN_UPDATED, token)
    }
}
