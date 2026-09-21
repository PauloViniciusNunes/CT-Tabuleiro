import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { VisualOverlay } from "../mechanic/types/visualOverlays";
import { PivotCandidate } from "./dao/pendingDaos";
import { MechanicEntityInstance } from "../mechanic/types/mechanicEntity";

export class BattleGetter {

    constructor(
        private readonly battleStateRepository = new BattleStateRepository(),
        private readonly tokenTemplateRepository = new TokenTemplateRepository(),
        private readonly mapRepository = new MapRepository()
    ) { }

    async getToken(tokenId: string) {
        return await this.tokenTemplateRepository.findTokenTemplateById(tokenId)
    }

    async getTokenAction(battleId: string, tokenId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        if (battleState.status !== "In Battle") {
            throw new Error("O estado de batalha não está ativo para BATALHAS.")
        }

        const accumulatedActions = (battleState.accumulatedActions as Record<string, number>)

        return accumulatedActions[tokenId]
    }

    async searchTokenPosition(battleId: string, tokenId: string, attr: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Nenhum Battle State foi encontrado.")
        }

        const tokensBattlePosition = (battleState.tokensBattlePosition as Record<string, number>)
        const key = `${tokenId}->${attr}`;
        return tokensBattlePosition[key] ?? 1;
    }

    async getTokenProficiency(tokenId: string, attr: string) {
        const tokenInstance = await this.tokenTemplateRepository.findTokenTemplateById(tokenId)

        if (!tokenInstance) {
            throw new Error("Impossível conceder proficiência a token inexistente.")
        }

        if ((attr === "forca" && tokenInstance.profForca) ||
            (attr === "destreza" && tokenInstance.profDestreza) ||
            (attr === "consistencia" && tokenInstance.profConsistencia) ||
            (attr === "inteligencia" && tokenInstance.profInteligencia) ||
            (attr === "sabedoria" && tokenInstance.profSabedoria) ||
            (attr === "carisma" && tokenInstance.profCarisma)
        ) {
            return Math.ceil((tokenInstance.level - 10) / 4 + 4)
        }
        else {
            return 0
        }

    }

    async getTokenAttributeValue(tokenId: string, attr: string) {
        const token = await this.tokenTemplateRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível encontrar o token instance.")
        }

        switch (attr) {
            case "forca":
                return token.forca
            case "destreza":
                return token.destreza
            case "consistencia":
                return token.consistencia
            case "inteligencia":
                return token.inteligencia
            case "sabedoria":
                return token.sabedoria
            case "carisma":
                return token.carisma
            default:
                return 0;

        }

    }

    async getTokenBonus(tokenId: string, attr: string) {
        const token = await this.tokenTemplateRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível conceder bônus a Token, não foi encontrado.")
        }

        switch (attr) {
            case "força":
                return token.bonusForca
            case "destreza":
                return token.bonusDestreza
            case "consistencia":
                return token.bonusConsistencia
            case "inteligencia":
                return token.bonusInteligencia
            case "sabedoria":
                return token.bonusSabedoria
            case "carisma":
                return token.bonusCarisma
            default:
                return 0;

        }
    }

    async getParalysis(battleStateId: string, tokenId: string): Promise<string> {
        const battleState = await this.battleStateRepository.findById(battleStateId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleStateId} não foi encontrada.`);
        }

        const currentMap = (battleState.tokenParalysis as Record<string, string>) || {};
        return currentMap[tokenId] ?? 'none';
    }


    async getFreeActionLock(battleStateId: string, tokenId: string, targetId: string) {
        const battleState = await this.battleStateRepository.findById(battleStateId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        const lockKey = `${tokenId}->${targetId}`

        const freeActionLock = (battleState.freeActionLock as Record<string, string>)
        return freeActionLock[lockKey]
    }

    async getRemainingExtraActions(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar o estado de batalha. Impossível obter remainingExtraActions")
        }

        const remainingExtraActions = (battleState.remainingExtraActions as { attackerId: string, extraActions: number })

        return remainingExtraActions
    }

    async getDidActThisTurn(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar uma batalha.")
        }

        const didActThisTurn = (battleState.didActThisTurn as Record<string, boolean>)

        return didActThisTurn
    }

    async getMovedThisTurn(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar uma batalha.")
        }

        const movedThisTurn = (battleState.movedThisTurn as Record<string, boolean>)

        return movedThisTurn
    }

    async getLastAllUsedResponse(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar uma batalha.")
        }

        const lastAllUsedResponse = (battleState.lastAllUsedResponse as Record<string, boolean>)

        return lastAllUsedResponse
    }

    async getPrevReaction(battleId: string) {

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O estado de batalha não foi encontrado.")
        }

        const prevReaction = (battleState.prevReaction as Record<string, string>)

        return prevReaction
    }

    async getCurrentBattleToken(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O estado de batalha não foi encontrado.")
        }

        if (battleState.status !== "In Battle") {
            throw new Error("Não está em batalha.")
        }

        const currentTokenId = battleState.currentActorId as string

        const currentToken = await this.tokenTemplateRepository.findTokenTemplateById(currentTokenId)

        if (!currentToken) {
            throw new Error("Não foi possível encontrar esse Token.")
        }
        return currentToken
    }

    async getPrevisionAttacks(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O estado de batalha não foi encontrado.")
        }

        if (battleState.status !== "In Battle") {
            throw new Error("Não está em batalha.")
        }

        const previsionAttacks = (battleState.previsionActions as Record<string, number>) || {}

        return previsionAttacks
    }

    async getEngineContext(battleId: string) {

        if (!battleId) {
            throw new Error("Uma string inválida foi passada como parâmetro para getEngineContext.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O battleState não foi encontrado.")
        }

        const mapId = battleState.mapId

        const map = await this.mapRepository.findMapById(mapId)

        if (!map) {
            throw new Error("Nenhum mapa associado a essa batalha")
        }

        const boardTokens = await this.tokenTemplateRepository.listByMapId(mapId)

        if (!boardTokens) {
            throw new Error("Não existem boardTokens para essa operação.")
        }

        const mapObjs = map.mapObjs

        const engineContext = {
            mapId: mapId,
            battleId: battleId,
            boardTokens: boardTokens,
            mapObjs: mapObjs
        }

        return engineContext
    }

    async getTokenVisualOverlays(battleId: string, tokenId: string) {
        if (!battleId || !tokenId) {
            throw new Error("Uma string inválida foi passada como parâmetro para getTokenVisualOverlays.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        const token = await this.tokenTemplateRepository.findTokenTemplateById(tokenId)

        const overlays = token?.visualOverlays as unknown as VisualOverlay[]

        return overlays

    }

    async getCardsNotRechargeds(battleId: string) {
        if (!battleId) {
            throw new Error("Uma string inválida foi passada como parâmetro para getTokenVisualOverlays.")
        }
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        const cardsNotRechargeds: Record<string, string[]> = battleState.cardsNotRechargeds as Record<string, string[]>;
        return cardsNotRechargeds
    }

    async getMaxSelectablePivots(battleId: string) {
        if (!battleId) {
            throw new Error("Uma string inválida foi passada como parâmetro para getTokenVisualOverlays.")
        }
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        const maxSelectablePivots = battleState.maxSelectablePivots as number

        return maxSelectablePivots
    }

    async getRemainingPivots(battleId: string) {
        if (!battleId) {
            throw new Error("Uma string inválida foi passada como parâmetro para getTokenVisualOverlays.")
        }
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        const remainingPivots = battleState.remainingPivots as number

        return remainingPivots
    }

    async getSelectedPivots(battleId: string): Promise<PivotCandidate[]> {
        if (!battleId) {
            // 🟢 Mensagem de erro corrigida (estava apontando para getTokenVisualOverlays)
            throw new Error("Uma string inválida foi passada como parâmetro para getSelectedPivots.")
        }
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        const rawPivots = battleState.selectedPivots

        // 🟢 1. Se o campo do banco for uma string JSON
        if (typeof rawPivots === "string") {
            try {
                const parsed = JSON.parse(rawPivots)
                return Array.isArray(parsed) ? (parsed as PivotCandidate[]) : []
            } catch {
                return []
            }
        }

        // 🟢 2. Se já for um Array
        if (Array.isArray(rawPivots)) {
            return rawPivots as unknown as PivotCandidate[]
        }

        // 🟢 3. Fallback seguro para evitar o crash de "not iterable"
        return []
    }

    async getMechanicEntities(battleId: string): Promise<MechanicEntityInstance[]> {
        if (!battleId) {
            // 🟢 Mensagem de erro corrigida
            throw new Error("Uma string inválida foi passada como parâmetro para getMechanicEntities.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        const rawEntities = battleState.mechanicEntitiesInstances

        // 🟢 Garante a leitura correta se for Array ou String JSON
        if (typeof rawEntities === "string") {
            try {
                return JSON.parse(rawEntities) as MechanicEntityInstance[]
            } catch {
                return []
            }
        }

        if (Array.isArray(rawEntities)) {
            return rawEntities as unknown as MechanicEntityInstance[]
        }

        return []
    }

    async getTimeToRechargeCard(battleId: string): Promise<Record<string, number>> {
        // 🟢 1. Validação estrita do ID de entrada
        if (!battleId) {
            throw new Error("Parâmetro 'battleId' é obrigatório em getTimeToRechargeCard.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar battleState em getTimeToRechargeCard.")
        }

        // 🟢 2. Trata o campo JSON do banco contra null, undefined ou formato String
        const rawMap = battleState.timeToRechargeCard

        if (!rawMap) {
            return {}
        }

        // Caso o Prisma/DB devolva o JSON como String
        if (typeof rawMap === "string") {
            try {
                return JSON.parse(rawMap) as Record<string, number>
            } catch {
                return {}
            }
        }

        // Caso venha como um objeto válido
        if (typeof rawMap === "object" && !Array.isArray(rawMap)) {
            return rawMap as Record<string, number>
        }

        return {}
    }

    async getArmedCard(battleId: string) {

        if (!battleId) {
            throw new Error("Parâmetro 'battleId' é obrigatório em getArmedCard.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar battleState em getArmedCard.")
        }

        const rawMap = battleState.armedCard

        // Caso o Prisma/DB devolva o JSON como String
        if (typeof rawMap === "string") {
            try {
                return JSON.parse(rawMap) as any
            } catch {
                return null
            }
        }

        // Caso venha como um objeto válido
        if (typeof rawMap === "object") {
            return rawMap as any
        }

        return null
    }

    async getTokenInAmbientPivotSelection(battleId: string) {
        if (!battleId) {
            throw new Error("Parâmetro 'battleId' é obrigatório em getArmedCard.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar battleState em getArmedCard.")
        }

        const tokenInSelection = battleState.tokenInAmbientPivotSelection as string
        return tokenInSelection
    }
}