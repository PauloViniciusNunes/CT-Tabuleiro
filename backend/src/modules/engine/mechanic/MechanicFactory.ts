import { MechanicRegistry } from "./MechanicRegistry";
import { MechanicInstance } from "./mechanics/MechanicInstance";

export class MechanicFactory {

    static create(
        tokenId: string,
        type: string,
        customMetadata?: Record<string, unknown> 
    ): MechanicInstance {

        const registry = MechanicRegistry.map(type);

        // 🟢 1. Se a carta/efeito passou uma duração customizada, usa ela; senão pega o padrão (defaultDuration)
        const isPassive = customMetadata?.passive === true;
        const duration = isPassive
            ? undefined
            : typeof customMetadata?.duration === "number"
                ? customMetadata.duration
                : registry.defaultDuration;

        // 🟢 2. O mesmo para a intensidade (útil para cartas mais fortes/fracas)
        const intensity = typeof customMetadata?.intensity === "number"
            ? customMetadata.intensity
            : registry.defaultIntensity;

        return {
            id: crypto.randomUUID(),
            definitionId: registry.id,
            name: registry.name,
            sourceTokenId: tokenId,
            intensity,
            duration,
            metadata: {
                mechanicName: registry.name,
                ...structuredClone(registry.config ?? {}),
                ...(customMetadata ?? {})
            }           
        }

    }

}
