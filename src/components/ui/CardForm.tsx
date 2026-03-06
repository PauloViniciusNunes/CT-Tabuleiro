import React, { useState, useRef, useEffect } from "react";
import type { Token } from "../../types/token";
import type { Card } from "../../types/card";
import type { Target } from "../../types/target";


interface CardFormProps {
  tokenTrigger: Token;
  availableActions: number;
  availableMana: number;
  cardTimeToRecharge:(card: Card) => number;
  target: Token[];
  availableCardsIds: string[];
  onClose?: () => void;
  onConfirm?: (card: Card, target: Target | null) => void;
}

const CardForm: React.FC<CardFormProps> = ({
  tokenTrigger,
  availableActions,
  availableMana,
  target,
  availableCardsIds,
  cardTimeToRecharge,
  onClose,
  onConfirm,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const targets = useRef<Target | null>({
    type: "Self",
    pivot: null,
    pivotSettings: undefined,
    numbersTarget: 1,
    tokenTarget: null,
  });

  const proficiency = Math.ceil(((tokenTrigger.attributes.level - 10) / 4) + 4)
  const canUseCard =
    selectedCard &&
    (selectedCard.actionsRequired ?? 0) <= availableActions &&
    (((selectedCard.manaRequired ?? 0) * proficiency )) <= availableMana;
  
  useEffect(() => {
  if (selectedCard?.target.type === "Target" && target.length > 0) {
    const first = target[0];

    setSelectedTargetId(first.id);

    targets.current = {
      type: "Target",
      tokenTarget: [first],
      numbersTarget: 1,
      pivot: null,
      pivotSettings: undefined,
    };
  }
}, [selectedCard, target]);

useEffect(() => {
  if (!selectedCard) return;

  if (selectedCard.target.type === "Self") {
    targets.current = {
      type: "Self",
      pivot: null,
      pivotSettings: undefined,
      numbersTarget: 1,
      tokenTarget: null,
    };
  }
}, [selectedCard]);

useEffect(() => {
  if (selectedCard?.target.type !== "Multi-Target") return;

  const tokensSelected = target.filter(t =>
    selectedTargets.includes(t.id)
  );

  targets.current = {
    type: "Multi-Target",
    tokenTarget: tokensSelected,
    pivotSettings: undefined,
    numbersTarget: selectedCard.target.numbersTarget,
    pivot: null,
  };
}, [selectedTargets, selectedCard, target]);


  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-5">
        <h2 className="text-xl font-bold text-orange-400 mb-4 text-center">
          Seleção de Card
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* ========================= */}
          {/* PREVIEW DO CARD SELECIONADO */}
          {/* ========================= */}
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
            {!selectedCard ? (
              <p className="text-gray-400 text-sm text-center">
                Selecione um card para visualizar os detalhes.
              </p>
            ) : (
              <>
                {/* Cabeçalho */}
                <div className="flex items-center gap-3">
                  <img
                    src={selectedCard.img}
                    alt={selectedCard.name}
                    className="w-16 h-16 rounded object-cover border border-gray-600"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedCard.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selectedCard.causality}
                    </p>
                  </div>
                </div>

                {/* Descrição */}
                <div className="text-sm text-gray-200 bg-gray-700/50 rounded p-2">
                  {selectedCard.desc}
                </div>

                {/* Alvo */}
                <span className="text-sm font-semibold">Alvo:</span>
                <div className="text-sm text-gray-200 bg-gray-700/50 rounded p-2">
                    
                      {selectedCard.target.type === "Target" && (                        
                          <select 
                          className="bg-gray-700 w-full p-1 font-semibold"
                          value={selectedTargetId}
                          onChange={(e) => {

                            const id = e.target.value;
                            setSelectedTargetId(id);                            

                            const tokens = target.find(t => t.id === e.target.value);

                            if(!tokens) return;

                            targets.current = {
                              type: "Target",
                              tokenTarget: [tokens],
                              numbersTarget: 1,
                              pivot: null,
                              pivotSettings: undefined,
                            }

                            console.warn(targets)
                          }}>

                            {target.filter(t => t.team !== tokenTrigger.team).map((t) => (
                              <option value={t.id} key={t.id}>
                                {t.name}
                              </option>
                            ))}

                          </select>
                          )                       
                      }

                      {selectedCard.target.type === "Multi-Target" && (
                        <div className="bg-gray-700/50 w-full text-sm rounded p-2 space-y-1">
                          {target.filter(t => t.team !== tokenTrigger.team).map((t) => {
                            const checked = selectedTargets.includes(t.id);

                            return (
                              <label
                                key={t.id}
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer
                                  ${checked ? "bg-orange-600/30" : "hover:bg-gray-600/40"}
                                `}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-orange-500"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedTargets((prev) => {
                                      if (e.target.checked) {
                                        if (prev.length >= (selectedCard.target.numbersTarget ?? 1)) return prev;
                                        return [...prev, t.id];
                                      }
                                      return prev.filter((id) => id !== t.id);
                                    });
                                  }}
                                />
                                <span>{t.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {selectedCard.target.type === "Ambient" && (
                        <p className="text-sm font-semibold text-gray-200 m-2">O alvo deste Card é o própio Ambiente. O Card possui a geração de {selectedCard.entityQuantity} {selectedCard.entityQuantity > 1 ? "entidades" : "entidade"} com raio de {selectedCard.target.pivotSettings?.range} {(selectedCard.target.pivotSettings?.range ?? 1) > 1 ? "células" : "célula"}. {selectedCard.target.pivotSettings?.pivotType === "Trigger-Fix" ? "Esse Card irá gerar uma entidade que será âncorada a seu personagem." : ""}</p>
                      )}
                    
                </div>

                {/* Informações técnicas */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                  <span className="bg-gray-700 px-2 py-1 rounded">
                    Ações: {selectedCard.actionsRequired ?? 0}
                  </span>

                  {selectedCard.manaRequired !== undefined && (
                    <span className="bg-blue-700/40 px-2 py-1 rounded text-blue-300">
                      Mana: {(selectedCard.manaRequired ?? 0 )* proficiency}
                    </span>
                  )}

                  {selectedCard.baseDice && (
                    <span className="bg-purple-700/40 px-2 py-1 rounded text-purple-300">
                      {selectedCard.baseDice.quantity}
                      {selectedCard.baseDice.type}
                    </span>
                  )}
                </div>

                {/* Avisos */}
                {!canUseCard && (
                  <p className="text-red-400 text-xs mt-2">
                    Recursos insuficientes para usar este card.
                  </p>
                )}
              </>
            )}
          </div>

          {/* =========================  */}
          {/* LISTA DE CARDS DISPONÍVEIS */}
          {/* =========================  */}
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3 overflow-y-auto max-h-[420px]">
            {tokenTrigger.cards.length === 0 ? (
              <p className="text-red-400 text-sm text-center">
                Este personagem não possui cards.
              </p>
            ) : (
              tokenTrigger.cards.map((card) => {

                let cardNotRecharge = false;

                if(availableCardsIds === undefined)
                {
                  cardNotRecharge = false;
                }
                else if(availableCardsIds.includes(card.id))
                {
                  cardNotRecharge = true;
                  console.error("Personagem possui tokens indisponíveis...");
                }

                const disabled =
                  (card.actionsRequired ?? 0) > availableActions ||
                  (card.manaRequired ?? 0) > availableMana       ||
                  cardNotRecharge;

                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    disabled={disabled}
                    className={`flex items-center gap-3 p-2 rounded border transition-colors text-left
                      ${
                        selectedCard?.id === card.id
                          ? "border-orange-400 bg-gray-700"
                          : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                      }
                      ${disabled ? "opacity-40 cursor-not-allowed" : ""}
                    `}
                  >
                    <img
                      src={card.img}
                      alt={card.name}
                      className="w-10 h-10 rounded object-cover border border-gray-600"
                    />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-white truncate">
                        {card.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {card.causality}
                      </p>
                      {cardNotRecharge && (
                        <p className="text-sm font-semibold text-red-400 opacity-100">
                          {`Restam ${cardTimeToRecharge(card)} rounds para a recarga deste card.`}
                        </p>
                      )
                      }
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================= */}
        {/* BOTÕES */}
        {/* ========================= */}
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm font-semibold"
          >
            Cancelar
          </button>

          <button
            onClick={() => selectedCard && targets.current && onConfirm?.(selectedCard, targets.current)}
            disabled={!selectedCard || !canUseCard}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
          >
            Usar Card
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardForm;
