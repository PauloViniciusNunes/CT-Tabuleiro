import type { Token } from "../types/token";
import type {
    EffectType,
    EffectMoment,
    TokenPrimaryElement,
    CombinationResult
} from "../types/effects";

import { getTokensInRadius } from "./effectsQuery";
import { buffOrDebuffToAttribute } from "../types/buffOrDebuffToAttribute";
import type { EngineContext } from "../types/BoardEngineContext";
import { resolveEffectCombinations } from "./resolveEffectCombinations";
import { effectGrowthRules } from "../types/effects";


export function applyAreaDamage(
    context: EngineContext,
    center: Token,
    radius: number,
    baseDamage: number
) {
    context.setBoardTokens(prev =>
        prev.map(t => {
            const dx = Math.abs(
                t.position.col - center.position.col
            );

            const dy = Math.abs(
                t.position.row - center.position.row
            );

            if (dx <= radius && dy <= radius) {
                return {
                    ...t,
                    currentLife: Math.max(
                        0,
                        (t.currentLife ?? 0) - baseDamage
                    )
                };
            }

            return t;
        })
    );
}

export function applyAreaEffect(
    context: EngineContext,
    center: Token,
    radius: number,
    effect: EffectType,
    intensity: number,
    duration: number,
    resultantElement: TokenPrimaryElement
) {
    const affectedTokens = getTokensInRadius(
        context.boardTokens,
        center,
        radius
    );

    affectedTokens.forEach(token => {
        applyTokenEffect(
            context,
            token,
            resultantElement,
            effect,
            duration,
            intensity,
            "InTurn"
        );
    });
}

export function addLargeExplosionOverlay(
    context: EngineContext,
    tokenId: string,
    radius: number,
    overlayType: string,
    gifPath: string
) {
    const size =
        (radius * 2 + 1) * context.cellSize;

    const offset =
        -radius * context.cellSize;

    const overlay = {
        id: crypto.randomUUID(),
        type: overlayType ?? "overlay-explosao-area",
        size,
        offset,
        gifPath: gifPath ?? "/effects/explosion.gif",
    };

    // adiciona overlay
    context.setBoardTokens(prev =>
        prev.map(token =>
            token.id === tokenId
                ? {
                    ...token,
                    visualOverlays: [
                        ...(token.visualOverlays ?? []),
                        overlay
                    ],
                }
                : token
        )
    );

    // remove automaticamente
    setTimeout(() => {
        context.setBoardTokens(prev =>
            prev.map(token =>
                token.id === tokenId
                    ? {
                        ...token,
                        visualOverlays: (
                            token.visualOverlays ?? []
                        ).filter(
                            overlayItem =>
                                overlayItem.id !== overlay.id
                        ),
                    }
                    : token
            )
        );
    }, 1000);
}

export function triggerExplosion(
    context: EngineContext,
    centerToken: Token,
    baseIntensity: number,
    combo: CombinationResult | null
) {
    const radius = 1;

    const damage =
        baseIntensity * (combo?.areaDamage ?? 1);

    console.log(
        `💥 EXPLOSÃO disparada no token ${centerToken.name}`
    );

    // 1) Dano em área
    applyAreaDamage(
        context,
        centerToken,
        radius,
        damage
    );

    // 2) Aplicação de efeitos em área
    applyAreaEffect(
        context,
        centerToken,
        radius,
        combo?.areaEffect ?? "none",
        Math.ceil(baseIntensity / 2),
        4,
        combo?.areaElement ?? "neutro"
    );

    // 3) Overlay visual
    addLargeExplosionOverlay(
        context,
        centerToken.id,
        radius,
        combo?.overlay ?? "overlay-explosao-area",
        combo?.gifPath ?? "/effects/explosion.gif"
    );
}

export function applyTokenEffect(
    context: EngineContext,
    token: Token,
    resultantElement: TokenPrimaryElement,
    typeEffect: EffectType,
    duration: number | undefined,
    intensity: number,
    effectMoment: EffectMoment,
    effectIsCardInstace?: boolean,
    cardInstanceId?: string,
) {
    token.tokenEffects ??= [];

    const combo = resolveEffectCombinations(
        token,
        typeEffect
    );

    const buffEffects: EffectType[] = [
        "forca_buff",
        "destreza_buff",
        "consistencia_buff",
        "inteligencia_buff",
        "sabedoria_buff",
        "carisma_buff"
    ];

    const debuffEffects: EffectType[] = [
        "forca_debuff",
        "destreza_debuff",
        "consistencia_debuff",
        "inteligencia_debuff",
        "sabedoria_debuff",
        "carisma_debuff"
    ];

    const adds = combo?.add
        ? Array.isArray(combo.add)
            ? combo.add
            : [combo.add]
        : [typeEffect];

    const buffDebuffMultiplier = 3;

    for (const effType of adds) {

        if (buffEffects.includes(effType)) {

            if (buffOrDebuffToAttribute[effType]) {

                context.attributeTable.current[token.id][buffOrDebuffToAttribute[effType]] =
                    (
                        context.attributeTable.current[token.id][buffOrDebuffToAttribute[effType]]
                        ?? 0
                    )
                    + buffDebuffMultiplier * intensity;

                switch (buffOrDebuffToAttribute[effType]) {

                    case "forca":
                        token.ocassionalAddition.forca =
                            (token.ocassionalAddition.forca ?? 0)
                            + buffDebuffMultiplier * intensity;
                        break;

                    case "destreza":
                        token.ocassionalAddition.destreza =
                            (token.ocassionalAddition.destreza ?? 0)
                            + buffDebuffMultiplier * intensity;
                        break;

                    case "consistencia":
                        token.ocassionalAddition.consistencia =
                            (token.ocassionalAddition.consistencia ?? 0)
                            + buffDebuffMultiplier * intensity;
                        break;

                    case "inteligencia":
                        token.ocassionalAddition.inteligencia =
                            (token.ocassionalAddition.inteligencia ?? 0)
                            + buffDebuffMultiplier * intensity;
                        break;

                    case "sabedoria":
                        token.ocassionalAddition.sabedoria =
                            (token.ocassionalAddition.sabedoria ?? 0)
                            + buffDebuffMultiplier * intensity;
                        break;

                    case "carisma":
                        token.ocassionalAddition.carisma =
                            (token.ocassionalAddition.carisma ?? 0)
                            + buffDebuffMultiplier * intensity;
                        break;

                    default:
                        break;
                }
            }
        }

        if (debuffEffects.includes(effType)) {

            if (buffOrDebuffToAttribute[effType]) {

                context.attributeTable.current[token.id][buffOrDebuffToAttribute[effType]] =
                    (
                        context.attributeTable.current[token.id][buffOrDebuffToAttribute[effType]]
                        ?? 0
                    )
                    - buffDebuffMultiplier * intensity;

                switch (buffOrDebuffToAttribute[effType]) {

                    case "forca":
                        token.ocassionalAddition.forca =
                            (token.ocassionalAddition.forca ?? 0)
                            - buffDebuffMultiplier * intensity;
                        break;

                    case "destreza":
                        token.ocassionalAddition.destreza =
                            (token.ocassionalAddition.destreza ?? 0)
                            - buffDebuffMultiplier * intensity;
                        break;

                    case "consistencia":
                        token.ocassionalAddition.consistencia =
                            (token.ocassionalAddition.consistencia ?? 0)
                            - buffDebuffMultiplier * intensity;
                        break;

                    case "inteligencia":
                        token.ocassionalAddition.inteligencia =
                            (token.ocassionalAddition.inteligencia ?? 0)
                            - buffDebuffMultiplier * intensity;
                        break;

                    case "sabedoria":
                        token.ocassionalAddition.sabedoria =
                            (token.ocassionalAddition.sabedoria ?? 0)
                            - buffDebuffMultiplier * intensity;
                        break;

                    case "carisma":
                        token.ocassionalAddition.carisma =
                            (token.ocassionalAddition.carisma ?? 0)
                            - buffDebuffMultiplier * intensity;
                        break;

                    default:
                        break;
                }
            }
        }
    }

    if (combo && combo.explosion) {
        console.log("💥 Combo gerou explosão!");

        if (combo.remove) {
            token.tokenEffects = token.tokenEffects.filter(
                eff => !combo.remove!.includes(eff.effectType)
            );
        }

        triggerExplosion(
            context,
            token,
            intensity,
            combo
        );

        return;
    }
    if (combo?.remove?.length) {
        token.tokenEffects = token.tokenEffects.filter(
            eff => !combo.remove.includes(eff.effectType)
        );
    }

    let effectsToApply: EffectType[];

    if (combo?.add) {
        effectsToApply = Array.isArray(combo.add)
            ? combo.add
            : [combo.add];
    } else {
        effectsToApply = [typeEffect];
    }

    if (
        combo &&
        combo.add === undefined &&
        combo.remove?.length
    ) {
        return;
    }

    if (combo?.intensityMultiplier) {
        intensity *= combo.intensityMultiplier;
    }

    const permanentEffects: TokenPrimaryElement[] = [
        "darkfire",
        "darkelectric"
    ];

    const effectDuration =
        permanentEffects.includes(resultantElement)
            ? undefined
            : duration ?? 8;

    const uniqueEffects = Array.from(
        new Set(effectsToApply)
    );

    for (const eff of uniqueEffects) {

        const existing =
            token.tokenEffects.find(
                e => e.effectType === eff
            );

        let finalIntensity = intensity;

        if (existing) {
            const model =
                effectGrowthRules[eff] ?? "B";

            if (model === "A") {
                finalIntensity =
                    existing.intensity * 2;
            }
        }

        token.tokenEffects =
            token.tokenEffects.filter(
                e => e.effectType !== eff
            );

        token.tokenEffects.push({
            isCardResultant: effectIsCardInstace,
            cardResultantId: cardInstanceId,
            duration: effectDuration,
            intensity: finalIntensity,
            effectType: eff,
            elementResultant: resultantElement,
            effectMoment,
        });

        token.tokenEffects =
            token.tokenEffects.filter(
                (e, i, arr) =>
                    arr.findIndex(
                        x => x.effectType === e.effectType
                    ) === i
            );
    }
}

export function applyEffectsCausality(token: Token, context: EngineContext  ) {

    if (!token.tokenEffects) return;

    token.tokenEffects.map(effect => {
      if (["queimando", "corroendo", "afogando", "darkfire", "eletrizado", "eletrizado_dark", "envenenado", "sangrando"].includes(effect.effectType)) {
        context.setBoardTokens((prev) =>
          prev.map((t) =>
            t.id === token.id
              ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - (effect.elementResultant === token.tokenPrimaryDisvantege ? 2 * (effect.intensity) : effect.intensity)) }
              : t
          )
        );
      }
    });
}