// src/ai/executeAITurn.ts

import { decideAction }
  from "./ai";

import type { AIContext }
  from "./types/aiContext";

import type { ExecuteChoice }
  from "../types/executeChoice";

import type { Token }
  from "../types/token";

import { isInAttackRange }
  from "../utils/battleCalculations";

import { executeAIMovement }
  from "./executeAIMovement";

interface ExecuteAITurnParams {

  context: AIContext;

  handleExecuteAction: (
    choice: ExecuteChoice
  ) => void;

  moveToken: (
    tokenId: string,
    col: number,
    row: number
  ) => void;

  onCompleteTurn?: () => void;

}

export function executeAITurn({

  context,
  handleExecuteAction,
  moveToken,
  onCompleteTurn

}: ExecuteAITurnParams) {

  /*
    Segurança:
    IA precisa existir.
  */

  const self =
    context.self;

  if (!self) {

    console.warn(
      "IA sem token associado."
    );

    onCompleteTurn?.();

    return;

  }

  /*
    Decide ação.
  */

  const decision =
    decideAction(context);

  if (!decision) {

    console.warn(
      "IA não conseguiu decidir ação."
    );

    onCompleteTurn?.();

    return;

  }

  /*
    Apenas ações ofensivas.
  */

  if (decision.type !== "action") {

    onCompleteTurn?.();

    return;

  }

  /*
    Busca alvo.
  */

  const foundTarget =
    context.enemies.find(

      enemy =>

        enemy.id ===
        decision.choice.targetId

    );

  if (!foundTarget) {

    console.warn(
      "IA não encontrou alvo."
    );

    onCompleteTurn?.();

    return;

  }

  const target: Token =
    foundTarget;

  /*
    Tipo do ataque.
  */

  const attackType =
    ["forca", "destreza"]
      .includes(
        decision.choice.attribute
      )
      ? "fisico"
      : "magico";

  /*
    Função recursiva procedural.
  */

  const tryReachAndAttack = (

    currentSelf: Token

  ) => {

    console.info("Chamando função recursiva de movimento e ataque da IA. Self:", currentSelf, "Target:", target);

    const inRange =
      isInAttackRange(

        currentSelf,
        target,
        attackType

      );

    /*
      Já alcançou:
      atacar.
    */

    if (inRange) {
      console.info("IA está em alcance para atacar. Atacando e completando turno.");
      handleExecuteAction(
        decision.choice
      );

      onCompleteTurn?.();

      return;

    }

    /*
      Ainda fora:
      mover mais.
    */

    executeAIMovement({

      self: currentSelf,

      target,

      moveToken,

      onComplete: (

        updatedSelf

      ) => {

        /*
          Continua
          até alcançar.
        */

        tryReachAndAttack(
          updatedSelf
        );

      }

    });

  };

  /*
    Inicia fluxo.
  */

  tryReachAndAttack(
    self
  );

}