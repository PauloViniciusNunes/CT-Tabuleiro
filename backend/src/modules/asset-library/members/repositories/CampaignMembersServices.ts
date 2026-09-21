import { PrismaClient, CampaignMember } from "@prisma/client";

export class CampaignMemberRepository {
    private prisma: PrismaClient;

    constructor(prismaClient?: PrismaClient) {
        // Permite injeção de dependência do Prisma ou instancia um padrão
        this.prisma = prismaClient ?? new PrismaClient();
    }

    /**
     * Adiciona um usuário a uma campanha.
     */
    async addMember(campaignId: string, userId: string): Promise<CampaignMember> {
        return await this.prisma.campaignMember.create({
            data: {
                campaignId,
                userId,
            },
            include: {
                user: true, // Retorna os dados do usuário recém-adicionado
            },
        });
    }

    /**
     * Remove um usuário de uma campanha.
     */
    async removeMember(campaignId: string, userId: string): Promise<CampaignMember> {
        return await this.prisma.campaignMember.delete({
            where: {
                campaignId_userId: {
                    campaignId,
                    userId,
                },
            },
        });
    }

    /**
     * Busca o registro de vínculo de um usuário específico em uma campanha.
     */
    async findByCampaignAndUser(campaignId: string, userId: string): Promise<CampaignMember | null> {
        return await this.prisma.campaignMember.findUnique({
            where: {
                campaignId_userId: {
                    campaignId,
                    userId,
                },
            },
            include: {
                user: true,
                campaign: true,
            },
        });
    }

    /**
     * Lista todos os membros de uma campanha específica.
     */
    async listMembersByCampaignId(campaignId: string) {
        return await this.prisma.campaignMember.findMany({
            where: { campaignId },
            include: {
                user: true,
            },
            orderBy: {
                joinedAt: "asc",
            },
        });
    }

    /**
     * Lista todas as campanhas em que um usuário é membro.
     */
    async listCampaignsByUserId(userId: string) {
        return await this.prisma.campaignMember.findMany({
            where: { userId },
            include: {
                campaign: true,
            },
            orderBy: {
                joinedAt: "desc",
            },
        });
    }

    /**
     * Checa rapidamente se o usuário já é membro da campanha.
     */
    async isMember(campaignId: string, userId: string): Promise<boolean> {
        const member = await this.prisma.campaignMember.findUnique({
            where: {
                campaignId_userId: {
                    campaignId,
                    userId,
                },
            },
            select: { id: true },
        });

        return !!member;
    }

    async setCurrentMapForMembers(
        campaignId: string,
        userIds: string[],
        mapId: string,
    ) {
        return this.prisma.campaignMember.updateMany({
            where: {
                campaignId,
                userId: {
                    in: userIds,
                },
            },
            data: {
                currentMapId: mapId,
            },
        });
    }
}
