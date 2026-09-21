import { MechanicEvent } from "../events/MechanicEvent";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { BattleSetter } from "../../context/BattleSetter";
import { BattleGetter } from "../../context/BattleGetter";
import { MechanicPreRemovedEvent } from "../events/MechanicPreRemovedEvent";


export class RemoveMagicWeaponBehavior extends Behavior {
    constructor(private readonly battleGetter = new BattleGetter()) {
        super();
    }
    
    lister(): MechanicEventType[] {
        return [
            MechanicEventType.MECHANIC_PRE_REMOVED
        ]
    }

    async execute(context: EngineContext, mechanic: MechanicInstance, event: MechanicEvent): Promise<void> {
        if (!(event instanceof MechanicPreRemovedEvent)) return;
        if (mechanic.name !== "magic-weapon") return;

        // Remover arma mágico do token que encerrou a mecânica e possui a Magic Weapon no inventário
        const tokenId = mechanic.sourceTokenId;
        if(!tokenId) {
            throw new Error("Um tokenId não válido foi passado.")
        }

        const battleSetter = new BattleSetter()
        await battleSetter.removeItemFromTokenInventory(context.battleId, tokenId, "Magic Weapon")
    }
}
