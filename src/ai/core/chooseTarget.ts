import type { Token } from "../../types/token";

export function chooseTarget(enemies: Token[]) {

  return enemies.sort(
    (a, b) => (a.currentLife ?? 0) - (b.currentLife ?? 0)
  )[0];

}