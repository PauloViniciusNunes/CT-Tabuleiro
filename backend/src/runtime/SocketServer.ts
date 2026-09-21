import { createServer } from "http";
import { Server } from "socket.io";

import { Rooms } from "./Rooms";
import { SocketEvent } from "./Events";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { syncBattleState } from "@/modules/engine/utils/syncBattleState";
import { JWTService } from "@/modules/auth/services/JWTService";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { CampaignMemberRepository } from "@/modules/asset-library/members/repositories/CampaignMembersServices";
import { UserRepository } from "@/modules/auth/repositories/UserRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { PendingGetter } from "@/modules/engine/context/PendingGetter";
import { toPublicPendingSpecialResponse } from "@/modules/engine/special-response/types";
import { isAllowedFrontendOrigin } from "@/shared/cors/origin";

interface CampaignPresenceUser {
    id: string;
    name: string;
    color: string;
}

interface CampaignPresenceEntry extends CampaignPresenceUser {
    socketIds: Set<string>;
}

const PRESENCE_COLORS = [
    "#38bdf8",
    "#a78bfa",
    "#34d399",
    "#fbbf24",
    "#fb7185",
    "#fb923c",
    "#2dd4bf",
];

export class SocketServer {

    private static instance: SocketServer;

    private readonly io: Server;
    private readonly battleStateRepository = new BattleStateRepository();
    private readonly pendingQueueRepository = new PendingQueueRepository();
    private readonly pendingGetter = new PendingGetter(this.pendingQueueRepository);
    private readonly jwtService = new JWTService();
    private readonly campaignRepository = new CampaignRepository();
    private readonly mapRepository = new MapRepository();
    private readonly campaignMemberRepository = new CampaignMemberRepository();
    private readonly userRepository = new UserRepository();

    /** Campaign -> user -> all tabs/connections currently present. */
    private readonly campaignPresence = new Map<string, Map<string, CampaignPresenceEntry>>();
    /** Socket -> campaigns joined by that connection, used for safe cleanup. */
    private readonly campaignsBySocket = new Map<string, Map<string, string>>();
    /** Prevents a delayed authenticated join from resurrecting a presence after leave. */
    private readonly requestedCampaignsBySocket = new Map<string, Set<string>>();

    private constructor() {

        console.log("Socket Server iniciado");

        const httpServer = createServer();

        this.io = new Server(httpServer, {
            cors: {
                origin: (origin, callback) => {
                    if (isAllowedFrontendOrigin(origin)) {
                        callback(null, true);
                        return;
                    }

                    callback(new Error(`Origem não permitida: ${origin}`));
                },
                credentials: true,
            },
        });

        this.io.on("connection", (socket) => {

            console.log("Cliente conectado:", socket.id);

            socket.on("join-map", async (data: unknown) => {
                if (!data || typeof data !== "object") {
                    return;
                }

                const { mapId, token } = data as { mapId?: unknown; token?: unknown };

                if (typeof mapId !== "string" || !mapId) {
                    return;
                }

                const userId = this.getAuthenticatedUserId(token);
                if (!userId || !(await this.canAccessMap(userId, mapId))) {
                    return;
                }

                socket.join(Rooms.map(mapId));

                console.log(`${socket.id} entrou na sala ${Rooms.map(mapId)}`);

                try {
                    const battle = await this.battleStateRepository.findByMapId(mapId);

                    if (battle) {
                        socket.emit(SocketEvent.BATTLE_UPDATED, battle);
                        await syncBattleState(battle.id);
                    }
                } catch (error) {
                    console.error("Não foi possível sincronizar a batalha da room:", error);
                }

            });

            socket.on("join-campaign", async (data: unknown) => {
                if (!data || typeof data !== "object") {
                    return;
                }

                const { campaignId, token } = data as { campaignId?: unknown; token?: unknown };
                if (typeof campaignId !== "string" || !campaignId) {
                    return;
                }

                const userId = this.getAuthenticatedUserId(token);
                if (!userId) {
                    return;
                }

                this.requestCampaignJoin(socket.id, campaignId);

                if (!(await this.canAccessCampaign(userId, campaignId))) {
                    this.cancelCampaignJoin(socket.id, campaignId);
                    return;
                }

                if (!this.isCampaignJoinRequested(socket.id, campaignId)) {
                    return;
                }

                socket.join(Rooms.campaign(campaignId));
                await this.addCampaignPresence(socket.id, campaignId, userId);
            });

            socket.on("leave-campaign", (data: unknown) => {
                if (!data || typeof data !== "object") {
                    return;
                }

                const { campaignId } = data as { campaignId?: unknown };
                if (typeof campaignId !== "string" || !campaignId) {
                    return;
                }

                this.cancelCampaignJoin(socket.id, campaignId);
                this.removeCampaignPresence(socket.id, campaignId);
                socket.leave(Rooms.campaign(campaignId));
            });

            // ============================
            // Relay dos eventos do cliente
            // ============================

            socket.on(SocketEvent.TOKEN_CREATED, (token) => {

                this.io
                    .to(Rooms.map(token.mapId))
                    .emit(SocketEvent.TOKEN_CREATED, token);

            });

            socket.on(SocketEvent.TOKEN_UPDATED, (token) => {

                this.io
                    .to(Rooms.map(token.mapId))
                    .emit(SocketEvent.TOKEN_UPDATED, token);

                console.log("Token Upado: ", token.name)

            });

            socket.on(SocketEvent.TOKEN_DELETED, (token) => {

                this.io
                    .to(Rooms.map(token.mapId))
                    .emit(SocketEvent.TOKEN_DELETED, token);

            });

            socket.on(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, (id) => {

                this.io
                    .emit(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, id);

            });

            socket.on(SocketEvent.CARD_CREATED, (card) => {

                this.io
                    .to(Rooms.map(card.mapId))
                    .emit(SocketEvent.CARD_CREATED, card);

            });

            socket.on(SocketEvent.CARD_UPDATED, (card) => {

                this.io
                    .to(Rooms.map(card.mapId))
                    .emit(SocketEvent.CARD_UPDATED, card);

            });

            socket.on(SocketEvent.MAP_UPDATED, (map) => {

                this.io
                    .to(Rooms.map(map.id))
                    .emit(SocketEvent.MAP_UPDATED, map);

            });

            socket.on(SocketEvent.CAMPAIGN_MEMBER_MAP_UPDATED, (payload) => {
                if (!payload || typeof payload.campaignId !== "string") {
                    return;
                }

                this.io
                    .to(Rooms.campaign(payload.campaignId))
                    .emit(SocketEvent.CAMPAIGN_MEMBER_MAP_UPDATED, payload);
            });

            socket.on(SocketEvent.CHAT_MESSAGE, (message) => {

                this.io
                    .to(Rooms.map(message.mapId))
                    .emit(SocketEvent.CHAT_MESSAGE, message);

            });

            socket.on(SocketEvent.TURN_STARTED, (combat) => {

                this.io
                    .to(Rooms.map(combat.mapId))
                    .emit(SocketEvent.TURN_STARTED, combat);

            });

            socket.on(SocketEvent.BATTLE_STARTED, (combat) => {

                this.io
                    .to(Rooms.map(combat.mapId))
                    .emit(SocketEvent.BATTLE_STARTED, combat);

            });


            socket.on(SocketEvent.BATTLE_UPDATED, (combat) => {

                this.io
                    .to(Rooms.map(combat.mapId))
                    .emit(SocketEvent.BATTLE_UPDATED, combat);

            });


            socket.on(SocketEvent.PENDING_ATTACK, (attack) => { //prototipo

                this.io
                    .emit(SocketEvent.PENDING_ATTACK, attack);

            });

            socket.on(SocketEvent.PENDING_ESQUIVA_ROLL, (attack) => { //prototipo

                this.io
                    .emit(SocketEvent.PENDING_ESQUIVA_ROLL, attack);

            });

            socket.on(SocketEvent.PENDING_FREE_RESPONSE, (attack) => { //prototipo

                this.io
                    .emit(SocketEvent.PENDING_FREE_RESPONSE, attack);

            });

            socket.on(SocketEvent.PENDING_SPECIAL_RESPONSE, async (payload: unknown) => {
                if (!payload || typeof payload !== "object") return;
                const mapId = (payload as { mapId?: unknown }).mapId;
                if (typeof mapId !== "string" || !mapId) return;

                try {
                    const battle = await this.battleStateRepository.findByMapId(mapId);
                    const pendingQueue = battle
                        ? await this.pendingQueueRepository.findByBattleStateId(battle.id)
                        : null;
                    const pending = pendingQueue
                        ? await this.pendingGetter.getPendingSpecialResponse(pendingQueue.id)
                        : null;

                    // Nunca retransmite a definição recebida do cliente. O banco é
                    // a fonte autoritativa do formulário montado pelo backend.
                    this.io
                        .to(Rooms.map(mapId))
                        .emit(SocketEvent.PENDING_SPECIAL_RESPONSE, {
                            mapId,
                            pending: pending
                                ? toPublicPendingSpecialResponse(pending)
                                : null,
                        });
                } catch (error) {
                    console.error("Não foi possível sincronizar a resposta especial:", error);
                }
            });

            socket.on(SocketEvent.PENDING_CARD_RESOLUTION, (token) => {
                this.io.emit(SocketEvent.PENDING_CARD_RESOLUTION, token)
            })

            socket.on(SocketEvent.FRONTEND_CARD_SELECTION, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_CARD_SELECTION, value);

            });

            socket.on(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, value);

            });

            socket.on(SocketEvent.FRONTEND_ADD_PREVIEW_CELLS, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_ADD_PREVIEW_CELLS, value);

            });

            socket.on(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, value);

            });

            socket.on(SocketEvent.FRONTEND_SELECTED_TARGET, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_SELECTED_TARGET, value);

            });

            socket.on(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, value);

            });

            socket.on(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, value);

            });

            socket.on(SocketEvent.FRONTEND_IN_TARGET_SELECTION, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_IN_TARGET_SELECTION, value);

            });

            socket.on(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, value);

            });

            socket.on(SocketEvent.FRONTEND_AMBIENT_PIVOT_PHASE, (value) => {

                this.io
                    .emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_PHASE, value);

            });

            socket.on(SocketEvent.FRONTEND_SELECTED_PIVOTS, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_SELECTED_PIVOTS, value);

            });

            socket.on(SocketEvent.FRONTEND_ARMED_CARD, (value) => { //prototipo

                this.io
                    .emit(SocketEvent.FRONTEND_ARMED_CARD, value);

            });

            socket.on("disconnect", () => {

                console.log("Cliente desconectado:", socket.id);
                this.removeSocketCampaignPresences(socket.id);
                this.requestedCampaignsBySocket.delete(socket.id);

            });

        });

        const configuredPort = Number(process.env.PORT ?? 3001);
        const port = Number.isInteger(configuredPort) && configuredPort > 0
            ? configuredPort
            : 3001;

        httpServer.listen(port, "0.0.0.0", () => {
            console.log(`Socket Server escutando em 0.0.0.0:${port}`);
        });

    }

    static getInstance(): SocketServer {

        if (!SocketServer.instance) {
            SocketServer.instance = new SocketServer();
        }

        return SocketServer.instance;

    }

    getIO(): Server {

        return this.io;

    }

    private getAuthenticatedUserId(token: unknown): string | null {
        if (typeof token !== "string" || !token) {
            return null;
        }

        try {
            return this.jwtService.verify(token).userId;
        } catch {
            return null;
        }
    }

    private async canAccessCampaign(userId: string, campaignId: string): Promise<boolean> {
        const campaign = await this.campaignRepository.findCampaignById(campaignId);

        if (!campaign) {
            return false;
        }

        return campaign.ownerId === userId
            || await this.campaignMemberRepository.isMember(campaignId, userId);
    }

    private async canAccessMap(userId: string, mapId: string): Promise<boolean> {
        const map = await this.mapRepository.findMapById(mapId);

        if (!map) {
            return false;
        }

        const campaign = await this.campaignRepository.findCampaignById(map.campaignId);
        if (!campaign) {
            return false;
        }

        if (campaign.ownerId === userId) {
            return true;
        }

        const membership = await this.campaignMemberRepository.findByCampaignAndUser(
            campaign.id,
            userId,
        );

        return membership?.currentMapId === map.id;
    }

    private async addCampaignPresence(
        socketId: string,
        campaignId: string,
        userId: string,
    ): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return;
        }

        const usersInCampaign = this.campaignPresence.get(campaignId) ?? new Map();
        const existing = usersInCampaign.get(userId);

        if (existing) {
            existing.socketIds.add(socketId);
        } else {
            usersInCampaign.set(userId, {
                id: user.id,
                name: user.name,
                color: this.colorForUser(user.id),
                socketIds: new Set([socketId]),
            });
        }

        this.campaignPresence.set(campaignId, usersInCampaign);

        const socketCampaigns = this.campaignsBySocket.get(socketId) ?? new Map<string, string>();
        socketCampaigns.set(campaignId, userId);
        this.campaignsBySocket.set(socketId, socketCampaigns);

        this.emitCampaignPresence(campaignId);
    }

    private requestCampaignJoin(socketId: string, campaignId: string): void {
        const requests = this.requestedCampaignsBySocket.get(socketId) ?? new Set<string>();
        requests.add(campaignId);
        this.requestedCampaignsBySocket.set(socketId, requests);
    }

    private isCampaignJoinRequested(socketId: string, campaignId: string): boolean {
        return this.requestedCampaignsBySocket.get(socketId)?.has(campaignId) ?? false;
    }

    private cancelCampaignJoin(socketId: string, campaignId: string): void {
        const requests = this.requestedCampaignsBySocket.get(socketId);
        requests?.delete(campaignId);

        if (requests?.size === 0) {
            this.requestedCampaignsBySocket.delete(socketId);
        }
    }

    private removeSocketCampaignPresences(socketId: string): void {
        const campaigns = this.campaignsBySocket.get(socketId);
        if (!campaigns) {
            return;
        }

        for (const campaignId of [...campaigns.keys()]) {
            this.removeCampaignPresence(socketId, campaignId);
        }
    }

    private removeCampaignPresence(socketId: string, campaignId: string): void {
        const socketCampaigns = this.campaignsBySocket.get(socketId);
        const userId = socketCampaigns?.get(campaignId);
        if (!userId) {
            return;
        }

        socketCampaigns?.delete(campaignId);
        if (socketCampaigns?.size === 0) {
            this.campaignsBySocket.delete(socketId);
        }

        const usersInCampaign = this.campaignPresence.get(campaignId);
        const presence = usersInCampaign?.get(userId);
        if (!presence) {
            return;
        }

        presence.socketIds.delete(socketId);
        if (presence.socketIds.size === 0) {
            usersInCampaign?.delete(userId);
        }

        if (usersInCampaign?.size === 0) {
            this.campaignPresence.delete(campaignId);
        }

        this.emitCampaignPresence(campaignId);
    }

    private emitCampaignPresence(campaignId: string): void {
        const users = [...(this.campaignPresence.get(campaignId)?.values() ?? [])]
            .map(({ id, name, color }) => ({ id, name, color }));

        this.io.to(Rooms.campaign(campaignId)).emit(
            SocketEvent.CAMPAIGN_PRESENCE_UPDATED,
            { campaignId, users },
        );
    }

    private colorForUser(userId: string): string {
        const hash = [...userId].reduce(
            (total, character) => total + character.charCodeAt(0),
            0,
        );

        return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
    }

}
