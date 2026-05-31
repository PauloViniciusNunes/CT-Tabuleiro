import type { Token } from "../../types/token";

export function chooseTarget(enemies: Token[]) {

  return enemies
    .filter(enemy => (enemy.currentLife ?? 1) > 0)
    .sort(
      (a, b) => (a.currentLife ?? 0) - (b.currentLife ?? 0)
    )[0];

}
