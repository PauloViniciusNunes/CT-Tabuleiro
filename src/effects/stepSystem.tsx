import type { Token } from "../types/token";
import type { EffectType } from "../types/effects";
import { buffOrDebuffToAttribute } from "../types/buffOrDebuffToAttribute";
import type { EngineContext } from "../types/BoardEngineContext";

export function stepTokenEffect(context: EngineContext, token: Token) {
    if (!token.tokenEffects) return;

    const updatedEffects = token.tokenEffects
        .map(effect => {

            const durationDecrement = effect.duration === undefined ? undefined : effect.duration - 1;

            const buffEffects: EffectType[] = ["forca_buff", "destreza_buff", "consistencia_buff", "inteligencia_buff", "sabedoria_buff", "carisma_buff"];
            const debuffEffects: EffectType[] = ["forca_debuff", "destreza_debuff", "consistencia_debuff", "inteligencia_debuff", "sabedoria_debuff", "carisma_debuff"];

            if (buffEffects.includes(effect.effectType) && durationDecrement !== undefined && durationDecrement <= 0) {
                if (buffOrDebuffToAttribute[effect.effectType]) {
                    const attr = buffOrDebuffToAttribute[effect.effectType];

                    if (attr !== undefined) {
                        switch (attr) {
                            case "forca":
                                token.ocassionalAddition.forca =
                                    (token.ocassionalAddition.forca ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "destreza":
                                token.ocassionalAddition.destreza =
                                    (token.ocassionalAddition.destreza ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "consistencia":
                                token.ocassionalAddition.consistencia =
                                    (token.ocassionalAddition.consistencia ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "inteligencia":
                                token.ocassionalAddition.inteligencia =
                                    (token.ocassionalAddition.inteligencia ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "sabedoria":
                                token.ocassionalAddition.sabedoria =
                                    (token.ocassionalAddition.sabedoria ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "carisma":
                                token.ocassionalAddition.carisma =
                                    (token.ocassionalAddition.carisma ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;
                        }

                        context.attributeTable.current[token.id][attr] = (context.attributeTable.current[token.id][attr] ?? 0) - 2 * effect.intensity;;
                    }
                }
            }

            if (debuffEffects.includes(effect.effectType) && durationDecrement !== undefined && durationDecrement <= 0) {
                if (buffOrDebuffToAttribute[effect.effectType]) {
                    const attr = buffOrDebuffToAttribute[effect.effectType];

                    if (attr !== undefined) {
                        switch (attr) {
                            case "forca":
                                token.ocassionalAddition.forca =
                                    (token.ocassionalAddition.forca ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "destreza":
                                token.ocassionalAddition.destreza =
                                    (token.ocassionalAddition.destreza ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "consistencia":
                                token.ocassionalAddition.consistencia =
                                    (token.ocassionalAddition.consistencia ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "inteligencia":
                                token.ocassionalAddition.inteligencia =
                                    (token.ocassionalAddition.inteligencia ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "sabedoria":
                                token.ocassionalAddition.sabedoria =
                                    (token.ocassionalAddition.sabedoria ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;

                            case "carisma":
                                token.ocassionalAddition.carisma =
                                    (token.ocassionalAddition.carisma ?? 0) -
                                    context.attributeTable.current[token.id][attr];
                                break;
                        }


                        context.attributeTable.current[token.id][attr] = (context.attributeTable.current[token.id][attr] ?? 0) + 2 * effect.intensity;
                        console.log(">>> REVERSO DA OCASIONAL DEU: ", context.attributeTable.current[token.id][attr]);
                    }
                }
            }

            return effect.duration === undefined ? effect : { ...effect, duration: durationDecrement };
        })
        .filter(effect => effect.duration === undefined || effect.duration > 0);


    // AQUI: você precisa persistir a mudança
    context.setBoardTokens(prev =>
        prev.map(t =>
            t.id === token.id
                ? { ...t, tokenEffects: updatedEffects }
                : t
        )
    );
}