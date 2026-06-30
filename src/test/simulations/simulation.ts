import { BattleEngine } from "../../combat/engine/BattleEngine";
import type { ExecuteChoice } from "../../types/executeChoice";
import type { RollResult } from "../../types/battle";
import { createEngineContext } from "../helpers/createEngineContext";
import { createToken } from "../helpers/createToken";

class SilentAudio {
  constructor(_url?: string) { }

  play() {
    return Promise.resolve();
  }
}

(globalThis as typeof globalThis & { Audio?: typeof Audio }).Audio ??=
  SilentAudio as unknown as typeof Audio;

type TestCase = {
  name: string;
  run: () => void;
};

const defenseRoll = (total: number): RollResult => ({
  rawRolls: [total],
  total,
  usedMana: 0,
  CRI: 0,
});

const expect = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createAction = (targetId: string, usedActions = 1): ExecuteChoice => ({
  actionType: "attack",
  attribute: "forca",
  type: "Ataque básico",
  targetId,
  usedMana: 0,
  usedActions,
  usedCertaintyDie: true,
  pos: 1,
});

const createBattle = () => {
  const ctx = createEngineContext();
  const engine = new BattleEngine();
  const blue = createToken({
    id: "blue",
    createId: "blue-template",
    name: "Blue",
    team: "Blue",
    position: { col: 25, row: 25 },
    currentLife: 100,
    maxLife: 100,
  });
  const red = createToken({
    id: "red",
    createId: "red-template",
    name: "Red",
    team: "Red",
    position: { col: 26, row: 25 },
    currentLife: 100,
    maxLife: 100,
  });

  ctx.setBoardTokens([blue, red]);
  engine.setContext(ctx);
  engine.handleStartBattle();
  engine.update();

  return { ctx, engine };
};

const getCurrentActorId = (ctx: ReturnType<typeof createEngineContext>) =>
  ctx.battleState.turnOrder[ctx.battleState.currentTurnIndex]?.tokenId;

const getEnemyId = (ctx: ReturnType<typeof createEngineContext>, actorId: string) =>
  ctx.boardTokens.find((token) => token.id !== actorId)?.id;

const tests: TestCase[] = [
  {
    name: "inicia batalha e sincroniza refs",
    run: () => {
      const { ctx } = createBattle();
        
      expect(ctx.battleState.status === "In Battle", "batalha deveria iniciar");
      expect(ctx.battleState.turnOrder.length === 2, "ordem de turno deveria ter dois tokens");
      expect(ctx.boardTokensRef.current === ctx.boardTokens, "boardTokensRef deveria estar sincronizado");
      expect(ctx.battleStateRef.current === ctx.battleState, "battleStateRef deveria estar sincronizado");
    },
  },
  {
    name: "ataque cria estado pendente e defesa por consistencia limpa pendencias",
    run: () => {
      const { ctx, engine } = createBattle();
      const actorId = getCurrentActorId(ctx);
      const targetId = actorId ? getEnemyId(ctx, actorId) : undefined;

      if (!actorId || !targetId) throw new Error("ator e alvo deveriam existir");
      expect(engine.handleExecuteAction(createAction(targetId)), "ataque deveria ser aceito");
      engine.update();

      expect(ctx.pendingAttack !== null, "ataque deveria ficar pendente para reação");

      engine.handleReaction("consistencia", 0, 1, defenseRoll(0), false);
      engine.update();

      expect(ctx.pendingAttack === null, "pendingAttack deveria ser limpo após defesa");
      expect(ctx.pendingEsquivaRoll === null, "pendingEsquivaRoll deveria ser limpo após defesa");
      expect(!ctx.isInDefenseResolution, "resolução de defesa deveria encerrar");
    },
  },
  {
    name: "esquiva entra em resolução e resolução concede resposta gratuita",
    run: () => {
      const { ctx, engine } = createBattle();
      const actorId = getCurrentActorId(ctx);
      const targetId = actorId ? getEnemyId(ctx, actorId) : undefined;

      if (!actorId || !targetId) throw new Error("ator e alvo deveriam existir");
      expect(engine.handleExecuteAction(createAction(targetId)), "ataque deveria ser aceito");

      engine.handleReaction("destreza", 0, 1, defenseRoll(30), false);
      engine.update();

      expect(ctx.pendingEsquivaRoll !== null, "esquiva deveria aguardar resolução");
      expect(ctx.isInDefenseResolution, "estado de resolução deveria estar ativo");

      engine.handleDefenseResolution(1, defenseRoll(1), 0);
      engine.update();

      expect(ctx.pendingAttack === null, "ataque deveria ser limpo após resolução");
      expect(ctx.pendingFreeResponse?.responderId === targetId, "defensor deveria receber resposta gratuita");
      expect(ctx.freeActionLock[`${targetId}->${actorId}`] !== undefined, "resposta deveria bloquear reação do alvo");
    },
  },
  {
    name: "update avança turno automaticamente quando não há pendencias",
    run: () => {
      const { ctx, engine } = createBattle();
      const firstActorId = getCurrentActorId(ctx);

      expect(!!firstActorId, "ator inicial deveria existir");
      ctx.setBattleState((prev) => ({
        ...prev,
        accumulatedActions: { ...prev.accumulatedActions, [firstActorId]: 0 },
      }));
      ctx.setShouldAdvanceTurn(true);

      engine.update();

      expect(getCurrentActorId(ctx) !== firstActorId, "turno deveria avançar automaticamente");
      expect(!ctx.shouldAdvanceTurn, "flag shouldAdvanceTurn deveria ser consumida");
    },
  },
  {
    name: "calcula acoes acumuladas ao retornar para token que nao agiu nem moveu",
    run: () => {
      const { ctx, engine } = createBattle();
      const firstActorId = getCurrentActorId(ctx);

      expect(!!firstActorId, "ator inicial deveria existir");
      const initialActions = ctx.battleState.accumulatedActions[firstActorId];

      engine.handleNextTurn(true);
      engine.update();
      engine.handleNextTurn(true);
      engine.update();

      expect(
        ctx.battleState.accumulatedActions[firstActorId] === Math.min(5, initialActions + 1),
        "token inativo deveria ganhar uma ação acumulada ao voltar ao turno"
      );
    },
  },
  {
    name: "remove token morto e termina batalha quando resta um time",
    run: () => {
      const { ctx, engine } = createBattle();
      const victim = ctx.boardTokens.find((token) => token.team === "Red");

      if (!victim) throw new Error("vitima deveria existir");
      ctx.setBoardTokens((prev) =>
        prev.map((token) =>
          token.id === victim.id ? { ...token, currentLife: 0 } : token
        )
      );

      engine.update();

      expect(ctx.battleState.status === "Not in Battle", "batalha deveria terminar com um unico time vivo");
      expect(ctx.pendingAttack === null, "pendingAttack deveria ser limpo ao terminar batalha");
      expect(ctx.pendingFreeResponse === null, "pendingFreeResponse deveria ser limpo ao terminar batalha");
    },
  },
  {
    name: "processa pos-paralisia e limpa resposta sem acoes extras",
    run: () => {
      const { ctx, engine } = createBattle();

      ctx.setPostParalyse({
        responderId: "blue",
        forcedId: "red",
        allowedPostAtack: true,
      });
      engine.update();

      expect(ctx.pendingFreeResponse?.responderId === "blue", "pos-paralisia deveria abrir resposta gratuita");

      ctx.remainingExtraActions.current = { attackerId: "blue", extraActions: 0 };
      engine.update();

      expect(ctx.pendingFreeResponse === null, "resposta gratuita deveria limpar ao zerar ações extras");
      expect(ctx.remainingExtraActions.current === null, "ações extras esgotadas deveriam ser limpas");
    },
  },
  
];

export function runBattleEngineSimulationTests() {
  tests.forEach((test) => {
    test.run();
    console.log(`[simulation] ok - ${test.name}`);
  });
}

runBattleEngineSimulationTests();
