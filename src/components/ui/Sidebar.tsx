import React, { useEffect, useRef, useState } from "react";
import TokenForm from "./TokenForm";
import TokenEditForm from "./TokenEditForm";
import CardCreate from "./CardCreateForm";
import type { Token } from "../../types/token";
import type { Card } from "../../types/card";
import type { ActionChoice } from "../../types/battle";
import MusicList from "../music/MusicList";
import { PencilLine } from "lucide-react";
import type { Item, ItemRarity } from "../../types/item";
import ItemCreateForm from "./ItemCreateForm";

interface SidebarProps {
  tokens: Token[];
  tokenBeingEdited: Token | null,
  cards: Card[];
  items: Item[];
  addToken: (token: Token) => void;
  updateToken: (token: Token) => void;
  onEditToken: (token: Token) => void;
  onSaveEditedToken: (token: Token) => void;
  onCloseEditedToken: (token: Token | null) => void,
  removeToken: (tokenId: string) => void;
  addCard: (card: Card) => void;
  removeCard: (cardId: string) => void;
  addItem: (item: Item) => void;
  removeItem: (itemId: string) => void;
  battleHistory: (ActionChoice & { round: number; attackerName: string; targetName: string })[];
  // Controle de largura vindo do BoardPage (wrapper fixed right-0)
  widthPx: number;
  onWidthChange: (w: number) => void;
}

type TabType = "token" | "cards" |"item" | "music" | "chat";

const Sidebar: React.FC<SidebarProps> = ({
  tokens,
  tokenBeingEdited,
  cards,
  items,
  addToken,
  updateToken,
  onEditToken,
  onSaveEditedToken,
  onCloseEditedToken,
  removeToken,
  addCard,
  removeCard,
  addItem,
  removeItem,
  battleHistory,
  widthPx,
  onWidthChange,
}) => {

  const [formOpen, setFormOpen]         = useState<boolean>(false);
  const [cardFormOpen, setCardFormOpen] = useState<boolean>(false);
  const [itemFormOpen, setItemFormOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabType>("token");
  const [chatInput, setChatInput] = useState("");
  
  const rarityNameFormated: Record<ItemRarity, string> = 
  {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    "very-rare": "Very-Rare",
    epic: "Epic",
    mitic: "Mitic",
    legendary: "Legendary",
    supreme: "Supreme",
    absolute: "Absolute",
  };

  const rarityColorFormated: Record<ItemRarity, {bg: string, txt: string}> =
  {
    common: {bg: "gray", txt: "gray"},
    uncommon: {bg: "blue", txt: "blue"},
    rare: {bg: "orange", txt: "orange"},
    "very-rare": {bg: "green", txt: "green"},
    epic: {bg: "purple", txt: "pink"},
    mitic: {bg: "red", txt: "red"},
    legendary: {bg: "yellow", txt: "yellow"},
    supreme: {bg: "red", txt: "purple"},
    absolute: {bg: "pink", txt: "purple"},     
  }

  const rarityColorRegulateFormated: Record<ItemRarity, {bg: string, txt: string}> =
  {
    common: {bg: "600", txt: "500"},
    uncommon: {bg: "600", txt: "500"},
    rare: {bg: "600", txt: "700"},
    "very-rare": {bg: "600", txt: "500"},
    epic: {bg: "600", txt: "500"},
    mitic: {bg: "600", txt: "500"},
    legendary: {bg: "600", txt: "500"},
    supreme: {bg: "600", txt: "400"},
    absolute: {bg: "600", txt: "500"},    
  }

  // Limits
  const minPx = 240;
  const maxPx = 560;

  // Resize refs
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const onPointerDown = (clientX: number) => {
    resizingRef.current = true;
    startXRef.current = clientX;
    startWidthRef.current = widthPx;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (clientX: number) => {
    if (!resizingRef.current) return;
    // Arrastar para esquerda aumenta a largura (como Explorer do VS Code)
    const delta = startXRef.current - clientX;
    const next = Math.min(maxPx, Math.max(minPx, startWidthRef.current + delta));
    onWidthChange(next);
  };

  

  const stopResizing = () => {
    if (!resizingRef.current) return;
    resizingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX);
    const onMouseUp = () => stopResizing();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) onPointerMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => stopResizing();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const renderInventory = (token: Token) => (
    <div className="grid grid-cols-2 gap-2">
      {(["primaryHand", "offHand", "neck", "ring", "armor"] as const).map((slot) => (
        <div key={slot} className="flex flex-col">
          <label className="text-xs text-gray-400 capitalize mb-1">{slot}</label>
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
      ))}
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

  const formatActionHistory = (
    action: ActionChoice & { round: number; attackerName: string; targetName: string }
  ) => {
    const firstDice = action.rollResult.rawRolls[0];
    let diceStyle = "";
    if (firstDice === 20) {
      diceStyle = "text-green-400 font-bold drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]";
    } else if (firstDice === 1) {
      diceStyle = "text-red-400 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]";
    } else {
      diceStyle = "text-white";
    }
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
      {/* Wrapper usa a largura vinda do BoardPage */}
      <div
        className="relative h-full bg-gray-900 flex flex-col"
        style={{ width: `${widthPx}px` }}
      >
        {/* Handle de arraste na esquerda */}
        <div
          title="Arraste para redimensionar"
          className="absolute top-0 left-0 h-full w-2.5 cursor-col-resize select-none"
          onMouseDown={(e) => onPointerDown(e.clientX)}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) onPointerDown(e.touches[0].clientX);
          }}
          onDoubleClick={() => onWidthChange(320)}
        />

        {/* Tabs Header */}
        <div className="flex border-b border-gray-700">
          {(["token", "cards","item", "music", "chat"] as TabType[]).map((tab) => (
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

        {/* Centro responsivo */}
        <div className="flex-1 overflow-y-auto p-4 pl-5">
          <div className="w-full flex flex-col items-center gap-3">
            {activeTab === "token" && (
              <div className="w-full flex flex-col">
                <h2 className="text-lg font-bold text-white select-none mb-2 text-center">
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
                    <p className="text-gray-400 text-sm text-center">Nenhum token criado.</p>
                  ) : (
                    tokens.map((token) => (
                      <div key={token.id} className="bg-gray-800 p-3 rounded flex flex-col gap-2">
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
                            <div className="font-semibold text-white truncate">{token.name}</div>
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
                          <button
                            onClick={() => onEditToken(token)}
                            title="Editar Token"
                            className="text-gray-400 hover:text-gray-300 text-sm"
                          >
                            <PencilLine size={15}></PencilLine>
                          </button>
                        </div>
                        <div className="bg-gray-700 p-2 rounded">
                          <h3 className="text-sm text-white mb-1 text-center">Inventário</h3>
                          {renderInventory(token)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {activeTab === "cards" && (
              <div className="w-full flex flex-col h-full">
                <h2 className="text-lg font-bold text-white select-none mb-2 text-center">
                  Biblioteca de Cards
                </h2>

                <button
                  onClick={() => setCardFormOpen(true)}
                  className="w-full mb-4 py-2 text-white text-sm font-bold
                            bg-orange-600 hover:bg-orange-700 rounded transition-colors"
                >
                  + Criar Card
                </button>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {cards.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center">
                      Nenhum card criado.
                    </p>
                  ) : (
                    cards.map((card) => (
                      <div
                        key={card.id}
                        className="bg-gray-800 p-3 rounded flex flex-col gap-2
                                  hover:bg-gray-750 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Imagem */}
                          <img
                            src={card.img}
                            alt="Card"
                            className="w-12 h-12 object-cover rounded border border-gray-600"
                            draggable={false}
                          />

                          {/* Conteúdo */}
                          <div className="flex-1 overflow-hidden">
                            <h2 className="text-sm font-bold text-white line-clamp-2">
                              {card.name}
                            </h2>
                            <p className="text-sm font-semibold text-gray-500 line-clamp-2">
                              {card.desc}
                            </p>

                            <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                              {card.causality}
                            </p>
                          </div>

                          {/* Remover */}
                          <button
                            onClick={() => removeCard(card.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                            title="Remover card"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Rodapé técnico */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                          <span className="bg-gray-700 px-2 py-0.5 rounded">
                            Ações: {card.actionsRequired}
                          </span>

                          {card.baseDice && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">
                              {card.baseDice.quantity}
                              {card.baseDice.type}
                            </span>
                          )}

                          {card.manaRequired && (
                            <span className="bg-blue-700/40 px-2 py-0.5 rounded text-blue-300">
                              Mana: {card.manaRequired}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "item" && (
              <div className="w-full flex flex-col h-full">
                <h2 className="text-lg font-bold text-white select-none mb-2 text-center">
                  Itens
                </h2>

                <button
                  onClick={() => setItemFormOpen(true)}
                  className="w-full mb-4 py-2 text-white text-sm font-bold
                            bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  + Adicionar Item
                </button>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {items.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center">
                      Nenhum item criado.
                    </p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-800 p-3 rounded flex flex-col gap-2
                                  hover:bg-gray-750 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Imagem */}
                          <img
                            src={item.imgUrl}
                            alt="Item"
                            className="w-12 h-12 object-cover rounded border border-gray-600"
                            draggable={false}
                          />

                          {/* Conteúdo */}
                          <div className="flex-1 overflow-hidden">
                            <h2 className="text-sm font-bold text-white line-clamp-2">
                              {item.name}
                            </h2>

                            <p className="text-sm font-semibold text-gray-500 line-clamp-2">
                              {item.desc}
                            </p>
                          </div>

                          {/* Remover */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                            title="Remover item"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Rodapé técnico */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                          {item.rarity && (
                            <span className={`bg-${rarityColorFormated[item.rarity].bg}-${rarityColorRegulateFormated[item.rarity].bg} px-2 py-0.5 rounded text-${rarityColorFormated[item.rarity].txt}-${rarityColorRegulateFormated[item.rarity].txt} font-bold`}>
                              {rarityNameFormated[item.rarity]}
                            </span>
                          )}

                          {item.value !== undefined && (
                            <span className={`bg-${item.value === 0 ? "gray" : "yellow"}-600 px-2 py-0.5 rounded text-${item.value === 0 ? "gray" : "yellow"}-300`}>
                              Valor: {item.value}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {activeTab === "music" && (
              <div className="w-full flex flex-col">
                <h2 className="text-lg font-bold text-white select-none mb-2 text-center">
                  Músicas
                </h2>
                <p className="text-gray-400 text-xs text-center mb-3">
                  Coloque arquivos em /src/musics para aparecerem aqui.
                </p>
                <MusicList />
              </div>
            )}


            {activeTab === "chat" && (
              <div className="w-full flex flex-col">
                <h2 className="text-lg font-bold text-white select-none mb-2 text-center">Historic Battle</h2>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-800 rounded p-3 mb-2 space-y-2">
                    {battleHistory.length === 0 ? (
                      <p className="text-gray-400 text-sm">Nenhuma ação registrada.</p>
                    ) : (
                      battleHistory.map((act, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-700 p-2 rounded hover:bg-gray-600 transition-colors break-words"
                        >
                          {/* Garante truncamento/corte seguro em strings muito longas */}
                          <div className="break-words break-all min-w-0">
                            {formatActionHistory(act)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 min-w-0">
                    <input
                      type="text"
                      placeholder="Filtro (opcional)..."
                      className="flex-1 min-w-0 p-2 rounded bg-gray-800 text-white text-sm border border-gray-700"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled
                    />
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm font-bold flex-shrink-0"
                      disabled
                    >
                      Filtrar
                    </button>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {formOpen && (
        <TokenForm
          onSave={(token) => {
            addToken(token);
            setFormOpen(false);
          }}
          onClose={() => setFormOpen(false)}
          cards={cards}
          items={items}
        />
      )}

    {cardFormOpen && (
      <CardCreate
        onSave={(newCard) => {
          addCard(newCard);
          setCardFormOpen(false);
        }}
        onClose={() => setCardFormOpen(false)}
      />
    )}

      {tokenBeingEdited && (
        <TokenEditForm
          theseToken={tokenBeingEdited}
          cards={cards}
          items={items}
          onClose={() => onCloseEditedToken(null)}
          onSave={onSaveEditedToken}
        />
      )}

      {itemFormOpen && (
        <ItemCreateForm
          availableCards={cards}
          onSave={addItem}
          onClose={() => setItemFormOpen(false)}
        />
      )
      }

    </>
  );
};

export default Sidebar;

