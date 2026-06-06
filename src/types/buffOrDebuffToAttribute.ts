import type { EffectType } from "./effects"

export const buffOrDebuffToAttribute: Partial<Record<EffectType, string>> = {
    forca_buff: "forca",
    destreza_buff: "destreza",
    consistencia_buff: "consistencia",
    inteligencia_buff: "inteligencia",
    sabedoria_buff: "sabedoria",
    carisma_buff: "carisma",
    forca_debuff: "forca",
    destreza_debuff: "destreza",
    consistencia_debuff: "consistencia",
    inteligencia_debuff: "inteligencia",
    sabedoria_debuff: "sabedoria",
    carisma_debuff: "carisma",
  }