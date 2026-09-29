/* ========= CLASSES DE MECÂNICAS ========= */
import { MechanicEvent } from "./events/MechanicEvent";
import { MechanicRegistry } from "./MechanicRegistry";
import { MechanicDefinition } from "./mechanics/MechanicDefinition";
import {
    deduplicateMechanicInstances,
    type MechanicInstance,
} from "./mechanics/MechanicInstance";

/* ========= HELPERS DE BATALHA ========= */
import { BattleSetter } from "../context/BattleSetter";
import { BattleGetter } from "../context/BattleGetter";

/* ========= REPOSITORIOS DE STATE ========= */
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { MechanicEventType } from "./MechanicEventType";
import { routeSpecialFields } from "./utils/routeSpecialFields";
import { MechanicEntityInstance } from "./types/mechanicEntity";
import {
    Interceptor,
    type ActiveInterceptor,
    type InterceptableData,
} from "./interceptors/Interceptor";
import { InterceptorType } from "./interceptors/InterceptorType";
import type { EngineContext } from "./types/engineContext";
import { OperatorContainer } from "../operators/OperatorContainer";
import { OperatorType } from "../operators/OperatorType";
import { SpecialResponseRequestService } from "../special-response/SpecialResponseRequestService";


/* ========= CLASSE PRINCIPAL ========= */
export class MechanicEngine {
    static readonly operators = new OperatorContainer({
        intercept: MechanicEngine.intercept,
        dispatchEvent: MechanicEngine.process,
    })
    static readonly specialResponses = new SpecialResponseRequestService()

    static async process(
        battleId: string,
        event: MechanicEvent,
        data?: Record<string, unknown>,
    ) {
        // Repositórios
        const battleStateRepository = new BattleStateRepository()

        // Helpers
        const battleGetter = new BattleGetter()
        const battleSetter = new BattleSetter()

        if (!battleId) throw new Error("Não foi passado um id válido.")
        const battleState = await battleStateRepository.findById(battleId)
        if (!battleState) throw new Error("Não foi possível encontrar o estado de batalha.")
        const currentToken = await battleGetter.getCurrentBattleToken(battleId)
        if (!currentToken) throw new Error("Nenhum token está jogando agora?")

        const currentTokenId = currentToken.id



        const rawMechanics = Array.isArray(battleState.activeMechanics)
            ? (battleState.activeMechanics as unknown as MechanicInstance[])
            : [];

        // RENDERIZAR VISUAL ANTES DE QUALQUER MECÂNICA.
        const rawEntitiesOverlays = await battleGetter.getMechanicEntities(battleId)
        const activeMechanicOverlays: MechanicEntityInstance[] = structuredClone(rawEntitiesOverlays)

        if (rawEntitiesOverlays.length > 0) {
            // Enviar sinal para deletar overlays no banco de dados
            for (const overlay of activeMechanicOverlays) {
                if ((currentTokenId === overlay.triggerId) &&
                    event.type === MechanicEventType.TURN_INIT
                ) {

                    await battleSetter.decreaseMechanicEntityDuration(battleId, overlay.id)
                }
            }
        }

        // DEPOIS DA PARTE VISUAL, PROCESSAR AS MECÂNICAS, CASO HAJAM
        const uniqueMechanics = deduplicateMechanicInstances(rawMechanics);

        if (uniqueMechanics.length !== rawMechanics.length) {
            await battleSetter.updateActiveMechanics(
                battleId,
                (activeMechanics) => deduplicateMechanicInstances(activeMechanics),
            );
        }

        if (uniqueMechanics.length === 0) {
            return;
        }

        // Cria um snapshot isolado e já normalizado para que cada mecânica
        // processe o evento no máximo uma vez.
        const activeMechanicsSnapshot: MechanicInstance[] =
            structuredClone(uniqueMechanics);


        const baseEngineContext = await battleGetter.getEngineContext(battleId)
        const engineContext: EngineContext = {
            ...baseEngineContext,
            currentTokenId,
            operations: {
                damage: (intent) => MechanicEngine.operators.execute(OperatorType.DAMAGE, {
                    ...intent,
                    battleId,
                }),
                lifeIncrement: (intent) => MechanicEngine.operators.execute(
                    OperatorType.LIFE_INCREMENT,
                    { ...intent, battleId },
                ),
                lifeDecrease: (intent) => MechanicEngine.operators.execute(
                    OperatorType.LIFE_DECREASE,
                    { ...intent, battleId },
                ),
                roll: (intent) => MechanicEngine.operators.execute(OperatorType.ROLL, {
                    ...intent,
                    battleId,
                }),
                move: (intent) => MechanicEngine.operators.execute(OperatorType.MOVEMENT, {
                    ...intent,
                    battleId,
                }),
                changeEnvironment: (intent) => MechanicEngine.operators.execute(OperatorType.ENVIRONMENT, {
                    ...intent,
                    battleId,
                    mapId: baseEngineContext.mapId,
                }),
                applyMechanic: (intent) => MechanicEngine.operators.execute(
                    OperatorType.MECHANIC_APPLICATION,
                    {
                        ...intent,
                        battleId,
                    },
                ),
                setResources: (intent) => MechanicEngine.operators.execute(
                    OperatorType.RESOURCE_SET,
                    {
                        ...intent,
                        battleId,
                    },
                ),
                manaIncrement: (intent) => MechanicEngine.operators.execute(
                    OperatorType.MANA_INCREMENT,
                    {
                        ...intent,
                        battleId,
                    }
                ),
                manaDecrease: (intent) => MechanicEngine.operators.execute(
                    OperatorType.MANA_DECREASE,
                    {
                        ...intent,
                        battleId,
                    },
                ),
                actionIncrement: (intent) => MechanicEngine.operators.execute(
                    OperatorType.ACTION_INCREMENT,
                    {
                        ...intent,
                        battleId,
                    },
                ),
                removeMechanic: (mechanicId, reason) =>
                    MechanicEngine.operators.execute(
                        OperatorType.MECHANIC_REMOVAL,
                        {
                            battleId,
                            mechanicId,
                            reason,
                        },
                    ),
            },
            specialResponses: {
                request: (input) => MechanicEngine.specialResponses.execute({
                    ...input,
                    battleId,
                }),
            },
        }

        // Observar token atual
        // 🟢 3. Itera estritamente sobre a CÓPIA do estado
        for (const mechanic of activeMechanicsSnapshot) {

            const definition: MechanicDefinition = MechanicRegistry.findDefinition(mechanic.definitionId)
            const hasEvent = definition.abstractlistensTo.includes(event.type)

            if (hasEvent) {
                const behaviors = definition.behavior

                for (const behavior of behaviors) {
                    if (behavior.lister().includes(event.type)) {
                        // 🟢 Lembrar de aguardar o execute caso ele seja assíncrono
                        await behavior.execute(
                            engineContext,
                            mechanic,
                            event,
                            data,
                        )
                    }
                }
            }

            /**
             * Roteamento de campos especiais: visa escalar campos que podem surgir futuramente apenas
             * alimentando as condicionais de routeSpecial fields. A arquitetura prevê que esse método
             * não escalará muito. Necessário para que MechanicEngine não se torne um 'God Object'.
             */
            await routeSpecialFields(battleId, mechanic)

            // Reduzir o tempo das MecanincInstaces que possuem
            if ((currentTokenId === mechanic.sourceTokenId) &&
                event.type === MechanicEventType.TURN_INIT
            ) {
                if (
                    typeof mechanic.duration === "number" &&
                    mechanic.duration <= 1
                ) {
                    await MechanicEngine.removeMechanicInstance(
                        battleId,
                        mechanic.id,
                        "duration-expired",
                    );
                } else {
                    await battleSetter.decreaseMechanicInstance(battleId, mechanic.id)
                }
            }


        }

    }

    static async intercept<T extends InterceptableData>(
        type: InterceptorType,
        data: T,
        battleId: string,
    ): Promise<T> {
        const battleStateRepository = new BattleStateRepository()

        if (!battleId) {
            throw new Error("Não foi passada uma batalha para a interceptação.")
        }

        const battleState = await battleStateRepository.findById(battleId)
        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha da operação interceptada.")
        }

        const rawMechanics = Array.isArray(battleState.activeMechanics) ? (battleState.activeMechanics as unknown as MechanicInstance[]) : [];
    
        const mechanicsSnapshot = structuredClone(
            deduplicateMechanicInstances(rawMechanics),
        )

        const activeInterceptors: ActiveInterceptor<T>[] = []

        for (const mechanic of mechanicsSnapshot) {
            const definition = MechanicRegistry.findDefinition(mechanic.definitionId)

            for (const interceptor of definition.interceptors) {
                if (interceptor.type !== type) continue

                activeInterceptors.push({
                    interceptor: interceptor as Interceptor<T>,
                    mechanic,
                })
            }
        }

        return Interceptor.executeAll(data, activeInterceptors)
    }

    static async createMechanic(
        tokenId: string,
        battleId: string,
        tag: string,
        customMetadata?: Record<string, unknown>
    ) {
        if(tag === "none" || tag === "neutro") return

        const application = await MechanicEngine.operators.execute(
            OperatorType.MECHANIC_APPLICATION,
            {
                battleId,
                sourceTokenId: tokenId,
                tag,
                mechanicMetadata: customMetadata,
            },
        );

        return application.instance;
    }

    /** Compatibility boundary for existing callers; removal lives in an operator. */
    static async removeMechanicInstance(
        battleId: string,
        mechanicId: string,
        reason = "explicit-removal",
    ): Promise<boolean> {
        const removal = await MechanicEngine.operators.execute(
            OperatorType.MECHANIC_REMOVAL,
            {
                battleId,
                mechanicId,
                reason,
            },
        );

        return removal.removed;
    }
}
