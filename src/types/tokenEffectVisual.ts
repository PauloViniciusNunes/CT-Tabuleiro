import type { EffectType } from "../types/effects";

export const effectVisualMap: Partial<Record<
  EffectType,
  {
    classes?: string[];
    overlays?: string[];     // OBS: agora aceita múltiplos overlays
  }
>> = {
  queimando: {
    classes: ["animate-fire-glow"],
    overlays: ["overlay-fire"],
  },

  congelando: {
    classes: ["freeze-filter"],
    overlays: ["overlay-ice"],
  },

  eletrizado: {
    classes: ["electric-shake"],
    overlays: ["overlay-electric"],
  },

  envenenado: {
    classes: ["poison-tint"],
    overlays: ["overlay-poison"],
  },

  preso: {
    classes: ["opacity-60", "grayscale"],
    overlays: ["overlay-lock"],
  },

  darkfire: {
    classes: ["shadow-purple-glow"],
    overlays: ["overlay-darkfire"],
  },
  sangrando: {
    classes: ["bleending-glow"],
    overlays: ["bleending-overlay"],
  },
  eletrizado_dark: {
    classes: ["darkelectric-glow"],
    overlays: ["darkelectric-overlay"],    
  },
  explosao: {
    overlays: ["overlay-explosao-area"],
  },


};
