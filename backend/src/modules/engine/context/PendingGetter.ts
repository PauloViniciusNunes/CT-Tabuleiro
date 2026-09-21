import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";

import { PendingAttack, type PendingOffensiveCard } from "./dao/pendingDaos";

import { RollResultValidator } from "../validators/RollResultValidator";
import { pendingSpecialResponseSchema } from "../special-response/SpecialResponseValidation";
import type { PendingSpecialResponse } from "../special-response/types";

export class PendingGetter {
    constructor(
        private readonly pendingQueueRepository = new PendingQueueRepository()
    ) { }

    async getPendingAttack(pendingQueueId: string): Promise<PendingAttack | null> {
        const pendingQueue = await this.pendingQueueRepository.findById(pendingQueueId);

        if (!pendingQueue) {
            throw new Error("Não foi possível encontrar a fila ou não foi instanciada.");
        }

        const rawAttack = pendingQueue.pendingAttack;

        // 🟢 Valida se o objeto existe, é um objeto válido e possui o 'attackerId'
        const isValidAttack =
            rawAttack &&
            typeof rawAttack === 'object' &&
            'attackerId' in rawAttack &&
            rawAttack.attackerId;

        if (!isValidAttack) {
            return null;
        }

        const pendingAttack = rawAttack as PendingAttack;

        console.log("PENDING ATTACK: ", pendingAttack);

        return pendingAttack;
    }

    async getPendingEsquivaRoll(pendingQueueId: string) {
        const pendingQueue = await this.pendingQueueRepository.findById(pendingQueueId)

        if (!pendingQueue) {
            throw new Error("Não foi possível encontrar a fila ou não foi instanciada.")
        }

        const rollData = pendingQueue.pendingEsquivaRoll;

        // 🟢 Verifica se o objeto existe E se possui a propriedade 'total' (ou outra chave obrigatória)
        const hasValidRoll = rollData && typeof rollData === 'object' && 'total' in rollData;

        const pendingEsquivaRoll = hasValidRoll
            ? RollResultValidator.parse(rollData)
            : null;

        return pendingEsquivaRoll
    }

    async getPendingCardResolution(pendingQueueId: string) {

        if(!pendingQueueId) throw new Error("Não foi passada uma string válida para getPendingCardResolution.")

        const pendingQueue = await this.pendingQueueRepository.findById(pendingQueueId)

        if(!pendingQueue) throw new Error("Não foi  possível encontrar pendingQueue.")

        const pendingCardResolution = pendingQueue.pendingCardResolution as any

        if(!pendingCardResolution || !pendingCardResolution.id) {
            return null
        }

        return pendingCardResolution
    }    

    async getPendingOffensiveCard(pendingQueueId: string): Promise<PendingOffensiveCard | null> {
        if (!pendingQueueId) {
            throw new Error("Não foi passada uma fila válida para getPendingOffensiveCard.");
        }

        const pendingQueue = await this.pendingQueueRepository.findById(pendingQueueId);
        if (!pendingQueue) {
            throw new Error("Não foi possível encontrar a fila de pendências.");
        }

        const pending = pendingQueue.pendingOffensiveCard;
        if (
            !pending ||
            typeof pending !== "object" ||
            !("attackerId" in pending) ||
            !("cardId" in pending) ||
            !("rawCardResult" in pending) ||
            !("rawTestResult" in pending) ||
            typeof pending.attackerId !== "string" ||
            typeof pending.cardId !== "string" ||
            typeof pending.rawCardResult !== "number" ||
            typeof pending.rawTestResult !== "number"
        ) {
            return null;
        }

        return {
            resolutionId: typeof pending.resolutionId === "string"
                ? pending.resolutionId
                : `${pending.cardId}:${pending.attackerId}`,
            attackerId: pending.attackerId,
            cardId: pending.cardId,
            rawCardResult: pending.rawCardResult,
            rawTestResult: pending.rawTestResult,
        };
    }

    async getPendingFreeResponse(pendingQueueId: string) {
        if(!pendingQueueId) throw new Error("Não foi passada uma string válida para getPendingCardResolution.");

        const pendingQueue = await this.pendingQueueRepository.findById(pendingQueueId)

        if(!pendingQueue) throw new Error("Não foi  possível encontrar pendingQueue.");

        const pendingFreeResponse: any = pendingQueue.pendingFreeResponse

        if(!pendingFreeResponse) {
            return null
        }

        return pendingFreeResponse
    }

    async getPendingSpecialResponse(
        pendingQueueId: string,
    ): Promise<PendingSpecialResponse | null> {
        if (!pendingQueueId) {
            throw new Error("Não foi passada uma fila válida para a resposta especial.");
        }

        const pendingQueue = await this.pendingQueueRepository.findById(pendingQueueId);
        if (!pendingQueue) {
            throw new Error("Não foi possível encontrar a fila de pendências.");
        }

        const parsed = pendingSpecialResponseSchema.safeParse(
            pendingQueue.pendingSpecialResponse,
        );
        return parsed.success
            ? parsed.data as PendingSpecialResponse
            : null;
    }
}
