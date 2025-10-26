import React, { useState, useEffect, useRef } from "react";
import SettingsDropdown from "../components/ui/SettingsDropdown";
import Sidebar from "../components/ui/Sidebar";
import BattlePanel from "../components/ui/BattlePanel";
import StatusBars from "../components/ui/StatusBars";
import ActionForm from "../components/ui/ActionForm";
import ReactionPrompt from "../components/ui/ReactionPrompt";
import DefenseResolutionForm from "../components/ui/DefenseResolutionForm";
import { calculateDistance, isInAttackRange } from "../utils/battleCalculations";
import type { Token } from "../types/token";
import type {
  BattleState,
  InitiativeData,
  RollResult,
  ActionChoice,
} from "../types/battle";
import {
  rollInitiative,
  initializeBattleStats,
  calculateActionRoll,
  recalculateRound
} from "../utils/battleCalculations";
import processTurnEffects from "../utils/battleEffects";


const getColumnName = (num: number): string => {
  let name = "";
  while (num > 0) {
    const rem = (num - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    num = Math.floor((num - 1) / 26);
  }
  return name;
};


const teamGlowColors: Record<string, string> = {
  Red: "rgba(239, 68, 68, 0.6)",
  Blue: "rgba(59, 130, 246, 0.6)",
  Green: "rgba(34, 197, 94, 0.6)",
  Yellow: "rgba(234, 179, 8, 0.6)",
};


type PendingReaction = {
  type: "consistencia" | "destreza";
  targetToken: Token;
};


const BoardPage: React.FC = () => {
  const [rows, setRows] = useState(25);
  const [cols, setCols] = useState(25);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isAdvancingTurn, setIsAdvancingTurn] = useState(false);
  const [didActThisTurn, setDidActThisTurn] = useState<Record<string, boolean>>({});
  const [shouldAdvanceTurn, setShouldAdvanceTurn] = useState(false);
  
  const [showDefenseResolution, setShowDefenseResolution] = useState<{
    reactionResult: number;
    reactionType: "destreza";
  } | null>(null);




  const isAdvancingTurnRef = useRef(false);


  const [createdTokens, setCreatedTokens] = useState<Token[]>([]);
  const [boardTokens, setBoardTokens] = useState<Token[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const [battleState, setBattleState] = useState<BattleState>({
    status: "Not in Battle",
    round: 0,
    turnOrder: [],
    currentTurnIndex: 0,
    accumulatedActions: {},
    activeEffects: {},
    actionHistory: [],
  });


  const [pendingAttack, setPendingAttack] = useState<{
    attackerId: string;
    targetId: string;
    rawDamage: number;
    attackRoll: number;
    pendingReactions: PendingReaction[];
  } | null>(null);


  const [pendingEsquivaRoll, setPendingEsquivaRoll] = useState<number | null>(null);
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);
  const [isCooling, setIsCooling] = useState<boolean>(false);
  const [movedThisTurn, setMovedThisTurn] = useState<Record<string, boolean>>({});
  const hasEnteredFirstTurnRef = useRef<Record<string, boolean>>({});


  // Zoom & delete
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(z + 0.1, 3));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(z - 0.1, 0.5));
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedTokenId
      ) {
        e.preventDefault();
        setBoardTokens((prev) => prev.filter((t) => t.id !== selectedTokenId));
        setSelectedTokenId(null);
        setSelectedCell(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedTokenId]);


  // Movement keys when Not in Battle
  useEffect(() => {
    const handleMoveKey = (e: KeyboardEvent) => {
      if (battleState.status !== "Not in Battle") return;
      if (!selectedTokenId) return;
      const now = Date.now();
      if (now - lastMoveTime < 500) return;
      let dCol = 0, dRow = 0;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dRow = -1;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dRow = 1;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dCol = -1;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dCol = 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const token = boardTokens.find((t) => t.id === selectedTokenId);
      if (!token) return;
      const newCol = token.position.col + dCol;
      const newRow = token.position.row + dRow;
      if (newCol < 1 || newCol > cols || newRow < 1 || newRow > rows) return;
      moveTokenOnBoard(selectedTokenId, newCol, newRow);
      setLastMoveTime(now);
      setIsCooling(true);
      setTimeout(() => setIsCooling(false), 500);
    };
    window.addEventListener("keydown", handleMoveKey);
    return () => window.removeEventListener("keydown", handleMoveKey);
  }, [battleState.status, selectedTokenId, lastMoveTime, boardTokens, cols, rows]);


  // Auto advance turn
  
  useEffect(() => {
    if (shouldAdvanceTurn && battleState.status === "In Battle" && !pendingAttack) {
      setShouldAdvanceTurn(false);
      handleNextTurn();
    }
  }, [shouldAdvanceTurn]); // ⬅️ APENAS shouldAdvanceTurn como dependência



    // Adicione este useEffect após os outros useEffects em BoardPage.tsx
  useEffect(() => {
    // Quando showDefenseResolution é definido, mas pendingAttack ainda tem reações
    // Significa que o form DEVE aparecer
    if (showDefenseResolution && pendingAttack && pendingAttack.pendingReactions.length === 0) {
      console.log("✓ DefenseResolutionForm está pronto para renderizar");
      // O JSX renderizará automaticamente aqui
    }
  }, [showDefenseResolution, pendingAttack]);


  // Calcula ações apenas quando um novo token ENTRA seu turno
  // ⬅️ ÚNICO useEffect CORRETO
useEffect(() => {
  if (battleState.status !== "In Battle") return;

  const currentTokenId = battleState.turnOrder[battleState.currentTurnIndex]?.tokenId;
  if (!currentTokenId) return;

  console.log(`🔄 [${currentTokenId}] Entrando no turno`);

  // 1. Reseta flags
  setDidActThisTurn((prev) => {
    if (prev[currentTokenId] === false) return prev;
    return { ...prev, [currentTokenId]: false };
  });

  setMovedThisTurn((prev) => {
    if (prev[currentTokenId] === false) return prev;
    return { ...prev, [currentTokenId]: false };
  });

  // ⬅️ USA REF PARA SABER SE JÁ ENTROU
  const isFirstEntry = !hasEnteredFirstTurnRef.current[currentTokenId];

  // Se for primeira entrada, marca no ref
  if (isFirstEntry) {
    hasEnteredFirstTurnRef.current[currentTokenId] = true;
  }

  // 2. CALCULA AÇÕES
  setBattleState((prev) => {
    const acted = didActThisTurn[currentTokenId] ?? false;
    const moved = movedThisTurn[currentTokenId] ?? false;
    const previousActions = prev.accumulatedActions[currentTokenId] ?? 0;

    let newActions = 1;

    // ⬅️ AQUI: Se for primeira entrada, não recalcula
    if (isFirstEntry) {
      newActions = previousActions; // Usa valor inicial
      console.log(
        `🟢 [${currentTokenId}] Primeira entrada no combate. Ações iniciais: ${newActions}`
      );
    } else if (!acted && !moved) {
      newActions = Math.min((previousActions || 0) + 1, 5);
      console.log(
        `➕ [${currentTokenId}] Não agiu/moveu. Ações: ${previousActions || 0} + 1 = ${newActions}`
      );
    } else {
      newActions = previousActions || 1;
      console.log(
        `➖ [${currentTokenId}] Agiu ou moveu. Ações mantidas: ${newActions}`
      );
    }

    return {
      ...prev,
      accumulatedActions: {
        ...prev.accumulatedActions,
        [currentTokenId]: newActions,
      },
    };
  });
}, [battleState.currentTurnIndex, battleState.status]); 






  const letters = Array.from({ length: cols }, (_, i) => getColumnName(i + 1));


  // Token library ops
  const addCreatedToken = (token: Token) =>
    setCreatedTokens((prev) => [...prev, token]);
  const updateCreatedToken = (token: Token) =>
    setCreatedTokens((prev) =>
      prev.map((t) => (t.id === token.id ? token : t))
    );
  const removeCreatedToken = (tokenId: string) =>
    setCreatedTokens((prev) => prev.filter((t) => t.id !== tokenId));


  // Place & move
  const placeTokenOnBoard = (tokenId: string, col: number, row: number) => {
    const template = createdTokens.find((t) => t.id === tokenId);
    if (!template) return;
    const instance: Token = {
      ...template,
      id: `board_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      position: { col, row },
    };
    setBoardTokens((prev) => [...prev, instance]);
  };
  const moveTokenOnBoard = (id: string, col: number, row: number) => {
    const token = boardTokens.find((t) => t.id === id);
    if (!token) return;
    
    // Verifica se realmente moveu (posição diferente)
    if (token.position.col !== col || token.position.row !== row) {
      setMovedThisTurn((prev) => ({ ...prev, [id]: true }));
    }
    
    setBoardTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, position: { col, row } } : t))
    );
  };



  const handleCellClick = (
    letter: string,
    number: number,
    tokenInCell?: Token
  ) => {
    setSelectedCell(`${letter}${number}`);
    setSelectedTokenId(tokenInCell?.id || null);
  };


  // Start battle
// Start battle
const handleStartBattle = () => {
  const teams = new Set(boardTokens.map((t) => t.team));
  if (teams.size < 2 || boardTokens.length < 2) {
    alert("É necessário ter tokens de times diferentes para iniciar.");
    return;
  }
  const initialized = boardTokens.map(initializeBattleStats) as Token[];
  setBoardTokens(initialized);
  const inits: InitiativeData[] = initialized.map((token) => ({
    tokenId: token.id,
    initiative: rollInitiative(
      token.attributes.destreza,
      token.proficiencies.destreza,
      token.attributes.level
    ),
    hasExtraTurn: false,
  }));
  inits.sort((a, b) => b.initiative - a.initiative);
  if (inits[0]) inits[0].hasExtraTurn = true;
  
  const acc: Record<string, number> = {};
  const didActObj: Record<string, boolean> = {};
  const movedObj: Record<string, boolean> = {};
  
  inits.forEach((i, idx) => {
    acc[i.tokenId] = idx === 0 ? 2 : 1;
    didActObj[i.tokenId] = false;
    movedObj[i.tokenId] = false;
  });
  
  Object.keys(acc).forEach((id) => {
    acc[id] = Math.max(1, Math.min(5, acc[id]));
  });
  
  const firstId = inits[0]?.tokenId;
  setBoardTokens((prev) =>
    prev.map((t) =>
      t.id === firstId ? { ...t, startPosition: { ...t.position } } : t
    )
  );
  
  // ⬅️ LIMPAR REF ANTES DE COMEÇAR
  hasEnteredFirstTurnRef.current = {};
  
  setBattleState({
    status: "In Battle",
    round: 1,
    turnOrder: inits,
    currentTurnIndex: 0,
    accumulatedActions: acc,
    activeEffects: {},
    actionHistory: [],
  });
  
  setDidActThisTurn(didActObj);
  setMovedThisTurn(movedObj);
};



// Next turn
const handleNextTurn = (isVoluntaryPass: boolean = false) => {
  // ⬅️ PROTEÇÃO: Não fazer nada se já está bloqueado
  if (isAdvancingTurnRef.current) {
    console.log("🔒 Bloqueado - já está avançando");
    return;
  }

  // ⬅️ VALIDAÇÃO ANTECIPADA: Evita entrar no try com dados inválidos
  const currentIdx = battleState.currentTurnIndex;
  const currentTokenId = battleState.turnOrder[currentIdx]?.tokenId;

  if (!currentTokenId) {
    console.log("❌ Sem tokenId, abortando");
    return; // ✅ Sai ANTES de setar isAdvancingTurnRef.current = true
  }

  isAdvancingTurnRef.current = true;
  console.log("🟢 handleNextTurn INICIADO");

  try {
    const currentActions = battleState.accumulatedActions[currentTokenId] ?? 1;

    if (!isVoluntaryPass && currentActions > 0) {
      console.log(
        `❌ Token ${currentTokenId} ainda tem ${currentActions} ações! Não pode passar automaticamente.`
      );
      isAdvancingTurnRef.current = false;
      return;
    }

    console.log(
      `✅ Token ${currentTokenId} passando turno. (Voluntário: ${isVoluntaryPass}, Ações: ${currentActions})`
    );

    const nextIdx = (currentIdx + 1) % battleState.turnOrder.length;
    const nextTokenId = battleState.turnOrder[nextIdx]?.tokenId;

    console.log(`Turning: idx ${currentIdx} → ${nextIdx}`);

    setBattleState((prev) => {
      if (prev.currentTurnIndex === currentIdx && nextIdx !== currentIdx) {
        const shouldIncrement = nextIdx === 0;
        const correctRound = shouldIncrement ? prev.round + 1 : prev.round;

        console.log(
          `✅ Round: ${prev.round} → ${correctRound} (idx: ${nextIdx})`
        );

        const upd = {
          ...prev,
          currentTurnIndex: nextIdx,
          round: correctRound,
        };
        return processTurnEffects(upd, boardTokens);
      } else {
        console.log(`⏭️ Estado já foi atualizado, ignorando`);
        return prev;
      }
    });

    if (nextTokenId) {
      setBoardTokens((prev) =>
        prev.map((t) =>
          t.id === nextTokenId ? { ...t, startPosition: { ...t.position } } : t
        )
      );
    }
  } finally {
    isAdvancingTurnRef.current = false;
    console.log("🔓 Lock liberado");
  }
};


  const handleEndBattle = () => {
    setBattleState({
      status: "Not in Battle",
      round: 0,
      turnOrder: [],
      currentTurnIndex: 0,
      accumulatedActions: {},
      activeEffects: {},
      actionHistory: [],
    });
    setBoardTokens((prev) =>
      prev.map((t) => ({
        ...t,
        currentLife: undefined,
        maxLife: undefined,
        currentMana: undefined,
        maxMana: undefined,
        startPosition: undefined,
      }))
    );
    setPendingAttack(null);
    setMovedThisTurn({});
    hasEnteredFirstTurnRef.current = {}; // ⬅️ Limpar ref
  };




  // Execute action - NÃO aplica dano aqui, apenas configura reações
const handleExecuteAction = (
  choice: ActionChoice & {
    targetId: string;
    usedMana: number;
    usedActions: number;
  }
) => {
  const current = battleState.turnOrder[battleState.currentTurnIndex];
  if (!current) return;

  const tokenId = current.tokenId;
  const token = boardTokens.find((t) => t.id === tokenId)!;
  const target = boardTokens.find((t) => t.id === choice.targetId)!;

  // Verificar alcance
  const isPhysicalAttack = ["forca", "destreza"].includes(choice.attribute);
  const attackType = isPhysicalAttack ? "fisico" : "magico";

  if (!isInAttackRange(token, target, attackType)) {
    const distance = calculateDistance(token, target);
    const maxRange = isPhysicalAttack
      ? (token.bodytobodyRange || 1)
      : (token.magicalRange || 6);

    console.warn(
      `${token.name} está fora do alcance para atacar ${target.name}. ` +
        `Distância: ${distance}, Alcance máximo: ${maxRange}`
    );
    return;
  }

  const usedMana = Math.min(choice.usedMana, token.currentMana ?? 0);
  const usedActions = Math.min(
    choice.usedActions,
    battleState.accumulatedActions[tokenId] ?? 1
  );

  const proficiencyBonus = token.proficiencies[choice.attribute]
    ? Math.ceil((token.attributes.level - 10) / 4 + 4)
    : 0;

  const params = {
    tokenId,
    Q: usedActions,
    P: 1,
    A: token.attributes[choice.attribute],
    PF: proficiencyBonus,
    O: 0,
    N:
      choice.attribute === "forca" || choice.attribute === "sabedoria"
        ? 0
        : token.proficiencies[choice.attribute]
        ? 1
        : 0,
    L: token.attributes.level,
    M: usedMana,
  };

  const rollResult = calculateActionRoll(params);

  // ⬅️ CORREÇÃO: rawDamage é APENAS rollResult.total
  // Nenhuma pré-subtração de defesa
  const rawDamage = rollResult.total;

  setDidActThisTurn((prev) => ({ ...prev, [tokenId]: true }));

  const currentActions = battleState.accumulatedActions[tokenId] ?? 1;
  const remainingActions = Math.max(0, currentActions - usedActions);

  console.log(`[${token.name}] Ações: ${currentActions} - ${usedActions} = ${remainingActions}`);

  setBattleState((prev) => ({
    ...prev,
    accumulatedActions: {
      ...prev.accumulatedActions,
      [tokenId]: remainingActions,
    },
    actionHistory: [
      ...prev.actionHistory,
      {
        attribute: choice.attribute,
        type: choice.type,
        rollResult,
        attackerId: tokenId,
        targetId: choice.targetId,
        round: prev.round,
      } as ActionChoice & {
        round: number;
        attackerId?: string;
        targetId?: string;
      },
    ],
  }));

  setBoardTokens((prev) =>
    prev.map((t) =>
      t.id === tokenId
        ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedMana) }
        : t
    )
  );

  setPendingAttack({
    attackerId: tokenId,
    targetId: choice.targetId,
    rawDamage, // ⬅️ Agora é apenas rollResult.total
    attackRoll: rollResult.total,
    pendingReactions: [
      { type: "destreza", targetToken: target },
      { type: "consistencia", targetToken: target },
    ],
  });
};





  // Handle reaction - processa UMA reação por vez
const handleReaction = (
  reactionType: "consistencia" | "destreza",
  usedMana: number,
  usedActions: number,
  roll: RollResult
) => {
  if (!pendingAttack) return;

  const targetId = pendingAttack.targetId;

  console.log("✓ Reação processada:", {
    tipo: reactionType,
    resultado: roll.total,
    acoesInputadas: usedActions,
  });

  // Desconta mana do reator
  setBoardTokens((prev) =>
    prev.map((t) =>
      t.id === targetId
        ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedMana) }
        : t
    )
  );

  // ⬅️ FÓRMULA: T = A - 1
  const totalActionsToDecrement = Math.max(0, usedActions - 1);
  const currentActionsDefender = battleState.accumulatedActions[targetId] ?? 1;
  const remainingActionsDefender = Math.max(1, currentActionsDefender - totalActionsToDecrement);

  console.log(
    `[Defensor ${targetId}] Ações: ${currentActionsDefender} - ${totalActionsToDecrement} (T=A-1) = ${remainingActionsDefender}`
  );

  setBattleState((prev) => ({
    ...prev,
    accumulatedActions: {
      ...prev.accumulatedActions,
      [targetId]: remainingActionsDefender,
    },
  }));

  if (reactionType === "consistencia") {
    // DEFESA
    const finalDamage = Math.max(0, pendingAttack.attackRoll - roll.total);

    console.log("🛡️ DEFESA (Consistência):", {
      ataque: pendingAttack.attackRoll,
      reacao: roll.total,
      danoFinal: finalDamage,
    });

    // Aplica dano
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === targetId
          ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - finalDamage) }
          : t
      )
    );

    // Registra no histórico
    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: "consistencia",
          type: "Reação - Defesa",
          rollResult: roll,
          attackerId: targetId,
          targetId: pendingAttack.attackerId,
          round: prev.round,
        } as ActionChoice & {
          round: number;
          attackerId?: string;
          targetId?: string;
        },
      ],
    }));

    // Limpa pendingAttack
    setPendingAttack(null);

    // ⬅️ VERIFICAÇÃO AQUI (para defesa finalizada)
    const currentActionsAttacker = battleState.accumulatedActions[pendingAttack.attackerId] ?? 1;
    const shouldAttackerPass = currentActionsAttacker <= 0;

    console.log(
      `[Atacante ${pendingAttack.attackerId}] Ações atuais: ${currentActionsAttacker} | Deve passar? ${shouldAttackerPass}`
    );

    if (shouldAttackerPass) {
      console.log(`✅ Atacante com 0 ações! Auto-passando.`);
      setShouldAdvanceTurn(true);
    }
  } else if (reactionType === "destreza") {
    // ESQUIVA
    console.log("🎯 ESQUIVA (Destreza) - Aguardando Definição do Atacante");

    setPendingEsquivaRoll(roll.total);
    setPendingAttack({
      ...pendingAttack,
      pendingReactions: [],
    });
    
    // ⬅️ REMOVIDO: Auto-passa duplicado
  }
};





const handleDefenseResolution = (
  usedActions: number,
  definicaoRoll: RollResult
) => {
  if (!pendingAttack || pendingEsquivaRoll === null) return;


  const attackerId = pendingAttack.attackerId;
  const defenderEsquiva = pendingEsquivaRoll;
  const atacanteDefinicao = definicaoRoll.total;


  console.log("⚔️ RESOLUÇÃO DE ESQUIVA:", {
    esquiva: defenderEsquiva,
    definicao: atacanteDefinicao,
    acoesInputadas: usedActions,
  });


  // ⬅️ FÓRMULA: T = A - 1
  const totalActionsToDecrement = Math.max(0, usedActions - 1);
  const currentActionsAttacker = battleState.accumulatedActions[attackerId] ?? 1;
  const remainingActionsAttacker = Math.max(1, currentActionsAttacker - totalActionsToDecrement); // ⬅️ ADICIONAR Math.max(1, ...)


  console.log(
    `[Atacante ${attackerId}] Ações: ${currentActionsAttacker} - ${totalActionsToDecrement} (T=A-1) = ${remainingActionsAttacker}`
  );


  // ⬅️ AQUI: Verifica se o atacante ficou com 0 ações
  const shouldAttackerPass = remainingActionsAttacker <= 0;


  console.log(
    `[Atacante ${attackerId}] Após definição, ficou com ${remainingActionsAttacker} ações | Deve passar? ${shouldAttackerPass}`
  );

  setBattleState((prev) => ({
    ...prev,
    accumulatedActions: {
      ...prev.accumulatedActions,
      [attackerId]: remainingActionsAttacker, // ⬅️ Garantido mínimo de 1
    },
  }));


  // Resultado binário
  const esquivaSuccessful = atacanteDefinicao < defenderEsquiva;
  const finalDamage = esquivaSuccessful ? 0 : pendingAttack.rawDamage;


  console.log(
    esquivaSuccessful
      ? `✅ ESQUIVA BEM-SUCEDIDA! Dano = 0`
      : `❌ ESQUIVA FALHOU! Dano = ${finalDamage}`
  );


  // Aplica dano
  setBoardTokens((prev) =>
    prev.map((t) =>
      t.id === pendingAttack.targetId
        ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - finalDamage) }
        : t
    )
  );


  // Registra no histórico
  setBattleState((prev) => ({
    ...prev,
    actionHistory: [
      ...prev.actionHistory,
      {
        attribute: "destreza",
        type: "Resolução de Esquiva",
        rollResult: definicaoRoll,
        attackerId: pendingAttack.attackerId,
        targetId: pendingAttack.targetId,
        round: prev.round,
      } as ActionChoice & {
        round: number;
        attackerId?: string;
        targetId?: string;
      },
    ],
  }));


  // Limpa
  setPendingEsquivaRoll(null);
  setPendingAttack(null);


    // ⬅️ Use a variável que já existe:
    if (remainingActionsAttacker <= 0) {
      console.log(`✅ Atacante com 0 ações! Auto-passando.`);
      setShouldAdvanceTurn(true);
    }


};



  const currentData = battleState.turnOrder[battleState.currentTurnIndex];
  const currentId = currentData?.tokenId;
  const currentToken = currentId
    ? boardTokens.find((t) => t.id === currentId)
    : undefined;


  const cellSize = 40 * zoom;


  return (
    <div className="relative flex w-full min-h-screen bg-gray-900 text-white overflow-auto">
      <div className="relative flex-1 p-6" style={{ maxWidth: sidebarOpen ? "calc(100vw - 250px)" : "100vw" }}>
        {/* Controls */}
        <div className="absolute flex items-center gap-4 bg-gray-900 z-20 rounded-md p-2" style={{ top: 6, left: 6 }}>
          <SettingsDropdown
            rows={rows}
            cols={cols}
            onChangeRows={(v) => setRows(Number(v))}
            onChangeCols={(v) => setCols(Number(v))}
            onChangeBackgroundImage={setBackgroundImage}
          />
          <div className="ml-4 font-semibold text-green-400 whitespace-nowrap">
            {selectedCell ? `Célula selecionada: ${selectedCell}` : "Nenhuma célula selecionada"}
          </div>
          <div className="ml-4 font-semibold text-blue-400 whitespace-nowrap">
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>


        {/* BattlePanel */}
        {battleState.status === "In Battle" && (
          <div className="absolute bg-gray-900 z-20 rounded-md" style={{ top: 6, right: 80, width: 250 }}>
            <BattlePanel
              battleState={battleState}
              tokens={boardTokens}
              onStartBattle={handleStartBattle}
              onEndBattle={handleEndBattle}
              onNextTurn={handleNextTurn}
            />
          </div>
        )}


        {/* Grid */}
        <div style={{ paddingTop: 48 }}>
          <div className="flex ml-10 relative" style={{ userSelect: "none" }}>
            {letters.map((l) => (
              <div key={l} style={{ width: cellSize, height: cellSize, position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontWeight: 700, fontSize: 14 * zoom }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
          <div className="flex">
            <div className="flex flex-col select-none">
              {Array.from({ length: rows }, (_, i) => (
                <div key={i} style={{ width: cellSize, height: cellSize, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 * zoom, fontWeight: 700 }}>
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="grid relative" style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
              {Array.from({ length: rows }, (_, row) =>
                letters.map((l) => {
                  const coord = `${l}${row + 1}`;
                  const isSel = coord === selectedCell;
                  const tok = boardTokens.find(
                    (t) =>
                      t.position.col === letters.indexOf(l) + 1 &&
                      t.position.row === row + 1
                  );
                  const inB = battleState.status === "In Battle";
                  const isCurr = tok?.id === currentId;
                  const isTokSel = tok?.id === selectedTokenId;
                  return (
                    <div
                      key={coord}
                      onClick={() => handleCellClick(l, row + 1, tok)}
                      className={`border border-gray-700 flex items-center justify-center cursor-pointer transition-colors duration-150 relative ${
                        isSel
                          ? "border-green-400 shadow-[0_0_10px_2px_rgba(34,197,94,0.7)]"
                          : "hover:bg-gray-800"
                      }`}
                      style={{ width: cellSize, height: cellSize }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("tokenId");
                        const fromLib = e.dataTransfer.getData("fromLibrary") === "true";
                        if (fromLib) {
                          placeTokenOnBoard(id, letters.indexOf(l) + 1, row + 1);
                        } else if (id === currentId) {
                          moveTokenOnBoard(id, letters.indexOf(l) + 1, row + 1);
                        }
                      }}
                    >
                      {tok && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {inB &&
                            tok.currentLife !== undefined &&
                            tok.maxLife !== undefined &&
                            tok.currentMana !== undefined &&
                            tok.maxMana !== undefined && (
                              <StatusBars
                                currentLife={tok.currentLife}
                                maxLife={tok.maxLife}
                                currentMana={tok.currentMana}
                                maxMana={tok.maxMana}
                                teamColor={tok.team}
                              />
                            )}
                          <img
                            src={tok.imageUrl}
                            alt={tok.name}
                            className={`absolute rounded object-cover transition-filter duration-200 ${
                              isCooling && tok.id === selectedTokenId ? "filter grayscale" : ""
                            }`}
                            draggable={tok?.id === currentId}
                            onDragStart={(e) => {
                              if (tok?.id !== currentId) return;
                              e.dataTransfer.setData("tokenId", tok.id);
                              e.dataTransfer.setData("fromLibrary", "false");
                            }}
                            style={{
                              width: cellSize * 0.8,
                              height: cellSize * 0.8,
                              ...(inB
                                ? {
                                    boxShadow: isCurr
                                      ? `0 0 15px 4px ${teamGlowColors[tok.team]}, 0 0 25px 6px rgba(255,255,255,0.8)`
                                      : `0 0 10px 3px ${teamGlowColors[tok.team]}`,
                                    border: isCurr ? "2px solid white" : "none",
                                  }
                                : isTokSel
                                ? {
                                    boxShadow: "0 0 10px 3px rgba(34,197,94,0.8)",
                                    border: "2px solid #22c55e",
                                  }
                                : {}),
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Sidebar toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          className="p-2 rounded-md bg-gray-800 hover:bg-gray-700 focus:ring-2 focus:ring-green-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>


      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-gray-900 shadow-lg border-l border-gray-700 transition-transform duration-300 z-40 overflow-auto ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: 250 }}
      >
        <Sidebar
          tokens={createdTokens}
          addToken={addCreatedToken}
          updateToken={updateCreatedToken}
          removeToken={removeCreatedToken}
          battleHistory={battleState.actionHistory
            .filter(act => act.round !== undefined) // Filtra ações com round definido
            .map((act) => {
              const attacker = boardTokens.find(t => t.id === act.attackerId);
              const target = boardTokens.find(t => t.id === act.targetId);
              
              return {
                ...act,
                round: act.round || 1, // Garante que round é number
                attackerName: attacker?.name || "Desconhecido",
                targetName: target?.name || "Desconhecido",
              };
            }) as (ActionChoice & { round: number; attackerName: string; targetName: string })[]
          }
        />


      </div>


      {/* BattlePanel when not in battle */}
      {battleState.status === "Not in Battle" && (
        <div className="fixed bottom-4 left-4 z-30">
          <BattlePanel
            battleState={battleState}
            tokens={boardTokens}
            onStartBattle={handleStartBattle}
            onEndBattle={handleEndBattle}
            onNextTurn={handleNextTurn}
          />
        </div>
      )}


      {/* ActionForm during battle */}
      {battleState.status === "In Battle" && currentToken && !pendingAttack && (
        <div className="fixed bottom-4 left-4 z-30">
          <ActionForm
            token={currentToken}
            availableActions={battleState.accumulatedActions[currentId] ?? 0}
            onExecute={handleExecuteAction}
            onPass={handleNextTurn}
            possibleTargets={boardTokens.filter((t) => t.id !== currentId)}
          />
        </div>
      )}


 
      {/* ReactionPrompt */}
      {pendingAttack &&
        pendingAttack.pendingReactions.length > 0 &&
        !pendingEsquivaRoll && ( // ⬅️ ADICIONE ESTA CONDIÇÃO
          <div className="fixed bottom-4 right-4 z-40">
            <ReactionPrompt
              key={`reaction-${pendingAttack.targetId}-${Date.now()}`} // ⬅️ ADICIONE CHAVE DINÂMICA
              actor={{
                ...pendingAttack.pendingReactions[0].targetToken,
                reactionType: pendingAttack.pendingReactions[0].type,
              }}
              availableActions={
                battleState.accumulatedActions[
                  pendingAttack.pendingReactions[0].targetToken.id
                ] ?? 1
              }
              onReact={(actorId, reactionType, usedMana, usedActions, roll) => {
                handleReaction(reactionType, usedMana, usedActions, roll);
              }}
            />
          </div>
        )}


      {/* DefenseResolutionForm */}
      {pendingEsquivaRoll !== null && pendingAttack && (
        <div className="fixed bottom-4 left-4 z-40">
          <DefenseResolutionForm
            attacker={boardTokens.find((t) => t.id === pendingAttack?.attackerId)!}
            defenderName={
              boardTokens.find((t) => t.id === pendingAttack?.targetId)?.name ||
              "Desconhecido"
            }
            reactionResult={pendingEsquivaRoll}
            availableActions={
              battleState.accumulatedActions[pendingAttack.attackerId] ?? 1
            }
            onResolve={(usedActions, rollResult) => {
              handleDefenseResolution(usedActions, rollResult);
            }}
            onCancel={() => {
              if (pendingAttack) {
                setBoardTokens((prev) =>
                  prev.map((t) =>
                    t.id === pendingAttack.targetId
                      ? {
                          ...t,
                          currentLife: Math.max(
                            0,
                            (t.currentLife ?? 0) - pendingAttack.rawDamage
                          ),
                        }
                      : t
                  )
                );
              }
              setPendingEsquivaRoll(null);
              setPendingAttack(null);
              setShouldAdvanceTurn(true);
            }}
          />
        </div>
      )}



    </div>
  );
};


export { BoardPage };
export default BoardPage;
