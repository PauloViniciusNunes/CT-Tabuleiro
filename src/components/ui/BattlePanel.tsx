import React, { useState } from "react";
import type { BattleState } from "../../types/battle";
import type { Token } from "../../types/token";

interface BattlePanelProps {
  battleState: BattleState;
  tokens: Token[];
  onStartBattle: () => void;
  onEndBattle: () => void;
  onNextTurn: () => void;
}

export const BattlePanel: React.FC<BattlePanelProps> = ({
  battleState,
  tokens,
  onStartBattle,
  onEndBattle,
  onNextTurn,
}) => {

  const [isOpen, setIsOpen] = useState(true); // 👈 NOVO

  const canStartBattle = () => {
    const teams = new Set(tokens.map((t) => t.team));
    return teams.size >= 2 && tokens.length >= 2;
  };

  const getCurrentToken = () => {
    if (battleState.turnOrder.length === 0) return null;
    const currentInit = battleState.turnOrder[battleState.currentTurnIndex];
    return tokens.find((t) => t.id === currentInit.tokenId);
  };

  const currentToken = getCurrentToken();

  return (
    <div className="bg-gray-800 p-4 rounded border border-gray-700">
      {/* Cabeçalho + botão de exibir/ocultar */}
      <div className="flex justify-between items-center mb-3">
        {isOpen && (<h3 className="text-lg font-bold text-white">Status da Batalha</h3>)}
        
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-sm m-2 w-50% px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          {isOpen ? "Ocultar ▲" : "Exibir ▼"}
        </button>
      </div>

      {/* Conteúdo colapsável */}
      {isOpen && (
        <div className="transition-all duration-200">
          {battleState.status === "Not in Battle" ? (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">Nenhuma batalha em andamento</p>

              <button
                onClick={onStartBattle}
                disabled={!canStartBattle()}
                className={`w-full py-2 rounded font-bold text-white ${
                  canStartBattle()
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-600 cursor-not-allowed"
                }`}
              >
                Iniciar Batalha
              </button>

              {!canStartBattle() && (
                <p className="text-xs text-yellow-500">
                  Precisa de tokens de times diferentes no tabuleiro
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              
              {/* Round */}
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">Round:</span>
                <span className="text-green-400 text-xl font-bold">{battleState.round}</span>
              </div>

              {/* Token Atual */}
              {currentToken && (
                <div className="bg-gray-900 p-2 rounded">
                  <p className="text-xs text-gray-400 mb-1">Turno Atual:</p>
                  <p className="text-white font-bold">{currentToken.name}</p>
                  <p className="text-xs text-gray-400">Time: {currentToken.team}</p>
                </div>
              )}

              {/* Ordem de Turnos */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400">Ordem de Turnos:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {battleState.turnOrder.map((init, idx) => {
                    const token = tokens.find((t) => t.id === init.tokenId);
                    const isActive = idx === battleState.currentTurnIndex;

                    return (
                      <div
                        key={init.tokenId}
                        className={`text-xs p-1 rounded flex justify-between ${
                          isActive
                            ? "bg-green-700 text-white"
                            : "bg-gray-900 text-gray-300"
                        }`}
                      >
                        <span>{token?.name || "Desconhecido"}</span>
                        <span>{init.initiative}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botões Final */}
              <div className="flex gap-2">
                <button
                  onClick={onNextTurn}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold text-white"
                >
                  Próximo Turno
                </button>
                <button
                  onClick={onEndBattle}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-white"
                >
                  Encerrar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BattlePanel;
