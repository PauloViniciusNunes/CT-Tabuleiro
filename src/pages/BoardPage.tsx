// src/pages/BoardPage.tsx
import React, { useState, useEffect } from "react";
import SettingsDropdown from "../components/ui/SettingsDropdown";
import Sidebar from "../components/ui/Sidebar";
import BattlePanel from "../components/ui/BattlePanel";
import StatusBars from "../components/ui/StatusBars";
import ActionForm from "../components/ui/ActionForm";
import { ReactionPrompt } from "../components/ui/ReactionPrompt";
import type { Token } from "../types/token";
import type {
  BattleState,
  InitiativeData,
  RollResult,
  ActionChoice,
  TurnEffect,
} from "../types/battle";
import {
  rollInitiative,
  initializeBattleStats,
  calculateActionRoll,
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

const BoardPage: React.FC = () => {
  const [rows, setRows] = useState(25);
  const [cols, setCols] = useState(25);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

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

  const [reactionActor, setReactionActor] = useState<Token | null>(null);
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);
  const [isCooling, setIsCooling] = useState<boolean>(false);

  // Keyboard handlers: zoom, delete
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

  // Movement handlers when not in battle
  useEffect(() => {
    const handleMoveKey = (e: KeyboardEvent) => {
      if (battleState.status !== "Not in Battle") return;
      if (!selectedTokenId) return;
      const now = Date.now();
      if (now - lastMoveTime < 500) return;

      let dCol = 0,
        dRow = 0;
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

  const letters = Array.from({ length: cols }, (_, i) =>
    getColumnName(i + 1)
  );

  // Token library operations
  const addCreatedToken = (token: Token) =>
    setCreatedTokens((prev) => [...prev, token]);
  const updateCreatedToken = (token: Token) =>
    setCreatedTokens((prev) => prev.map((t) => (t.id === token.id ? token : t)));
  const removeCreatedToken = (tokenId: string) =>
    setCreatedTokens((prev) => prev.filter((t) => t.id !== tokenId));

  // Place and move on board
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
  const moveTokenOnBoard = (id: string, col: number, row: number) =>
    setBoardTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, position: { col, row } } : t))
    );

  const handleCellClick = (
    letter: string,
    number: number,
    tokenInCell?: Token
  ) => {
    setSelectedCell(`${letter}${number}`);
    setSelectedTokenId(tokenInCell?.id || null);
  };

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
    inits.forEach((i) => (acc[i.tokenId] = i.hasExtraTurn ? 2 : 1));

    // Set startPosition for first token
    const firstId = inits[0]?.tokenId;
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === firstId ? { ...t, startPosition: { ...t.position } } : t
      )
    );

    setBattleState({
      status: "In Battle",
      round: 1,
      turnOrder: inits,
      currentTurnIndex: 0,
      accumulatedActions: acc,
      activeEffects: {},
      actionHistory: [],
    });
  };

  // Next turn
  const handleNextTurn = () => {
    setBattleState((prev) => {
      const nextIdx = (prev.currentTurnIndex + 1) % prev.turnOrder.length;
      const newRd = nextIdx === 0 ? prev.round + 1 : prev.round;
      let upd: BattleState = {
        ...prev,
        currentTurnIndex: nextIdx,
        round: newRd,
      };
      upd = processTurnEffects(upd, boardTokens);
      return upd;
    });

    // Update startPosition for next token
    const nextId =
      battleState.turnOrder[
        (battleState.currentTurnIndex + 1) % battleState.turnOrder.length
      ]?.tokenId;
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === nextId ? { ...t, startPosition: { ...t.position } } : t
      )
    );

    setReactionActor(null);
  };

  // End battle
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
  };

  // Execute action
  const handleExecuteAction = (choice: ActionChoice) => {
    const current = battleState.turnOrder[battleState.currentTurnIndex];
    if (!current) return;
    const tokenId = current.tokenId;
    const token = boardTokens.find((t) => t.id === tokenId);
    if (!token) return;

    const params = {
      tokenId,
      Q: 1,
      P: 1,
      A: token.attributes[choice.attribute],
      O: 0,
      N:
        choice.attribute === "forca" || choice.attribute === "sabedoria"
          ? 0
          : token.proficiencies[choice.attribute]
          ? 1
          : 0,
      L: token.attributes.level,
      M:
        choice.attribute === "forca" || choice.attribute === "sabedoria"
          ? 0
          : 1,
      CRI: 1,
    };

    const rollResult: RollResult = calculateActionRoll(params);

    setBattleState((prev) => {
      const rem = prev.accumulatedActions[tokenId] - 1;
      return {
        ...prev,
        accumulatedActions: {
          ...prev.accumulatedActions,
          [tokenId]: rem,
        },
        actionHistory: [...prev.actionHistory, { ...choice, rollResult }],
      };
    });

    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? {
              ...t,
              currentMana: Math.max(
                0,
                (t.currentMana ?? 0) - rollResult.usedMana
              ),
            }
          : t
      )
    );

    if ((battleState.accumulatedActions[tokenId] ?? 0) <= 1) {
      handleNextTurn();
    }
  };

  // Reaction placeholder
  useEffect(() => {
    // ...
  }, [battleState.actionHistory]);

  const currentData = battleState.turnOrder[battleState.currentTurnIndex];
  const currentId = currentData?.tokenId;
  const currentToken = currentId
    ? boardTokens.find((t) => t.id === currentId)
    : undefined;

  const cellSize = 40 * zoom;

  return (
    <div className="relative flex w-full min-h-screen bg-gray-900 text-white overflow-auto">
      <div
        className="relative flex-1 p-6"
        style={{ maxWidth: sidebarOpen ? "calc(100vw - 250px)" : "100vw" }}
      >
        {/* Controls */}
        <div
          className="absolute flex items-center gap-4 bg-gray-900 z-20 rounded-md p-2"
          style={{ top: 6, left: 6 }}
        >
          <SettingsDropdown
            rows={rows}
            cols={cols}
            onChangeRows={setRows}
            onChangeCols={setCols}
            onChangeBackgroundImage={setBackgroundImage}
          />
          <div className="ml-4 font-semibold text-green-400 whitespace-nowrap select-none">
            {selectedCell
              ? `Célula selecionada: ${selectedCell}`
              : "Nenhuma célula selecionada"}
          </div>
          <div className="ml-4 font-semibold text-blue-400 whitespace-nowrap select-none">
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* BattlePanel */}
        {battleState.status === "In Battle" && (
          <div
            className="absolute bg-gray-900 z-20 rounded-md"
            style={{ top: 6, right: 80, width: 250 }}
          >
            <BattlePanel
              battleState={battleState}
              tokens={boardTokens}
              onStartBattle={handleStartBattle}
              onEndBattle={handleEndBattle}
              onNextTurn={handleNextTurn}
            />
          </div>
        )}

        {/* Grid header */}
        <div style={{ paddingTop: 48 }}>
          <div className="flex ml-10 relative" style={{ userSelect: "none" }}>
            {letters.map((l) => (
              <div
                key={l}
                style={{
                  width: cellSize,
                  height: cellSize,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    whiteSpace: "nowrap",
                    fontWeight: 700,
                    fontSize: 14 * zoom,
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
          <div className="flex">
            {/* Row labels */}
            <div className="flex flex-col select-none">
              {Array.from({ length: rows }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14 * zoom,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Cells */}
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
              }}
            >
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
                              isCooling && tok.id === selectedTokenId
                                ? "filter grayscale"
                                : ""
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

      {/* Toggle Sidebar */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          className="p-2 rounded-md bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
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
          battleHistory={battleState.actionHistory}
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

      {/* ActionForm */}
      {battleState.status === "In Battle" && currentToken && (
        <div className="fixed bottom-4 left-4 z-30">
          <ActionForm
            token={currentToken}
            availableActions={battleState.accumulatedActions[currentId] ?? 0}
            onExecute={handleExecuteAction}
            onPass={handleNextTurn}
          />
        </div>
      )}

      {/* ReactionPrompt */}
      {reactionActor && (
        <ReactionPrompt
          actor={reactionActor}
          onReact={(roll: RollResult) => {
            setReactionActor(null);
          }}
          onSkip={() => setReactionActor(null)}
        />
      )}
    </div>
  );
};

export { BoardPage };
export default BoardPage;
