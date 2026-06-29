    import type { Item } from "../types/item";
    import type { Token } from "../types/token";
    import type { BattleState } from "../types/battle";
    import type { Card } from "../types/card";
    import type { Target } from "../types/target";
    import type { EngineContext } from "../types/BoardEngineContext";
    import type { TokenPrimaryElement } from "../types/effects";
    import type { EffectType } from "../types/effects";
    import type { EffectMoment } from "../types/effects";

    export function useArtificeItem(
        engineContext: EngineContext,
        item: Item, 
        index: number, 
        tokenId: string,
        target: Target,
        applyTokenEffect: (context: EngineContext, token: Token, resultantElement: TokenPrimaryElement, typeEffect: EffectType, duration: number | undefined, intensity: number, effectMoment: EffectMoment, effectIsCardInstace?: boolean, cardInstanceId?: string) => void, 
        boardTokens: Token[],
        setBoardTokens: React.Dispatch<React.SetStateAction<Token[]>>, 
        battleState: BattleState,
        handleCardResolution:(currentId: string, target: Target, card: Card, isArtifice: boolean) => void,
        setPendingCardResolution: React.Dispatch<React.SetStateAction<Token | null>>
    )
    {
        // Returns Earlys
        if(battleState.status !== "In Battle") return
        if(tokenId !== battleState.currentActorId) return
        if(!item.isArtifice) return
        const token = boardTokens.find((t) => t.id === tokenId);

        // Soma na vida (+/-)
        const lastDamagerClear = item.artficeSettings.lifeAdd < 0

        if(lastDamagerClear)
        {
            setBoardTokens((prev) =>
            prev.map((t) =>
                t.maxLife && t.id === tokenId
                ? { ...t, currentLife: Math.min(Math.max(0, (t.currentLife ?? 0) + item.artficeSettings.lifeAdd), t.maxLife), lastDamagerId: undefined }
                : t
            ))   
        }
        else
        {
            setBoardTokens((prev) =>
            prev.map((t) =>
                t.maxLife && t.id === tokenId
                ? { ...t, currentLife: Math.min(Math.max(0, (t.currentLife ?? 0) + item.artficeSettings.lifeAdd), t.maxLife)}
                : t
            )) 
        }
        // Soma na mana (+/-)
        setBoardTokens((prev) =>
            prev.map((t) =>
                t.maxMana && t.id === tokenId
                ? { ...t, currentMana: Math.min(Math.max(0, (t.currentMana ?? 0) + item.artficeSettings.manaAdd), t.maxMana) }
                : t
            )
        );
        // Aplicação de Efeito
        if(item.artficeSettings.effectToApply)
        {
            
            if(token) applyTokenEffect(engineContext, token, "neutro", item.artficeSettings.effectToApply,8,1,"InTurn", false, "")
        }
        // Execução do Card
        if(item.artficeSettings.cardDispach)
        {
            setPendingCardResolution(token ?? null);
            handleCardResolution(tokenId, target, item.artficeSettings.cardDispach, true)
        }
        // Remover do inventário
        setBoardTokens(prev =>
        prev.map(t => {

            if (t.id !== tokenId)
            return t;

            const currentItems =
            t.inventory.commonSlot ?? [];

            return {
            ...t,

            inventory: {
                ...t.inventory,

                commonSlot: currentItems.filter(
                (_, i) => i !== index
                ),
            },
            };

        })
        );        

    }