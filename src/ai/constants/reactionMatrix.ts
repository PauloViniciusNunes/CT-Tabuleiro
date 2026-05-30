import type { ReactionType }
from "../types/reactionType";

export const reactionMatrix:
Record<string, ReactionType[]> = {

  forca: [
    "destreza",
    "consistencia"
  ],

  destreza: [
    "destreza"
  ],

  inteligencia: [
    "inteligencia"
  ],

  sabedoria: [
    "sabedoria"
  ]

};