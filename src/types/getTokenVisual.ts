import { effectVisualMap } from "./tokenEffectVisual";
import type { Token } from "../types/token";

export function getTokenVisualEffects(token: Token) {
  const classes: string[] = [];
  const overlays: { id: string; className: string }[] = [];

  if (!Array.isArray(token.tokenEffects)) {
    return { classes, overlays };
  }

  for (const eff of token.tokenEffects) {
    const visual = effectVisualMap[eff.effectType];

    if (visual?.classes) classes.push(...visual.classes);
    if (visual?.overlays) {
      for (const ov of visual.overlays) {
        overlays.push({
          id: `${token.id}-${eff.effectType}-${ov}`,
          className: ov
        });
      }
    }

  }

  // fallback para efeitos não mapeados
  if (classes.length === 0 && overlays.length === 0) {
    classes.push("effect-generic");
  }

  return { classes, overlays };
}
