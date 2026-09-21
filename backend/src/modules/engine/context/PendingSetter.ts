import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { Prisma } from "@prisma/client";
import type { PendingOffensiveCard } from "./dao/pendingDaos";
import type { PendingSpecialResponse } from "../special-response/types";

export class PendingSetter {

    constructor(
        private readonly pendingQueueRepository = new PendingQueueRepository()
    ) { }

    async setPendingAttack(
        pendingQueueId: string,
        tokenId: string,
        targetId: string,
        rawDamage: number,
        attackRoll: number,
        usedMana: number,
        attribute: string,
        reactions: any,
        isReactionAllowed: boolean,
        hasLock: boolean,
        usedActions: number,
        atackElement: string,
        usedItem: any
    ) {
        return await this.pendingQueueRepository.update(pendingQueueId, {
            pendingAttack: {
                attackerId: tokenId,
                targetId: targetId,
                rawDamage: rawDamage, // já crítico se Dado Certo
                attackRoll: attackRoll,
                usedMana: usedMana,
                attackAttribute: attribute, // 'forca' | 'destreza' | ...
                pendingReactions: reactions,
                isReactionAllowed: isReactionAllowed,
                isFreeAttack: hasLock || false,
                usedActions: usedActions,
                atackElement: atackElement,
                usedItem: (usedItem ?? null),
            }
        })
    }

    async cleanPendingAttack(pendingQueueId: string) {
        return await this.pendingQueueRepository.update(pendingQueueId, {
            pendingAttack: {}
        })
    }

    async setPendingEsquivaRoll(
        pendingQueueId: string,
        rawRolls: number[],
        total: number,
        usedMana: number,
        CRI: number,
    ) {
        return await this.pendingQueueRepository.update(pendingQueueId, {
            pendingEsquivaRoll: {
                rawRolls,
                total,
                usedMana,
                CRI
            }
        })
    }

    async cleanPendingEsquivaRoll(pendingQueueId: string) {
        return await this.pendingQueueRepository.update(pendingQueueId, {
            pendingEsquivaRoll: {}
        })
    }

    async setPendingFreeResponse(
        pendingQueueId: string,
        responderId: string,  // quem ganhou a ação livre
        paralyzedId: string,
    ) {
        return await this.pendingQueueRepository.update(pendingQueueId, {
            pendingFreeResponse: {
                responderId,
                paralyzedId,
            }
        })
    }

    async cleanPendingFreeResponse(pendingQueueId: string) {
        return await this.pendingQueueRepository.update(pendingQueueId, {
            pendingFreeResponse: {}
        })
    }

    async cleanPendingCardResolution(pendingQueueId: string) {
        return await this.pendingQueueRepository.update(pendingQueueId, {
            pendingCardResolution: {}
        })
    }

    async setPendingOffensiveCard(
        pendingQueueId: string,
        pendingOffensiveCard: PendingOffensiveCard,
    ) {
        return this.pendingQueueRepository.update(pendingQueueId, {
            pendingOffensiveCard: pendingOffensiveCard as unknown as Prisma.InputJsonValue,
        });
    }

    async cleanPendingOffensiveCard(pendingQueueId: string) {
        return this.pendingQueueRepository.update(pendingQueueId, {
            pendingOffensiveCard: {},
        });
    }

    async setPendingCardResolution(pendingQueueId: string, token: any) {
        const pending = await this.pendingQueueRepository.findById(pendingQueueId)

        if(!pending) 
            throw new Error("Nenhuma pendência foi encontrada.");

        return await this.pendingQueueRepository.update(pendingQueueId, {
            pendingCardResolution: token
        })


    }

    async setPendingSpecialResponse(
        pendingQueueId: string,
        pendingSpecialResponse: PendingSpecialResponse,
    ) {
        return this.pendingQueueRepository.update(pendingQueueId, {
            pendingSpecialResponse: pendingSpecialResponse as unknown as Prisma.InputJsonValue,
        });
    }

    async cleanPendingSpecialResponse(pendingQueueId: string) {
        return this.pendingQueueRepository.update(pendingQueueId, {
            pendingSpecialResponse: {},
        });
    }

}
