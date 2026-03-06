export const EFFECT_TYPES = [
  "none",
  "queimando",
  "darkfire",
  "eletrizado_dark",
  "explosao",
  "toxic_explosao",
  "congelando",
  "envenenado",
  "eletrizado",
  "enfraquecido",
  "petrificado",
  "corroendo",
  "preso",
  "sangrando",
  "silenciado",
  "radioativo",
  "purificado",
  "cego",
  "intagível",
  "afogando",
  "forca_buff",
  "destreza_buff",
  "consistencia_buff",
  "inteligencia_buff",
  "sabedoria_buff",
  "carisma_buff",
  "vida_buff",
  "mana_buff",
  "forca_debuff",
  "destreza_debuff",
  "consistencia_debuff",
  "inteligencia_debuff",
  "sabedoria_debuff",
  "carisma_debuff",
  "vulneravel_fogo",
  "vulneravel_gelo",
  "vulneravel_som",
  "vulneravel_terra",
  "vulneravel_eletrico",
  "vulneravel_ar",
  "vulneravel_arcano",
  "vulneravel_profano",
  "neutral_magicalized",
  "caozificado",
  "almificado",
  "psicotico",
  "enferrujado",
  "encobrizado",
  "hidrogenado",
  "fosforizado",
  "heliozinado",
  "neozinado",
  "argonizado",
  "criptonizado",
  "xeonizado",
  "radonizado",
  "sombrificado",
  "clareado",
  "esporizado",
  "resinizado",
  "plasmizado",
  "entropizado",
  "miasmisado",
  "eterificado",
  "encumbriado",
  "aetherificado",
  "antimagicalizado",
  "envaziado",
  "radioativado",
  "vetorizado",
  "primordializado",
  "queimando_azul",
  "queimando_verde",
  "queimando_vermelho",
  "queimando_cromatizado",
  "etherizado",
  "gratitacionalizado",
  "espaciado",
  "realizado",
] as const;

export type EffectType = typeof EFFECT_TYPES[number];


export type EffectMoment = "InTurn" | "AllTurn" | "Area"



export type TokenPrimaryElement = 
  "neutro" |
  "fogo"  |
  "terra" |
  "vento" |
  "agua"  |
  "darkfire" |
  "arcano" |
  "acido" |
  "eletrico" |
  "veneno" |
  "som" |
  "gelo" |
  "sangue" |
  "darkelectric" |
  "magia_neutra" |
  "caos" |
  "alma" |
  "psiquico" |
  "ferro" |
  "cobre" |
  "hidrogenio" |
  "fosforo" |
  "helio" |
  "neonio" |
  "argonio" |
  "criptonio" |
  "xenonio" |
  "radonio" |
  "sombra" |
  "luz" |
  "esporos" |
  "resina" |
  "plasma" |
  "entropia" |
  "miasma" |
  "eter" |
  "encumbria" |
  "aether" |
  "antimagia" |
  "vazio" |
  "radiacao" |
  "vetor" |
  "primordialidade" |
  "fogo_azul" |
  "fogo_verde" |
  "fogo_vermelho" |
  "fogo_cromatico" |
  "ethereum" |
  "gravidade" |
  "espaco" |
  "realidade";

export type TokenPrimaryDisvantage = TokenPrimaryElement | "none";

export type TokenEffect = {
    duration: number | undefined,
    elementResultant: TokenPrimaryElement,
    effectType: EffectType,
    intensity: number,
    effectMoment: EffectMoment,
    isCardResultant?: boolean, // Adicionado
    cardResultantId?: string,  // Adicionado
}