import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import type { MechanicApplicationData } from "../../operators/MechanicApplicationOperator";
import { normalizeElement } from "../../utils/elementalAffinity";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import { metadataElementList } from "./elementalInterceptorMetadata";

function mechanicAffectsToken(
    mechanic: Readonly<MechanicInstance>,
    tokenId: string,
): boolean {
    return mechanic.metadata.targetId === tokenId ||
        (mechanic.metadata.targetId === undefined && mechanic.sourceTokenId === tokenId);
}

/**
 * Cancels an application when the target has enough configured resistance to
 * that mechanic tag. A resistance mechanic only needs `resistedMechanicTags`
 * and `resistanceGrade` in its instance metadata.
 */
export class TargetMechanicResistanceInterceptor extends Interceptor<MechanicApplicationData> {
    readonly type = InterceptorType.MECHANIC_APPLICATION;

    constructor(
        private readonly battleStateRepository = new BattleStateRepository(),
    ) {
        super();
    }

    async intercept(
        data: Readonly<MechanicApplicationData>,
        mechanic: Readonly<MechanicInstance>,
    ): Promise<MechanicApplicationData> {
        if (data.sourceTokenId !== mechanic.sourceTokenId) {
            return { ...data };
        }

        const minimumResistanceGrade = mechanic.metadata.minimumResistanceGrade;
        if (
            typeof minimumResistanceGrade !== "number" ||
            !Number.isFinite(minimumResistanceGrade) ||
            minimumResistanceGrade <= 0
        ) {
            return { ...data };
        }

        const battle = await this.battleStateRepository.findById(data.battleId);
        const activeMechanics = Array.isArray(battle?.activeMechanics)
            ? battle.activeMechanics as unknown as MechanicInstance[]
            : [];
        const appliedTag = normalizeElement(data.tag);
        const isResisted = activeMechanics.some((candidate) => {
            if (!mechanicAffectsToken(candidate, data.targetTokenId)) return false;

            const grade = candidate.metadata.resistanceGrade;
            return typeof grade === "number" &&
                Number.isFinite(grade) &&
                grade >= minimumResistanceGrade &&
                metadataElementList(candidate, "resistedMechanicTags").includes(appliedTag);
        });

        return isResisted
            ? { ...data, cancelled: true }
            : { ...data };
    }
}
