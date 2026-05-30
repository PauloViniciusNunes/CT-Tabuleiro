export interface ResourceSpend {
    usedMana: number;
    usedActions: number;

}

export function chooseResourceSpend(): ResourceSpend {

    return {

        usedMana: 0,
        usedActions: 1
    };

}