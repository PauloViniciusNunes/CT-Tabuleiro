import { MechanicDefinition } from "./mechanics/MechanicDefinition";

import { FireMechanic } from "./mechanics/FireMechanic";
import { GravityMechanic } from "./mechanics/GravityMechanic";
import { HalfDamageMechanic } from "./mechanics/HalfDamageMechanic";
import { InvulnerabilityMechanic } from "./mechanics/InvulnerabilityMechanic";
import { AccumulatedStrenghtBonusMechanic } from "./mechanics/AccumulatedStrenghtBonusMechanic";
import { WaterDamageImmunityMechanic } from "./mechanics/WaterDamageImmunityMechanic";
import { WaterEffectImmunityMechanic } from "./mechanics/WaterEffectImmunityMechanic";
import { FireImmunityBypassMechanic } from "./mechanics/FireImmunityBypassMechanic";
import { FireDamageByAffinityMechanic } from "./mechanics/FireDamageByAffinityMechanic";
import { SpellEnvironmentChangeDenialMechanic } from "./mechanics/SpellEnvironmentChangeDenialMechanic";
import { BurnDeniedSpellCasterMechanic } from "./mechanics/BurnDeniedSpellCasterMechanic";
import { LowestLifeEqualizationMechanic } from "./mechanics/LowestLifeEqualizationMechanic";
import { LowestManaEqualizationMechanic } from "./mechanics/LowestManaEqualizationMechanic";
import { NextTurnControlMechanic } from "./mechanics/NextTurnControlMechanic";
import { NextTurnFireAttackChargeMechanic } from "./mechanics/NextTurnFireAttackChargeMechanic";
import { SelfDestructionOnCharismaFailureMechanic } from "./mechanics/SelfDestructionOnCharismaFailureMechanic";
import { MagicalDamageRepeatMechanic } from "./mechanics/MagicalDamageRepeatMechanic";
import { MagicalDamageRollBonusAccumulationMechanic } from "./mechanics/MagicalDamageRollBonusAccumulationMechanic";
import { SuperPerceptionMechanic } from "./mechanics/SuperPerceptionMechanic";
import { PhysicalDamageRepeatMechanic } from "./mechanics/PhysicalDamageRepeatMechanic";
import { AbsorveDamageBonusMechanic } from "./mechanics/AbsorveDamageBonusMechanic";
import { BloodDrainMechanic } from "./mechanics/BloodDrainMechanic";
import { ElementaryTheftMechanic } from "./mechanics/ElementaryTheftMechanic";
import { DarkFireMechanic } from "./mechanics/DarkFireMechanic";
import { EletricMechanic } from "./mechanics/EletricMechanic";
import { DarkenedMechanic } from "./mechanics/DarkenedMechanic";
import { MagicWeaponMechanic } from "./mechanics/MagicWeaponMechanic";
import { DragonWingsMechanic } from "./mechanics/DragonWingsMechanic";
import { SwapLifeByManaMechanic } from "./mechanics/SwapLifeByManaMechanic";
import { NightVisionMechanic } from "./mechanics/NightVisionMechanic";
import { DamageCancelMechanic } from "./mechanics/DamageCancelMechanic";
import { PoisonChargeMechanic } from "./mechanics/PoisonChargeMechanic";
import { PoisonMechanic } from "./mechanics/PoisonMechanic";
import { ActionSurgeMechanic } from "./mechanics/ActionSurgeMechanic";
import { TreeExtraAttacksMechanic } from "./mechanics/TreeExtraAttacksMechanic";

export class MechanicRegistry {

    static map(type: string): MechanicDefinition {
        
        const record: Record<string, MechanicDefinition> = 
        {
            "fogo": new FireMechanic(),
            "gravidade": new GravityMechanic(),
            "dano-reduzido": new HalfDamageMechanic(),
            "invulnerabilidade": new InvulnerabilityMechanic(),
            "força-acumulada": new AccumulatedStrenghtBonusMechanic(),
            "imunidade-dano-agua": new WaterDamageImmunityMechanic(),
            "imunidade-efeito-agua": new WaterEffectImmunityMechanic(),
            "ignorar-imunidade-fogo": new FireImmunityBypassMechanic(),
            "dano-fogo-por-afinidade": new FireDamageByAffinityMechanic(),
            "negacao-alteracao-ambiente-spell": new SpellEnvironmentChangeDenialMechanic(),
            "queimacao-ao-negar-spell": new BurnDeniedSpellCasterMechanic(),
            "equalizacao-menor-vida": new LowestLifeEqualizationMechanic(),
            "equalizacao-menor-mana": new LowestManaEqualizationMechanic(),
            "controle-proximo-turno": new NextTurnControlMechanic(),
            "carga-fogo-proximo-turno": new NextTurnFireAttackChargeMechanic(),
            "autodestruicao-falha-carisma": new SelfDestructionOnCharismaFailureMechanic(),
            "repeticao-dano-magico": new MagicalDamageRepeatMechanic(),
            "acumulo-dano-magico-adicao": new MagicalDamageRollBonusAccumulationMechanic(),
            "super-percepcao": new SuperPerceptionMechanic(),
            "repeticao-dano-fisico": new PhysicalDamageRepeatMechanic(),
            "dano-para-bonus-forca": new AbsorveDamageBonusMechanic(),
            "drenar-sangue": new BloodDrainMechanic(),
            "roubo-elementar": new ElementaryTheftMechanic(),
            "fogo-negro": new DarkFireMechanic(),
            "eletrico": new EletricMechanic(),
            "escurecido": new DarkenedMechanic(),
            "arma-magica": new MagicWeaponMechanic(),
            "visao-noturna": new NightVisionMechanic(),
            "asas-dragao": new DragonWingsMechanic(),
            "vida-por-mana": new SwapLifeByManaMechanic(),
            "cancelar-dano": new DamageCancelMechanic(),
            "carga-veneno": new PoisonChargeMechanic(),
            "veneno": new PoisonMechanic(),
            "surto-acao": new ActionSurgeMechanic(),
            "action-surge": new ActionSurgeMechanic(),
            "tres-ataques-extra": new TreeExtraAttacksMechanic(),
        } 

        const definition = record[type]

        if (!definition) {
            throw new Error(`Mecânica não registrada para a tag "${type}".`)
        }

        return definition
    }

    static findDefinition(id: string): MechanicDefinition {
        
        const record: Record<string, MechanicDefinition> = 
        {
            "1": new FireMechanic(),
            "2": new GravityMechanic(),
            "3": new HalfDamageMechanic(),
            "4": new InvulnerabilityMechanic(),
            "5": new AccumulatedStrenghtBonusMechanic(),
            "6": new WaterDamageImmunityMechanic(),
            "7": new WaterEffectImmunityMechanic(),
            "8": new FireImmunityBypassMechanic(),
            "9": new FireDamageByAffinityMechanic(),
            "10": new SpellEnvironmentChangeDenialMechanic(),
            "11": new BurnDeniedSpellCasterMechanic(),
            "12": new LowestLifeEqualizationMechanic(),
            "13": new LowestManaEqualizationMechanic(),
            "14": new NextTurnControlMechanic(),
            "15": new NextTurnFireAttackChargeMechanic(),
            "16": new SelfDestructionOnCharismaFailureMechanic(),
            "17": new MagicalDamageRepeatMechanic(),
            "18": new MagicalDamageRollBonusAccumulationMechanic(),
            "19": new SuperPerceptionMechanic(),
            "20": new PhysicalDamageRepeatMechanic(),
            "21": new AbsorveDamageBonusMechanic(),
            "22": new BloodDrainMechanic(),
            "23": new ElementaryTheftMechanic(),
            "24": new DarkFireMechanic(),
            "25": new EletricMechanic(),
            "26": new DarkenedMechanic(),
            "27": new NightVisionMechanic(),
            "28": new MagicWeaponMechanic(),
            "29": new DragonWingsMechanic(),
            "30": new SwapLifeByManaMechanic(),
            "31": new DamageCancelMechanic(),
            "32": new PoisonChargeMechanic(),
            "33": new PoisonMechanic(),
            "34": new ActionSurgeMechanic(),
            "999": new TreeExtraAttacksMechanic(),
        }

        const definition = record[id]

        if (!definition) {
            throw new Error(`Mecânica não registrada para o ID "${id}".`)
        }

        return definition

    }

}
