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
  ) => boolean;

  moveToken: (
    tokenId: string,
    col: number,
    row: number
  ) => void;

  onCompleteTurn?: (
    result?: {
      actionStarted: boolean;
    }
  ) => void;

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

    onCompleteTurn?.({
      actionStarted: false
    });

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

    onCompleteTurn?.({
      actionStarted: false
    });

    return;

  }

  /*
    Apenas ações ofensivas.
  */

  if (decision.type !== "action") {

    onCompleteTurn?.({
      actionStarted: false
    });

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

    onCompleteTurn?.({
      actionStarted: false
    });

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
      const actionStarted =
        handleExecuteAction(
          decision.choice
        );

      onCompleteTurn?.({
        actionStarted
      });

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
        const didMove =
          updatedSelf.position.col !== currentSelf.position.col ||
          updatedSelf.position.row !== currentSelf.position.row;

        if (!didMove) {
          console.warn(
            "IA não conseguiu avançar até o alvo."
          );

          onCompleteTurn?.({
            actionStarted: false
          });

          return;
        }

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
