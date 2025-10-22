import React, { useState, useEffect } from "react";
import SettingsDropdown from "../components/ui/SettingsDropdown";
import Sidebar from "../components/ui/Sidebar";
import BattlePanel from "../components/ui/BattlePanel";
import StatusBars from "../components/ui/StatusBars";
import type { Token } from "../types/token";
import type { BattleState, InitiativeData } from "../types/battle";
import { rollInitiative, initializeBattleStats } from "../utils/battleCalculations";
import { processTurnEffects } from "../utils/battleEffects";

const getColumnName = (num: number): string => {
  let name = "";
  while (num > 0) {
    const remainder = (num - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
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

  // Separação: tokens criados (biblioteca) vs tokens no tabuleiro (instâncias ativas)
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
  });

  const letters = Array.from({ length: cols }, (_, i) => getColumnName(i + 1));

  // Gerenciamento de teclas para zoom e deletar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom com + e -
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((prev) => Math.min(prev + 0.1, 3));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((prev) => Math.max(prev - 0.1, 0.5));
      }
      // Deletar token do tabuleiro (não da biblioteca)
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedTokenId) {
        e.preventDefault();
        setBoardTokens((prev) => prev.filter((t) => t.id !== selectedTokenId));
        setSelectedTokenId(null);
        setSelectedCell(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTokenId]);

  const handleCellClick = (letter: string, number: number, tokenInCell?: Token) => {
    setSelectedCell(`${letter}${number}`);
    setSelectedTokenId(tokenInCell?.id || null);
  };

  // Adiciona token à biblioteca (não ao tabuleiro)
  const addCreatedToken = (token: Token) => {
    setCreatedTokens((prev) => [...prev, token]);
  };

  // Atualiza token na biblioteca
  const updateCreatedToken = (updated: Token) => {
    setCreatedTokens((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // Remove token da biblioteca
  const removeCreatedToken = (tokenId: string) => {
    setCreatedTokens((prev) => prev.filter((t) => t.id !== tokenId));
  };

  // Coloca token da biblioteca no tabuleiro
  const placeTokenOnBoard = (tokenId: string, col: number, row: number) => {
    const token = createdTokens.find((t) => t.id === tokenId);
    if (!token) return;

    // Cria nova instância com ID único para o tabuleiro
    const boardToken: Token = {
      ...token,
      id: `board_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      position: { col, row },
    };

    setBoardTokens((prev) => [...prev, boardToken]);
  };

  // Move token no tabuleiro
  const moveTokenOnBoard = (id: string, col: number, row: number) => {
    setBoardTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, position: { col, row } } : t))
    );
  };

  const handleStartBattle = () => {
    const teamsSet = new Set(boardTokens.map((t) => t.team));
    if (teamsSet.size < 2 || boardTokens.length < 2) {
      alert("É necessário ter tokens de times diferentes no tabuleiro para iniciar a batalha.");
      return;
    }

    const initialized = boardTokens.map(initializeBattleStats);
    setBoardTokens(initialized);

    const initiatives: InitiativeData[] = initialized.map((token) => ({
      tokenId: token.id,
      initiative: rollInitiative(
        token.attributes.destreza,
        token.proficiencies.destreza,
        token.attributes.level
      ),
      hasExtraTurn: false,
    }));
    initiatives.sort((a, b) => b.initiative - a.initiative);
    if (initiatives[0]) initiatives[0].hasExtraTurn = true;

    const accActions: Record<string, number> = {};
    initiatives.forEach((init) => {
      accActions[init.tokenId] = init.hasExtraTurn ? 2 : 1;
    });

    setBattleState({
      status: "In Battle",
      round: 1,
      turnOrder: initiatives,
      currentTurnIndex: 0,
      accumulatedActions: accActions,
      activeEffects: {},
    });
  };

  const handleNextTurn = () => {
    setBattleState((prev) => {
      const nextIndex = (prev.currentTurnIndex + 1) % prev.turnOrder.length;
      const newRound = nextIndex === 0 ? prev.round + 1 : prev.round;
      let updated = {
        ...prev,
        currentTurnIndex: nextIndex,
        round: newRound,
      };
      updated = processTurnEffects(updated, boardTokens);
      return updated;
    });
  };

  const handleEndBattle = () => {
    setBattleState({
      status: "Not in Battle",
      round: 0,
      turnOrder: [],
      currentTurnIndex: 0,
      accumulatedActions: {},
      activeEffects: {},
    });
    setBoardTokens((prev) =>
      prev.map((t) => ({
        ...t,
        currentLife: undefined,
        maxLife: undefined,
        currentMana: undefined,
        maxMana: undefined,
      }))
    );
  };

  const currentTokenId =
    battleState.turnOrder[battleState.currentTurnIndex]?.tokenId || null;

  const cellSize = 40 * zoom;

  return (
    <div className="relative flex w-full min-h-screen bg-gray-900 text-white overflow-auto">
      <div
        className="relative flex-1 p-6"
        style={{ maxWidth: sidebarOpen ? "calc(100vw - 250px)" : "100vw" }}
      >
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

        <div style={{ paddingTop: 48 }}>
          <div className="flex ml-10 relative" style={{ userSelect: "none" }}>
            {letters.map((letter) => (
              <div
                key={letter}
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
                  {letter}
                </div>
              </div>
            ))}
          </div>

          <div className="flex">
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

            <div
              className="grid relative"
              style={{
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                backgroundImage: backgroundImage
                  ? `url(${backgroundImage})`
                  : undefined,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
              }}
            >
              {Array.from({ length: rows }, (_, rowIndex) =>
                letters.map((letter) => {
                  const coord = `${letter}${rowIndex + 1}`;
                  const isSelected = coord === selectedCell;
                  const tokenInCell = boardTokens.find(
                    (t) =>
                      t.position.col === letters.indexOf(letter) + 1 &&
                      t.position.row === rowIndex + 1
                  );
                  const inBattle = battleState.status === "In Battle";
                  const isCurrent = tokenInCell?.id === currentTokenId;
                  const isTokenSelected = tokenInCell?.id === selectedTokenId;
                  return (
                    <div
                      key={coord}
                      onClick={() => handleCellClick(letter, rowIndex + 1, tokenInCell)}
                      className={`border border-gray-700 flex items-center justify-center cursor-pointer transition-colors duration-150 relative ${
                        isSelected
                          ? "border-green-400 shadow-[0_0_10px_2px_rgba(34,197,94,0.7)]"
                          : "hover:bg-gray-800"
                      }`}
                      style={{ width: cellSize, height: cellSize }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("tokenId");
                        const isFromLibrary = e.dataTransfer.getData("fromLibrary") === "true";
                        
                        if (id) {
                          if (isFromLibrary) {
                            // Vindo da biblioteca - cria nova instância no tabuleiro
                            placeTokenOnBoard(id, letters.indexOf(letter) + 1, rowIndex + 1);
                          } else {
                            // Movendo token já no tabuleiro
                            moveTokenOnBoard(id, letters.indexOf(letter) + 1, rowIndex + 1);
                          }
                        }
                      }}
                    >
                      {tokenInCell && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {inBattle &&
                            tokenInCell.currentLife !== undefined &&
                            tokenInCell.maxLife !== undefined &&
                            tokenInCell.currentMana !== undefined &&
                            tokenInCell.maxMana !== undefined && (
                              <StatusBars
                                currentLife={tokenInCell.currentLife}
                                maxLife={tokenInCell.maxLife}
                                currentMana={tokenInCell.currentMana}
                                maxMana={tokenInCell.maxMana}
                                teamColor={tokenInCell.team}
                              />
                            )}
                          <img
                            src={tokenInCell.imageUrl}
                            alt={tokenInCell.name}
                            className="absolute rounded object-cover cursor-grab"
                            style={{
                              width: cellSize * 0.8,
                              height: cellSize * 0.8,
                              ...(inBattle
                                ? {
                                    boxShadow: isCurrent
                                      ? `0 0 15px 4px ${teamGlowColors[tokenInCell.team]}, 0 0 25px 6px rgba(255,255,255,0.8)`
                                      : `0 0 10px 3px ${teamGlowColors[tokenInCell.team]}`,
                                    border: isCurrent ? "2px solid white" : "none",
                                  }
                                : isTokenSelected
                                ? {
                                    boxShadow: "0 0 10px 3px rgba(34,197,94,0.8)",
                                    border: "2px solid #22c55e",
                                  }
                                : {}),
                            }}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("tokenId", tokenInCell.id);
                              e.dataTransfer.setData("fromLibrary", "false");
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

      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

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
        />
      </div>

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
    </div>
  );
};

export { BoardPage };
export default BoardPage;
