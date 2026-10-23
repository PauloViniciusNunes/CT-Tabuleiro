import type { TokenInstance } from "@prisma/client";

import { isInAttackRange } from "../../utils/calculations";
import type { AiTurnDecision } from "../types/AiDecision";
import {
    chance,
    randomChoice,
    randomInteger,
    type RandomSource,
} from "../utils/random";

interface ActionCandidate {
    readonly actionType: string;
    readonly displayType: string;
    readonly attribute: string;
    readonly attackType: "fisico" | "magico";
}

const COMBAT_ACTIONS: readonly ActionCandidate[] = [
    {
        actionType: "ataque_fisico",
        displayType: "Ataque Físico",
        attribute: "forca",
        attackType: "fisico",
    },
    {
        actionType: "surpreender",
        displayType: "Surpreender",
        attribute: "destreza",
        attackType: "fisico",
    },
    {
        actionType: "desnortear",
        displayType: "Desnortear",
        attribute: "sabedoria",
        attackType: "magico",
    },
    {
        actionType: "previnir",
        displayType: "Previnir",
        attribute: "inteligencia",
        attackType: "magico",
    },
];

interface AiActionDecisionInput {
    readonly token: TokenInstance;
    readonly enemies: readonly TokenInstance[];
    readonly availableActions: number;
    readonly hasUsableCard: boolean;
    readonly hasAvailableTransformation: boolean;
}

function utilityChoice(
    actionType: "card_selection" | "transformar" | "mana_recover",
    usedActions: number,
): AiTurnDecision {
    const displayType = actionType === "card_selection"
        ? "Seleção de Card"
        : actionType === "transformar"
            ? "Transformar"
            : "Recarga de Mana";
    return {
        kind: "execute",
        choice: {
            type: displayType,
            actionType,
            attribute: "destreza",
            targetId: null,
            usedActions,
            usedMana: 0,
            usedCertaintyDie: false,
            pos: 1,
            item: null,
            selectedMechanic: "neutro",
        },
    };
}

/** Chooses only actions currently legal for the autonomous token. */
export function decideAiTurnAction(
    input: AiActionDecisionInput,
    random: RandomSource = Math.random,
): AiTurnDecision {
    const availableActions = Math.max(0, Math.floor(input.availableActions));
    if (input.token.currentLife <= 0 || availableActions < 1) {
        return { kind: "pass" };
    }

    const combatCandidates = COMBAT_ACTIONS.flatMap((action) => {
        const targets = input.enemies.filter((enemy) =>
            enemy.currentLife > 0 &&
            isInAttackRange(input.token, enemy, action.attackType),
        );
        return targets.length > 0 ? [{ action, targets }] : [];
    });

    const decisionKinds: Array<"combat" | "card" | "transform" | "mana"> = [];
    if (combatCandidates.length > 0) decisionKinds.push("combat", "combat", "combat");
    if (input.hasUsableCard) decisionKinds.push("card");
    if (input.hasAvailableTransformation && !input.token.isTransformation) {
        decisionKinds.push("transform");
    }
    if (input.token.currentMana < input.token.maxMana) decisionKinds.push("mana");

    if (decisionKinds.length === 0 || chance(0.1, random)) {
        return { kind: "pass" };
    }

    const selectedKind = randomChoice(decisionKinds, random);
    if (selectedKind === "card") {
        return utilityChoice("card_selection", 1);
    }
    if (selectedKind === "transform") {
        return utilityChoice("transformar", 1);
    }
    if (selectedKind === "mana") {
        return utilityChoice(
            "mana_recover",
            randomInteger(1, availableActions, random),
        );
    }

    const selectedCombat = randomChoice(combatCandidates, random);
    if (!selectedCombat) return { kind: "pass" };
    const target = randomChoice(selectedCombat.targets, random);
    if (!target) return { kind: "pass" };

    const usedActions = randomInteger(1, availableActions, random);
    const availableMana = Math.max(0, input.token.currentMana);
    const usedMana = availableMana > 0 && chance(0.5, random)
        ? randomInteger(1, Math.min(3, availableMana), random)
        : 0;
    const tokenElements = Array.isArray(input.token.tokenPrimaryElement)
        ? input.token.tokenPrimaryElement.filter((element): element is string =>
            typeof element === "string" && element.length > 0,
        )
        : [];
    const selectedMechanic = usedMana > 0
        ? randomChoice(tokenElements, random) ?? "neutro"
        : "neutro";

    return {
        kind: "execute",
        choice: {
            type: selectedCombat.action.displayType,
            actionType: selectedCombat.action.actionType,
            attribute: selectedCombat.action.attribute,
            targetId: target.id,
            usedActions,
            usedMana,
            usedCertaintyDie:
                (input.token.certaintyDiceRemaining ?? 0) > 0 && chance(0.12, random),
            pos: 1,
            item: null,
            selectedMechanic,
        },
    };
}
