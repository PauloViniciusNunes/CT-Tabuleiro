// src/utils/paralysis.ts
import type { ParalysisState } from '../types/status';

export function canDefenderReact(attackUsedMana: number, state: ParalysisState): boolean {
  if (state === 'paralisia') {
    // Convencional: não reage a nenhum ataque
    return false;
  }
  if (state === 'paralisia_rapida') {
    // Rápida: não reage apenas a ataques SEM mana
    return attackUsedMana > 0;
  }
  return true;
}

export function nextParalysisAfterHit(current: ParalysisState, attackUsedMana: number, remainingActions: number): ParalysisState {

  console.log("> DELTA ACTIONS: ", remainingActions);
  if(remainingActions > 0 && (current === 'paralisia_rapida' && attackUsedMana <= 0))
  {
    return current;
  }

  if(remainingActions > 0 && current === 'paralisia')
  {
    return current;
  }

  if (current === 'paralisia' && attackUsedMana > 0)
  { 
    return 'paralisia_rapida';
  }

  return 'none';
}
