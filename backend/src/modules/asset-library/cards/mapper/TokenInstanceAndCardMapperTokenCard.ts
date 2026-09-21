import { Prisma } from "@prisma/client";

import { Card } from "@prisma/client";


export function TokenInstanceAndCardMapperTokenCard(tokenId: string, card: Card): Prisma.InstanceTokenCardCreateInput {
    return {
        remainingRecharge:0 ,
        remainingDuration: 0,
        itsLoaded: true,
        token: {
            connect: {
                id: tokenId
            }
        },
        card: {
            connect: {
                id: card.id
            }
        }

    }
}