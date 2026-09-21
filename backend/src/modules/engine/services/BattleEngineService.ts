import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { CardRepository } from "@/modules/cards/repositories/CardRepository";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";

import { BattleGetter } from "../context/BattleGetter";
import { BattleSetter } from "../context/BattleSetter";
import { PendingGetter } from "../context/PendingGetter";
import { PendingSetter } from "../context/PendingSetter";
import { MechanicEngine } from "../mechanic/MechanicEngine";
import type { OperatorContainer } from "../operators/OperatorContainer";
import { OperatorType } from "../operators/OperatorType";
import type { ActionRollParams, RollResult } from "../utils/calculations";

export interface BattleEngineServiceDependencies {
    readonly tokenInstanceRepository?: TokenTemplateRepository;
    readonly battleStateRepository?: BattleStateRepository;
    readonly pendingQueueRepository?: PendingQueueRepository;
    readonly mapRepository?: MapRepository;
    readonly itemRepository?: ItemRepository;
    readonly cardRepository?: CardRepository;
    readonly campaignRepository?: CampaignRepository;
    readonly battleGetter?: BattleGetter;
    readonly battleSetter?: BattleSetter;
    readonly pendingGetter?: PendingGetter;
    readonly pendingSetter?: PendingSetter;
    readonly operators?: OperatorContainer;
}

/** Shared dependency container for every BattleEngine service. */
export abstract class BattleEngineService {
    protected readonly tokenInstanceRepository: TokenTemplateRepository;
    protected readonly battleStateRepository: BattleStateRepository;
    protected readonly pendingQueueRepository: PendingQueueRepository;
    protected readonly mapRepository: MapRepository;
    protected readonly itemRepository: ItemRepository;
    protected readonly cardRepository: CardRepository;
    protected readonly campaignRepository: CampaignRepository;

    protected readonly battleGetter: BattleGetter;
    protected readonly battleSetter: BattleSetter;
    protected readonly pendingGetter: PendingGetter;
    protected readonly pendingSetter: PendingSetter;
    protected readonly operators: OperatorContainer;

    constructor(dependencies: BattleEngineServiceDependencies = {}) {
        this.tokenInstanceRepository =
            dependencies.tokenInstanceRepository ?? new TokenTemplateRepository();
        this.battleStateRepository =
            dependencies.battleStateRepository ?? new BattleStateRepository();
        this.pendingQueueRepository =
            dependencies.pendingQueueRepository ?? new PendingQueueRepository();
        this.mapRepository = dependencies.mapRepository ?? new MapRepository();
        this.itemRepository = dependencies.itemRepository ?? new ItemRepository();
        this.cardRepository = dependencies.cardRepository ?? new CardRepository();
        this.campaignRepository =
            dependencies.campaignRepository ?? new CampaignRepository();

        this.battleGetter = dependencies.battleGetter ?? new BattleGetter();
        this.battleSetter = dependencies.battleSetter ?? new BattleSetter();
        this.pendingGetter = dependencies.pendingGetter ?? new PendingGetter();
        this.pendingSetter = dependencies.pendingSetter ?? new PendingSetter();
        this.operators = dependencies.operators ?? MechanicEngine.operators;
    }

    /**
     * Single roll boundary for BattleEngine services. A cancelled roll never
     * exposes a fabricated result to callers that would otherwise spend it.
     */
    protected async resolveActionRoll(
        battleId: string,
        params: Omit<ActionRollParams, "CRI">,
        cause: string,
        metadata?: Readonly<Record<string, unknown>>,
    ): Promise<RollResult> {
        const resolution = await this.operators.execute(OperatorType.ROLL, {
            battleId,
            params,
            cause,
            metadata,
        });

        if (resolution.cancelled || !resolution.result) {
            throw new Error("A rolagem foi cancelada por uma mecânica.");
        }

        return resolution.result;
    }
}
