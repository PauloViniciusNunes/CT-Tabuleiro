import type { DamageInput, DamageData } from "../../operators/DamageOperator";
import type { EnvironmentData, EnvironmentInput } from "../../operators/EnvironmentOperator";
import type { MovementData, MovementInput } from "../../operators/MovementOperator";
import type { RollData, RollInput } from "../../operators/RollOperator";
import type {
    MechanicApplicationData,
    MechanicApplicationInput,
} from "../../operators/MechanicApplicationOperator";
import type {
    TokenResourceData,
    TokenResourceInput,
} from "../../operators/TokenResourceOperator";
import type {
    PendingSpecialResponse,
    RequestSpecialResponseInput,
} from "../../special-response/types";
import { ManaIncrementData, ManaIncrementInput } from "../../operators/ManaIncrementOperator";
import type {
    LifeIncrementData,
    LifeIncrementInput,
} from "../../operators/LifeIncrementOperator";
import type {
    LifeDecreaseData,
    LifeDecreaseInput,
} from "../../operators/LifeDecreaseOperator";
import type {
    ManaDecreaseData,
    ManaDecreaseInput,
} from "../../operators/ManaDecreaseOperator";
import type {
    ActionIncrementData,
    ActionIncrementInput,
} from "../../operators/ActionIncrementOperator";

export interface EngineContext {
    mapId: string,
    battleId: string,
    currentTokenId: string,
    boardTokens: unknown[],
    mapObjs: unknown[],
    operations: {
        damage: (
            intent: Omit<DamageInput, "battleId">,
        ) => Promise<DamageData>,
        lifeIncrement: (
            intent: Omit<LifeIncrementInput, "battleId">,
        ) => Promise<LifeIncrementData>,
        lifeDecrease: (
            intent: Omit<LifeDecreaseInput, "battleId">,
        ) => Promise<LifeDecreaseData>,
        roll: (
            intent: Omit<RollInput, "battleId">,
        ) => Promise<RollData>,
        move: (
            intent: Omit<MovementInput, "battleId">,
        ) => Promise<MovementData>,
        changeEnvironment: (
            intent: Omit<EnvironmentInput, "battleId" | "mapId">,
        ) => Promise<EnvironmentData>,
        applyMechanic: (
            intent: Omit<MechanicApplicationInput, "battleId">,
        ) => Promise<MechanicApplicationData>,
        setResources: (
            intent: Omit<TokenResourceInput, "battleId">,
        ) => Promise<TokenResourceData>,
        manaIncrement: (
            intent: Omit<ManaIncrementInput, "battleId">,
        ) => Promise<ManaIncrementData>,
        manaDecrease: (
            intent: Omit<ManaDecreaseInput, "battleId">,
        ) => Promise<ManaDecreaseData>,
        actionIncrement: (
            intent: Omit<ActionIncrementInput, "battleId">,
        ) => Promise<ActionIncrementData>,
        removeMechanic: (
            mechanicId: string,
            reason?: string,
        ) => Promise<boolean>,
    },
    specialResponses: {
        request: (
            input: Omit<RequestSpecialResponseInput, "battleId">,
        ) => Promise<PendingSpecialResponse>,
    },
}
