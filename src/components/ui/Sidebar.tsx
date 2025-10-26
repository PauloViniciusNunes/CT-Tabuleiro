import React, { useState } from "react";
import TokenForm from "./TokenForm";
import type { Token } from "../../types/token";
import type { ActionChoice } from "../../types/battle";

interface SidebarProps {
  tokens: Token[];
  addToken: (token: Token) => void;
  updateToken: (token: Token) => void;
  removeToken: (tokenId: string) => void;
  battleHistory: (ActionChoice & { round: number; attackerName: string; targetName: string })[];
}

type TabType = "token" | "item" | "music" | "chat";

const Sidebar: React.FC<SidebarProps> = ({
  tokens,
  addToken,
  updateToken,
  removeToken,
  battleHistory,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("token");
  const [chatInput, setChatInput] = useState("");

  const renderInventory = (token: Token) => (
    <div className="grid grid-cols-2 gap-2">
      {(["primaryHand", "offHand", "neck", "ring", "armor"] as const).map(
        (slot) => (
          <div key={slot} className="flex flex-col">
            <label className="text-xs text-gray-400 capitalize mb-1">
              {slot}
            </label>
            <input
              type="text"
              value={token.inventory[slot] || ""}
              placeholder="vazio"
              className="p-1 rounded bg-gray-700 text-white text-sm"
              onChange={(e) => {
                const updated = {
                  ...token,
                  inventory: { ...token.inventory, [slot]: e.target.value },
                };
                updateToken(updated);
              }}
            />
          </div>
        )
      )}
      <div className="flex flex-col col-span-2">
        <label className="text-xs text-gray-400 mb-1">economy</label>
        <input
          type="number"
          min={0}
          value={token.inventory.economy}
          className="p-1 rounded bg-gray-700 text-white text-sm"
          onChange={(e) => {
            const updated = {
              ...token,
              inventory: { ...token.inventory, economy: Number(e.target.value) },
            };
            updateToken(updated);
          }}
        />
      </div>
    </div>
  );

const formatActionHistory = (action: ActionChoice & { round: number; attackerName: string; targetName: string }) => {
  const firstDice = action.rollResult.rawRolls[0];
  
  // Determina o estilo do dado baseado no valor
  let diceStyle = "";
  if (firstDice === 20) {
    diceStyle = "text-green-400 font-bold drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]";
  } else if (firstDice === 1) {
    diceStyle = "text-red-400 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]";
  } else {
    diceStyle = "text-white";
  }

  // Verifica se é uma reação
  const isReaction = action.type.includes("Reação");

  return (
    <div className="text-xs text-gray-200 leading-relaxed">
      <span className="font-bold text-white">[Round {action.round}]</span>{" "}
      <span className={isReaction ? "text-purple-400" : "text-blue-400"}>
        {action.attackerName}
      </span>
      : {action.type} para{" "}
      <span className="text-yellow-400">{action.targetName}</span> ⟶{" "}
      <span className={diceStyle}>{firstDice}</span> + ({action.rollResult.total} - {firstDice}) ={" "}
      <span className="font-semibold text-green-300">{action.rollResult.total}</span>
    </div>
  );
};

  return (
    <>
      <div className="h-full bg-gray-900 flex flex-col">
        {/* Tabs Header */}
        <div className="flex border-b border-gray-700">
          {(["token", "item", "music", "chat"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-gray-800 text-green-400 border-b-2 border-green-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "token" && (
            <div className="flex flex-col h-full">
              <h2 className="text-lg font-bold text-white select-none mb-2">
                Biblioteca de Tokens
              </h2>
              <button
                onClick={() => setFormOpen(true)}
                className="w-full mb-4 py-2 text-white text-sm font-bold bg-green-600 hover:bg-green-700 rounded"
              >
                + Criar Token
              </button>
              <div className="flex-1 overflow-y-auto space-y-3">
                {tokens.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhum token criado.</p>
                ) : (
                  tokens.map((token) => (
                    <div
                      key={token.id}
                      className="bg-gray-800 p-3 rounded flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={token.imageUrl}
                          alt={token.name}
                          className="w-10 h-10 rounded object-cover cursor-grab"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("tokenId", token.id);
                            e.dataTransfer.setData("fromLibrary", "true");
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-white truncate">
                            {token.name}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            Status: {token.status} | Time: {token.team}
                          </div>
                        </div>
                        <button
                          onClick={() => removeToken(token.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Remover token"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <h3 className="text-sm text-white mb-1">Inventário</h3>
                        {renderInventory(token)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "item" && (
            <div className="flex flex-col h-full">
              <h2 className="text-lg font-bold text-white select-none mb-2">
                Itens
              </h2>
              <button
                className="w-full mb-4 py-2 text-white text-sm font-bold bg-blue-600 hover:bg-blue-700 rounded"
                onClick={() => {}}
              >
                + Adicionar Item
              </button>
              <p className="text-gray-400 text-sm">Nenhum item criado.</p>
            </div>
          )}

          {activeTab === "music" && (
            <div className="flex flex-col h-full">
              <h2 className="text-lg font-bold text-white select-none mb-2">
                Músicas
              </h2>
              <button
                className="w-full mb-4 py-2 text-white text-sm font-bold bg-purple-600 hover:bg-purple-700 rounded"
                onClick={() => {}}
              >
                + Adicionar Música
              </button>
              <p className="text-gray-400 text-sm">Nenhuma música adicionada.</p>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="flex flex-col h-full">
              <h2 className="text-lg font-bold text-white select-none mb-2">
                Historic Battle
              </h2>
              <div className="flex-1 overflow-y-auto bg-gray-800 rounded p-3 mb-2 space-y-2">
                {battleHistory.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhuma ação registrada.</p>
                ) : (
                  battleHistory.map((act, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-700 p-2 rounded hover:bg-gray-600 transition-colors"
                    >
                      {formatActionHistory(act)}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Filtro (opcional)..."
                  className="flex-1 p-2 rounded bg-gray-800 text-white text-sm border border-gray-700"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled
                />
                <button
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm font-bold"
                  disabled
                >
                  Filtrar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {formOpen && (
        <TokenForm
          onSave={(token) => {
            addToken(token);
            setFormOpen(false);
          }}
          onClose={() => setFormOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
