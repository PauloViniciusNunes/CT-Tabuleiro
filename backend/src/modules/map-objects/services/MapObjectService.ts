import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { CampaignMemberRepository } from "@/modules/asset-library/members/repositories/CampaignMembersServices";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { emitMapObjectsUpdated } from "../utils/emitMapObjectsUpdated";
import {
    CreateMapObjectValidator,
    CreateMapWallsValidator,
    EraseMapObjectsValidator,
    PaintMapObjectsValidator,
    UpdateMapObjectValidator,
} from "../validators/MapObjectValidator";
import {
    MapObjectRepository,
    type MapObjectMutation,
} from "../repositories/MapObjectRepository";

export class MapObjectService {
    constructor(
        private readonly repository = new MapObjectRepository(),
        private readonly mapRepository = new MapRepository(),
        private readonly campaignRepository = new CampaignRepository(),
        private readonly campaignMemberRepository = new CampaignMemberRepository(),
        private readonly itemRepository = new ItemRepository(),
    ) {}

    async list(userId: string, mapId: string) {
        await this.assertCanViewMap(userId, mapId);
        return this.repository.listByMapId(mapId);
    }

    async create(userId: string, mapId: string, data: unknown) {
        const input = CreateMapObjectValidator.parse(data);
        await this.assertCanManageMap(userId, mapId);
        await this.assertChestItem(userId, input.type, input.itemRelativeId);
        return this.complete(await this.repository.create(mapId, input));
    }

    async update(userId: string, mapId: string, objectId: string, data: unknown) {
        const input = UpdateMapObjectValidator.parse(data);
        await this.assertCanManageMap(userId, mapId);
        const current = await this.repository.findById(objectId);
        if (!current || current.mapId !== mapId) {
            throw new Error("Objeto de mapa não encontrado.");
        }
        const effectiveType = input.type ?? current.type;
        const effectiveItemId = input.itemRelativeId === undefined
            ? current.itemRelativeId
            : input.itemRelativeId;
        if (effectiveType === "chest") {
            await this.assertChestItem(userId, effectiveType, effectiveItemId);
        }
        return this.complete(await this.repository.update(mapId, objectId, input));
    }

    async delete(userId: string, mapId: string, objectId: string) {
        await this.assertCanManageMap(userId, mapId);
        return this.complete(await this.repository.delete(mapId, objectId));
    }

    async clear(userId: string, mapId: string) {
        await this.assertCanManageMap(userId, mapId);
        return this.complete(await this.repository.clear(mapId));
    }

    async createWalls(userId: string, mapId: string, data: unknown) {
        const { walls } = CreateMapWallsValidator.parse(data);
        await this.assertCanManageMap(userId, mapId);
        return this.complete(await this.repository.createWalls(mapId, walls));
    }

    async paint(userId: string, mapId: string, data: unknown) {
        const { objects } = PaintMapObjectsValidator.parse(data);
        await this.assertCanManageMap(userId, mapId);
        await Promise.all(objects.map((object) =>
            this.assertChestItem(userId, object.type, object.itemRelativeId),
        ));
        return this.complete(await this.repository.paint(mapId, objects));
    }

    async erase(userId: string, mapId: string, data: unknown) {
        const { positions } = EraseMapObjectsValidator.parse(data);
        await this.assertCanManageMap(userId, mapId);
        return this.complete(await this.repository.erase(mapId, positions));
    }

    private async assertCanManageMap(userId: string, mapId: string) {
        const map = await this.mapRepository.findMapById(mapId);
        if (!map) throw new Error("Mapa não encontrado.");
        const campaign = await this.campaignRepository.findCampaignById(map.campaignId);
        if (!campaign || campaign.ownerId !== userId) {
            throw new Error("Apenas o mestre da campanha pode alterar objetos do mapa.");
        }
        return map;
    }

    private async assertCanViewMap(userId: string, mapId: string) {
        const map = await this.mapRepository.findMapById(mapId);
        if (!map) throw new Error("Mapa não encontrado.");
        const campaign = await this.campaignRepository.findCampaignById(map.campaignId);
        if (!campaign) throw new Error("Campanha não encontrada.");
        if (campaign.ownerId === userId) return map;

        const membership = await this.campaignMemberRepository.findByCampaignAndUser(
            campaign.id,
            userId,
        );
        if (!membership || membership.currentMapId !== map.id) {
            throw new Error("Você não possui acesso a este mapa.");
        }
        return map;
    }

    private async assertChestItem(
        userId: string,
        type: string,
        itemRelativeId?: string | null,
    ) {
        if (type !== "chest") return;
        if (!itemRelativeId) throw new Error("Baús precisam possuir um item válido.");
        const item = await this.itemRepository.findItemById(itemRelativeId);
        if (!item || item.userId !== userId) {
            throw new Error("O item configurado no baú não foi encontrado.");
        }
    }

    private async complete(mutation: MapObjectMutation) {
        const maps = await Promise.all(mutation.affectedMapIds.map(async (mapId) => ({
            mapId,
            mapObjects: await this.repository.listByMapId(mapId),
        })));
        await emitMapObjectsUpdated(mutation.affectedMapIds, this.mapRepository);
        return { mapObject: mutation.mapObject, maps };
    }
}
