/* Map actions types to ActionDispatchOperator and others. */
export enum ActionType {
    ATTACK = "attack",
    SURPRISE = "surprise",
    MANA_RECOVER = "mana.recover",
    CARD_DISPATCH = "card.dispatch",
    PREDICT = "predict",
    DISORIENT = "disorient"
}

const CLIENT_ACTION_TYPE: Readonly<Record<string, ActionType>> = {
    [ActionType.ATTACK]: ActionType.ATTACK,
    [ActionType.SURPRISE]: ActionType.SURPRISE,
    [ActionType.MANA_RECOVER]: ActionType.MANA_RECOVER,
    [ActionType.CARD_DISPATCH]: ActionType.CARD_DISPATCH,
    [ActionType.PREDICT]: ActionType.PREDICT,
    [ActionType.DISORIENT]: ActionType.DISORIENT,
    ataque_fisico: ActionType.ATTACK,
    surpreender: ActionType.SURPRISE,
    mana_recover: ActionType.MANA_RECOVER,
    card_selection: ActionType.CARD_DISPATCH,
    previnir: ActionType.PREDICT,
    desnortear: ActionType.DISORIENT,
};

export function resolveActionType(value: unknown): ActionType {
    if (typeof value !== "string" || !CLIENT_ACTION_TYPE[value]) {
        throw new Error("O tipo da ação selecionada não é suportado pela engine.");
    }
    return CLIENT_ACTION_TYPE[value];
}
