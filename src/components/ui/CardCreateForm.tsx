import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { type CardCausality, type Card, type CardDuration, type SpellCircle, type SpellType, type NonDefensiveCardCausality } from "../../types/card";
import { type PivotType, type TargetType } from "../../types/target";
import { type EffectType } from "../../types/effects";
import { TokenPrimaryElement } from "../../types/effects";
import { cardFromForm } from "../../models/forms/cardFormModel";

export type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";
export type ManaCostScale =
  | "Normal"
  | "Dobro"
  | "Triplo"
  | "Quadruplo"
  | "Quintuplo";


export interface CardModelFormProps {
  onSave: (card: Card) => void | Promise<void>;
  onClose: () => void;
  initialCard?: Card;
  mode?: "create" | "edit";
}

const MANA_SCALE_BY_COST: Record<number, ManaCostScale> = {
  1: "Normal",
  2: "Dobro",
  3: "Triplo",
  4: "Quadruplo",
  5: "Quintuplo",
};

export const CardModelForm: React.FC<CardModelFormProps> = ({
  onSave,
  onClose,
  initialCard,
  mode = initialCard ? "edit" : "create",
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialCard?.img ?? null);
  const [description, setDescription] = useState(initialCard?.desc ?? "");
  const [causality, setCausality] = useState(initialCard?.causality ?? "");
  const [causalityType, setCausalityType] = useState<CardCausality>(
    initialCard?.causalityType ?? "Offensive",
  );
  const [defenseReplicate, setDefenseReplicate] = useState<NonDefensiveCardCausality>(
    initialCard?.defenseReplicate ?? "Offensive",
  );
  const [actionsRequired, setActionsRequired] = useState(initialCard?.actionsRequired ?? 1);
  // O select exibe a primeira opção quando seu value é vazio, mas esse valor
  // vazio acabava persistido e a engine rejeitava o card ao usá-lo.
  const [typeTarget, setTypeTarget] = useState<TargetType>(
    initialCard?.target.type || "Self",
  );
  const [numbersTarget, setNumbersTarget] = useState(initialCard?.target.numbersTarget ?? 1);
  const targetQuantityInitialized = useRef(false);
  useEffect(() => {
    if (initialCard && !targetQuantityInitialized.current) {
      targetQuantityInitialized.current = true;
      return;
    }
    targetQuantityInitialized.current = true;
    setNumbersTarget(1);
  }, [typeTarget, initialCard]);
  
  const [numbersEntity, setNumbersEntity] = useState(initialCard?.entityQuantity ?? 0);
  const [cardDuration, setCardDuration] = useState<CardDuration>(initialCard?.duration ?? 0);
  const [isSpell, setIsSpell] = useState(
    typeof initialCard?.spellCircle === "number" && initialCard.spellCircle > 0,
  );
  const [spellType, setSpellType] = useState<SpellType>(initialCard?.spellType ?? "Abjuração");
  const [spellCircle, setSpellCircle] = useState<SpellCircle>(initialCard?.spellCircle ?? 1);
  const [haveEffectApplication, setHaveEffectApplication] = useState(
    Boolean(initialCard?.effectToApply.length),
  );
  const [effectApplication, setEffectApplication] = useState<EffectType[]>(
    initialCard?.effectToApply ?? [],
  );

  const [haveDuration, setHaveDuration] = useState((initialCard?.duration ?? 0) > 0);
  const [cardRecharge, setCardRecharge] = useState(Number(initialCard?.recharge ?? 4));
  
  /* Configuráveis de Pivot */
  const [pivotImgUrl, setPivotImgUrl] = useState(initialCard?.target.pivotSettings?.areaImgUrl ?? "");
  const [pivotType, setPivotType] = useState<PivotType>(
    initialCard?.target.pivotSettings?.pivotType ?? "Trigger-Fix",
  );
  const [pivotCellRange, setPivotCellRange] = useState(
    initialCard?.target.pivotSettings?.range ?? 1,
  );
  /* * */

  const spellInitialized = useRef(false);
  useEffect(() => {
    if (initialCard && !spellInitialized.current) {
      spellInitialized.current = true;
      return;
    }
    spellInitialized.current = true;
    if(isSpell)
    {
      setSpellType("Abjuração");
      setSpellCircle(1);
    }
    else if(!isSpell)
    {
      setSpellType(null);
      setSpellCircle(null);
    }
  }, [isSpell, initialCard])

  useEffect(() => {
    if(!haveEffectApplication)
    {
      setEffectApplication([]);
    }
  }, [haveEffectApplication])

  const durationInitialized = useRef(false);
  useEffect(() =>
    {
      if (initialCard && !durationInitialized.current) {
        durationInitialized.current = true;
        return;
      }
      durationInitialized.current = true;
      if(haveDuration)
      {
        setCardDuration(4);
      }
      else if(!haveDuration)
      {
        setCardDuration(0);
      }
    }, [haveDuration, initialCard]);

  useEffect(() => {
    console.log(cardDuration);
  }, [cardDuration])

  const [cardName, setCardName] = useState(initialCard?.name ?? "Generic");
  const [useBaseDice, setUseBaseDice] = useState(Boolean(initialCard?.baseDice));
  const [diceQuantity, setDiceQuantity] = useState(initialCard?.baseDice?.quantity ?? 1);
  const [diceType, setDiceType] = useState<DiceType>(
    (initialCard?.baseDice?.type ?? "d6") as DiceType,
  );
  const [isPartilOffensive, setIsPartialOffensive] = useState<boolean | undefined>(
    initialCard?.partialOffensive ?? false,
  );

  const [useManaScale, setUseManaScale] = useState((initialCard?.manaRequired ?? 0) > 0);
  const [manaScale, setManaScale] = useState<ManaCostScale>(
    MANA_SCALE_BY_COST[initialCard?.manaRequired ?? 1] ?? "Normal",
  );
  const targetLayoutInitialized = useRef(false);
  useEffect(() =>
  {
    if (initialCard && !targetLayoutInitialized.current) {
      targetLayoutInitialized.current = true;
      return;
    }
    targetLayoutInitialized.current = true;
    if(causalityType !== "Offensive")
    {
      setIsPartialOffensive(undefined);
    }
    else
    {
      setIsPartialOffensive(false);
    }

  }, [causalityType, initialCard])

  const targetSettingsInitialized = useRef(false);
  useEffect(() =>
  {
    if (initialCard && !targetSettingsInitialized.current) {
      targetSettingsInitialized.current = true;
      return;
    }
    targetSettingsInitialized.current = true;
    if(typeTarget === "Ambient")
    {
      setNumbersEntity(1);
      setPivotCellRange(1);
    }
    else
    {
      setNumbersEntity(0);
      setPivotImgUrl("");
      setPivotCellRange(0);
      setPivotType("Trigger-Fix");
    }
  }, [typeTarget, initialCard]);

  useEffect(() =>
  {
    if(pivotType === "Trigger-Fix")
    {
      setNumbersEntity(1);
    }
  }, [pivotType]);

  useEffect(() => {
    if(effectApplication.length> 0)
    {
      effectApplication.forEach((e) =>
      {
        console. info(e);
      })
    }
  },[effectApplication]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!imagePreview || !description.trim() || !causality.trim()) {
      alert("Imagem, descrição e causalidade são obrigatórios.");
      return;
    }

    const manaRequired = useManaScale
      ? ["Normal", "Dobro", "Triplo", "Quadruplo", "Quintuplo"].indexOf(manaScale) + 1
      : undefined;
    const card = cardFromForm({
      existing: initialCard,
      name: cardName,
      imageUrl: imagePreview,
      description,
      causality,
      causalityType,
      defenseReplicate,
      spellCircle,
      spellType,
      entityQuantity: numbersEntity,
      partialOffensive: isPartilOffensive,
      actionsRequired,
      targetType: typeTarget,
      targetQuantity: numbersTarget,
      pivotImageUrl: pivotImgUrl,
      pivotType: pivotType as PivotType,
      pivotRange: pivotCellRange,
      duration: cardDuration,
      recharge: cardRecharge,
      effects: effectApplication,
      baseDice: useBaseDice ? {
        quantity: Math.max(1, diceQuantity),
        type: diceType,
      } : undefined,
      manaRequired,
    });

    await onSave(card);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[520px] bg-gray-800 rounded-lg p-4 md:p-6 text-white shadow-2xl
                   max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold text-purple-400">
          {mode === "edit" ? "Editar Card" : "Criar Novo Card"}
        </h2>
        
        {/* Nome do Card */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Nome do Card</span>
          <input 
            type="text" 
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            required
            className="p-2 rounded bg-gray-700 border border-gray-600"
          />
        </label>

        {/* Imagem */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Imagem</span>
          <input
            type="text"
            value={imagePreview ?? ""}
            onChange={(e) => setImagePreview(e.target.value)}
            required
            className="p-2 rounded bg-gray-700 border border-gray-600"
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-2 w-24 h-24 object-cover rounded border-2 border-purple-400"
            />
          )}
        </label>

        {/* Speel / IsSpell */}
        <span className="font-semibold text-sm">Spell</span>
        <fieldset className="border border-gray-600 p-3 rounded pb-2 mb-2">
          <input 
            className="accent-purple-400"
            type="checkbox" 
            checked={isSpell}
            onChange={(e) =>
              setIsSpell(e.target.checked)
            }
          />
          <span className="font-semibold text-sm ml-2">É Spell?</span>
          {isSpell &&(
            <div className="grid grid-cols-2 gap-3">
              <select
                value={spellType as string}
                onChange={(e) =>
                  setSpellType(e.target.value as SpellType)
                }
                className="p-2 rounded bg-gray-700 border border-gray-600"
              >
                {[
                  "Abjuração" , 
                  "Encantamento" , 
                  "Conjuração" , 
                  "Ilusão" , 
                  "Transmutação" ,
                  "Advinhação" , 
                  "Necromancia" , 
                  "Evocação",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                className="p-2 rounded bg-gray-700 border border-gray-600" 
                type="number" 
                min={1} 
                max={9}
                value={spellCircle as number}
                onChange={(e) => 
                  setSpellCircle(Number(e.target.value) as SpellCircle)
                }
              />
            </div>
          )}
        </fieldset>

        {/* Descrição */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Descrição</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="p-2 rounded bg-gray-700 border border-gray-600 resize-none"
            required
          />
        </label>

        {/* Causalidade */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Descrição da Causalidade</span>
          <textarea
            value={causality}
            onChange={(e) => setCausality(e.target.value)}
            rows={4}
            className="p-2 rounded bg-gray-700 border border-gray-600 resize-none"
            required
          />
        </label>
        
        <p className="font-semibold text-sm mt-2"> Tipo de Causalidade</p>
        <fieldset className="border border-gray-600 p-3 rounded pb-2 mb-2 mt-1">
          <select
            value={causalityType}
            onChange={(e) =>
              setCausalityType(e.target.value as CardCausality)
            }
            className="p-2 rounded bg-gray-700 border border-gray-600 w-full"
          >
            {[
              "Direct-Damage" , 
              "Only-Effect-Application" , 
              "Offensive" , 
              "Defensive" , 
              "Cure",
              ].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {causalityType === "Offensive" && (
            <div>
              <input className="accent-purple-400 mt-2" type="checkbox" checked={isPartilOffensive} onChange={(e) => setIsPartialOffensive(e.target.checked)} />
              <span className=" ml-2 text-sm">É parcialmente offensivo?</span>
            </div>
          )
          }
          
          {
            causalityType === "Defensive" && (
              <div>
                <p className="font-semibold text-sm mt-3 mb-1">Como atua o Card Defensivo?:</p>
                <select
                  value={defenseReplicate}
                  onChange={(e) =>
                    setDefenseReplicate(e.target.value as NonDefensiveCardCausality)
                  }
                  className="p-2 rounded bg-gray-700 border border-gray-600 w-full"
                >
                  {[
                    "Direct-Damage" , 
                    "Only-Effect-Application" , 
                    "Offensive" , 
                    "Cure",
                    ].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        </fieldset>

        
        {/* Ações */}
        <label className="flex flex-col gap-1 pb-2">
          <span className="font-semibold text-sm">
            Ações Requeridas
          </span>
          <input
            type="number"
            min={0}
            max={5}
            value={actionsRequired}
            onChange={(e) =>
              setActionsRequired(Number(e.target.value))
            }
            className="p-1 rounded bg-gray-700 border border-gray-600 text-center"
          />
        </label>

        {/*Configuráveis*/}
        <p className="font-semibold text-sm mb-1">Configuráveis</p>
        <fieldset className="border border-gray-600 p-2 rounded mb-2">
          {/* Dado Base */}
          <fieldset className="border border-gray-600 p-3 rounded pb-2 mb-2">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={useBaseDice}
                onChange={(e) =>
                  setUseBaseDice(e.target.checked)
                }
                className="accent-purple-400"
              />
              <span className="font-semibold text-sm">
                Usar Dado Base
              </span>
            </label>

            {useBaseDice && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  value={diceQuantity}
                  onChange={(e) =>
                    setDiceQuantity(Number(e.target.value))
                  }
                  className="p-1 rounded bg-gray-700 border border-gray-600 text-center"
                />
                <select
                  value={diceType}
                  onChange={(e) =>
                    setDiceType(e.target.value as DiceType)
                  }
                  className="p-2 rounded bg-gray-700 border border-gray-600"
                >
                  <option value="d4">d4</option>
                  <option value="d6">d6</option>
                  <option value="d8">d8</option>
                  <option value="d10">d10</option>
                  <option value="d12">d12</option>
                  <option value="d20">d20</option>
                  <option value="d100">d100</option>
                </select>
              </div>
            )}
          </fieldset>

          {/* Mana */}
          <fieldset className="border border-gray-600 p-3 rounded pb-2 flex justify-center flex-col mb-2">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={useManaScale}
                onChange={(e) =>
                  setUseManaScale(e.target.checked)
                }
                className="accent-purple-400"
              />
              <span className="font-semibold text-sm">
                Usar Mana Requerida
              </span>
            </label>

            {useManaScale && (
              <select
                value={manaScale}
                onChange={(e) =>
                  setManaScale(e.target.value as ManaCostScale)
                }
                className="p-2 rounded bg-gray-700 border border-gray-600"
              >
                {[
                  "Normal",
                  "Dobro",
                  "Triplo",
                  "Quadruplo",
                  "Quintuplo",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </fieldset>
          {/* Efeito de Aplicação */}
          <fieldset className="border border-gray-600 p-3 rounded pb-2 flex justify-center mb-2 flex-col">
            <label className="flex itens-center gap-2 mb-2 w-full">
              <input type="checkbox" className="accent-purple-400" checked={haveEffectApplication} onChange={(e) => setHaveEffectApplication(e.target.checked)}/>
              <span className="font-semibold text-sm ">Tem efeito de aplicação?</span>
            </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {effectApplication.map(effect => (
                    <span
                      key={effect}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-purple-700 text-xs"
                    >
                      {effect}
                      <button
                        type="button"
                        onClick={() =>
                          setEffectApplication(prev =>
                            prev.filter(e => e !== effect)
                          )
                        }
                        className="text-red-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

              {haveEffectApplication && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const value = e.target.value as EffectType;
                    if (!value) return;

                    setEffectApplication(prev =>
                      prev.includes(value) ? prev : [...prev, value]
                    );

                    e.target.value = "";
                  }}
                  className="mt-2 bg-gray-700 border border-gray-600 rounded p-2 text-sm w-full"
                >
                  <option value="" disabled>
                    Adicionar efeito...
                  </option>

                  {TokenPrimaryElement.map((effect) => (
                    <option key={effect} value={effect}>
                      {effect}
                    </option>
                  ))}
                </select>
              )}

          </fieldset>
          {/* Duração do Card */}
          <fieldset className="border border-gray-600 p-3 rounded pb-2 flex justify-center flex-col mb-2">
              <label className="flex itens-center gap-2 w-full mb-2 w-full">
                <input type="checkbox" checked={haveDuration} onChange={(e) => setHaveDuration(e.target.checked)} className="accent-purple-400"/>
                <span className="text-sm font-semibold">Card tem duração?</span>
              </label>

                {haveDuration && (
                  <div>
                    <select className="bg-gray-700 border border-gray-600 rounded p-1 m-1" value={cardDuration as number} onChange={(e) => setCardDuration(Number(e.target.value))}>
                      <option value={4}>4</option>
                      <option value={8}>8</option>
                      <option value={16}>16</option>
                      <option value={32}>32</option>
                      <option value={64}>64</option>
                      <option value={128}>128</option>
                    </select>
                    <span className="text-sm font-semibold w-full">Rounds</span>
                  </div>
                  
                )
                }              
          </fieldset>

          <fieldset className="border border-gray-600 p-3 rounded pb-2 flex justify-center flex-col">
            <span className="text-sm font-semibold mb-1">Tempo de Recarga</span>
            <select className="bg-gray-700 border border-gray-600 p-1 rounded" value={cardRecharge} onChange={(e) => setCardRecharge(Number(e.target.value))}>
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
              <option value={64}>64</option>
              <option value={128}>128</option>
            </select>
          </fieldset>
        </fieldset>

        {/* Alvo */}
        <span className="font-semibold text-sm">Alvo</span>
        <fieldset className="border border-gray-600 p-3 rounded flex justify-center flex-col">
          <span className="font-semibold text-sm">Tipo de Alvo</span>
          <select 
            className="p-2 rounded bg-gray-700 border border-gray-600 m-0 mx-auto mb-2"
            value={typeTarget}
            onChange={(e) =>
              setTypeTarget(e.target.value as TargetType)
            }
          >
              {[
                "Self",
                "Target",
                "Multi-Target",
                "Ambient",
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </select>
          {typeTarget === "Ambient" && (
            <label className="w-50 flex flex-col gap-1">
              <span className="font-semibold text-sm">Imagem</span>
              <input
                type="text"
                value={pivotImgUrl}
                onChange={(e)=>setPivotImgUrl(e.target.value)}
                required
                className="p-2 rounded bg-gray-700 border border-gray-600"
              />
              {pivotImgUrl !== "" && (
                <img
                  src={pivotImgUrl}
                  alt="Preview"
                  className="mt-2 w-24 h-24 object-cover rounded border-2 border-purple-400"
                />
              )}
            </label>            
          )}
          {typeTarget === "Ambient" && pivotType !== "Trigger-Fix" &&(
            <div>
              <span
                className="font-semibold text-sm"
              >
                Quantidade de Entidades</span>
              <input 
                type="number" 
                className="p-1 rounded bg-gray-700 border border-gray-600 text-center"
                min={1}
                value={numbersEntity}
                onChange={(e) =>
                  setNumbersEntity(Number(e.target.value))
                }
              />
            </div>
          )          
          }
          {typeTarget === "Ambient" && (
            <div>
              <span
                className="font-semibold text-sm"
              >
                Range das Entidades</span>
              <input 
                type="number" 
                className="p-1 rounded bg-gray-700 border border-gray-600 text-center"
                min={1}
                value={pivotCellRange}
                onChange={(e) =>
                  setPivotCellRange(Number(e.target.value))
                }
              />
            </div>
          )          
          }          
          {typeTarget === "Ambient" && (
            <div>
              <span
                className="font-semibold text-sm"
              >
                Tipo de Pivot</span>
              <select value={pivotType} onChange={(e) => setPivotType(e.target.value as PivotType)}className="p-2 rounded bg-gray-700 border border-gray-600 m-0 mx-auto mb-2 w-full">
                <option value="Trigger-Fix">Auto Fixo</option>
                <option value="Cell-Fix">Fixo em Célula</option>
                <option value="Token-Fix">Fixo em Token(s)</option>
              </select>
            </div>
          )          
          }
                    
          {typeTarget === "Multi-Target" && (
            <div>
              <span
                className="font-semibold text-sm"
              >
                Quantidade de Alvos</span>
              <input 
                type="number" 
                className="p-1 rounded bg-gray-700 border border-gray-600 text-center"
                min={1}
                value={numbersTarget}
                onChange={(e) =>
                  setNumbersTarget(Number(e.target.value))
                }
              />
            </div>
          )
          }
        </fieldset>

        {/* Ações */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-600">
          <button
            type="button"
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded font-semibold cursor-pointer"
          >
            {mode === "edit" ? "Salvar Card" : "Criar Card"}
          </button>
        </div>
      </form>
    </div>
  );
};

export const CardCreateForm: React.FC<Omit<CardModelFormProps, "initialCard" | "mode">> = (props) => (
  <CardModelForm {...props} mode="create" />
);

export default CardCreateForm;
