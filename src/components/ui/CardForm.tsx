import React, { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import type { Token } from "../../types/token";
import type { Card } from "../../types/card";
import type { Target } from "../../types/target";


interface CardFormProps {
  tokenTrigger: Token;
  availableActions: number;
  availableMana: number;
  defensiveCards: boolean;
  cardTimeToRecharge:(card: Card) => number;
  target: Token[];
  availableCardsIds: string[];
  onClose?: () => void;
  onConfirm?: (card: Card, target: Target | null) => void | Promise<void>;
}

const CardForm: React.FC<CardFormProps> = ({
  tokenTrigger,
  availableActions,
  availableMana,
  defensiveCards,
  target,
  availableCardsIds,
  cardTimeToRecharge,
  onClose,
  onConfirm,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [cardSearch, setCardSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef(false);

  const targets = useRef<Target | null>({
    type: "Self",
    pivot: null,
    pivotSettings: undefined,
    numbersTarget: 1,
    tokenTarget: null,
  });

  const proficiency = Math.ceil(((tokenTrigger.attributes.level - 10) / 4) + 4)
  const compatibleCards = tokenTrigger.cards.filter(card =>
    defensiveCards
      ? card.causalityType === "Defensive"
      : card.causalityType !== "Defensive"
  );
  const normalizedCardSearch = cardSearch.trim().toLocaleLowerCase();
  const filteredCards = compatibleCards.filter((card) => {
    if (!normalizedCardSearch) return true;

    return [card.name, card.causality, card.desc, card.causalityType]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedCardSearch);
  });
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


  const handleConfirm = async () => {
    if (!selectedCard || !targets.current || !canUseCard || submissionLockRef.current) return;

    submissionLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onConfirm?.(selectedCard, targets.current);
    } catch (error) {
      console.error("Não foi possível usar o card:", error);
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
        <h2 className="text-xl font-bold text-orange-400 mb-4 text-center">
          Seleção de Card
        </h2>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
          {/* ========================= */}
          {/* PREVIEW DO CARD SELECIONADO */}
          {/* ========================= */}
          <div className="min-h-0 overflow-y-auto rounded-lg bg-gray-800 p-4">
            <div className="flex flex-col gap-3">
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
          </div>

          {/* =========================  */}
          {/* LISTA DE CARDS DISPONÍVEIS */}
          {/* =========================  */}


          <div className="flex min-h-0 flex-col gap-3 rounded-lg bg-gray-800 p-4">
            <label className="relative block shrink-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={cardSearch}
                onChange={(event) => setCardSearch(event.target.value)}
                placeholder="Pesquisar cards..."
                aria-label="Pesquisar cards disponíveis"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-600 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 disabled:cursor-wait disabled:opacity-60"
              />
            </label>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredCards.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-red-400">
                  {compatibleCards.length === 0
                    ? "Este personagem não possui cards compatíveis."
                    : "Nenhum card corresponde à pesquisa."}
                </p>
              ) : (
                filteredCards.map((card) => {

                let cardNotRecharge = false;

                if (availableCardsIds === undefined)
                {
                  cardNotRecharge = false;
                }
                else if (availableCardsIds.includes(card.id)) {
                  cardNotRecharge = true;
                }

                const disabled =
                  (card.actionsRequired ?? 0) > availableActions ||
                  ((card.manaRequired ?? 0) * proficiency) > availableMana ||
                  cardNotRecharge;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCard(card)}
                    disabled={disabled || isSubmitting}
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
                      )}

                      {(card.actionsRequired ?? 0) > availableActions && (
                        <p className="text-sm font-semibold text-red-400 opacity-100">
                          {`Não possui ações suficientes. Requer ${card.actionsRequired}, mas atualmente possui ${availableActions}.`}
                        </p>
                      )}

                      {((card.manaRequired ?? 0) * proficiency) > availableMana && (
                        <p className="text-sm font-semibold text-red-400 opacity-100">
                          {`Mana total insuficiente para o uso desse card. DISPONÍVEL: ${availableMana} | NECESSÁRIO: ${card.manaRequired}`}
                        </p>                        
                      )}
                    </div>
                  </button>
                );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================= */}
        {/* BOTÕES */}
        {/* ========================= */}
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedCard || !canUseCard || isSubmitting}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
          >
            {isSubmitting ? "Usando..." : "Usar Card"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardForm;
