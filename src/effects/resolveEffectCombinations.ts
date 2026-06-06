import type { Token } from "../types/token";
import type { EffectType, CombinationResult } from "../types/effects";
import { tokenHasEffects } from "./effectsQuery";

export function resolveEffectCombinations(
    token: Token,
    incoming: EffectType
  ): CombinationResult | null {

    const has = (eff: EffectType[]) => tokenHasEffects(token, eff);

    if (has([incoming])) {
      return { remove: [incoming], add: incoming };
    }

    if (incoming === "explosao") {
      return {
        explosion: true,
        remove: ["queimando"],
        areaRadius: 1,
        areaDamage: 10,
        areaEffect: undefined,
        overlay: "overlay-explosao-area",
        gifPath: "/effects/explosion.gif"
      };
    }

    if (incoming === "toxic_explosao") {
      return {
        explosion: true,
        remove: ["envenenado"],
        add: "darkfire",
        areaRadius: 2,
        areaDamage: 10,
        areaEffect: "darkfire",
        overlay: "overlay-explosao-area",
        gifPath: "/effects/dark-poison-fire.gif"
      };
    }

    // ======== EXEMPLOS EXISTENTES ========
    //

    if (has(["congelando"]) && incoming === "queimando")
      return { remove: ["congelando", "queimando"] };

    if (has(["queimando"]) && incoming === "congelando")
      return { remove: ["queimando", "congelando"] };

    if (has(["congelando"]) && incoming === "darkfire")
      return { remove: ["congelando"], add: "darkfire" };

    if (has(["sangrando"]) && incoming === "queimando")
      return { remove: ["sangrando"], add: "queimando" };

    if (has(["afogando"]) && incoming === "eletrizado")
      return { remove: ["afogando"], add: "eletrizado", intensityMultiplier: 2 };

    // ======== Efeitos com Buff/Debuff ========

    if (incoming === "congelando") {
      return { remove: ["none"], add: ["destreza_debuff", "congelando"] };
    }
    // ========= 💥 GENERALIZAÇÃO DO SISTEMA DE EXPLOSÃO =========

    if (has(["queimando"]) && incoming === "eletrizado") {
      return {
        explosion: true,
        remove: ["queimando"],
        areaRadius: 1,
        areaDamage: 10,
        areaEffect: undefined,
        overlay: "overlay-explosao-area",
        gifPath: "/effects/explosion.gif"
      };
    }

    if (has(["eletrizado"]) && incoming === "queimando") {
      return {
        explosion: true,
        remove: ["eletrizado"],
        areaRadius: 1,
        areaDamage: 10,
        areaEffect: undefined,
        overlay: "overlay-explosao-area",
        gifPath: "/effects/explosion.gif"
      };
    }

    // ========= 🚀 NOVAS POSSIBILIDADES (SEM MEXER NO RESTO) =========


    // fogo + veneno → chama tóxica
    if (has(["envenenado"]) && incoming === "queimando") {
      return {
        explosion: true,
        remove: ["envenenado"],
        add: "darkfire",
        areaRadius: 2,
        areaDamage: 10,
        areaEffect: "darkfire",
        overlay: "overlay-explosao-area",
        gifPath: "/effects/dark-poison-fire.gif"
      };
    }

    // eletrizado + água → choque em corrente no raio 2
    if (has(["afogando"]) && incoming === "eletrizado") {
      return {
        remove: ["afogando"],
        add: "eletrizado",
        intensityMultiplier: 2,
        areaRadius: 2,
        areaEffect: "eletrizado",
        overlay: "overlay-shockwave"
      };
    }


    //
    // padrão
    //
    return null;
  }