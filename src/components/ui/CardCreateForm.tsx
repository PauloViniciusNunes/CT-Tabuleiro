import React, { useEffect, useEffectEvent, useState, type ChangeEvent, type ChangeEventHandler, type FormEvent } from "react";
import { type CardCausality, type Card, type CardDuration, type SpellCircle, type SpellType } from "../../types/card";
import { type PivotType, type TargetType } from "../../types/target";
import { EFFECT_TYPES, type EffectType } from "../../types/effects";

export type DiceType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";
export type ManaCostScale =
  | "Normal"
  | "Dobro"
  | "Triplo"
  | "Quadruplo"
  | "Quintuplo";


interface CardCreateProps {
  onSave: (card: Card) => void;
  onClose: () => void;
}

const generateId = (): string =>
  Math.random().toString(36).slice(2, 11);

export const CardCreate: React.FC<CardCreateProps> = ({
  onSave,
  onClose,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [causality, setCausality] = useState("");
  const [causalityType, setCausalityType] = useState<CardCausality>("Offensive");
  const [actionsRequired, setActionsRequired] = useState(1);
  const [typeTarget, setTypeTarget] = useState<string>("");
  const [numbersTarget, setNumbersTarget] = useState<number>(1);
    useEffect(() => {
      setNumbersTarget(1);
  },[typeTarget]);
  
  const [numbersEntity, setNumbersEntity] = useState<number>(0);
  const [cardDuration, setCardDuration] = useState<CardDuration>(4);
  const [isSpell, setIsSpell]           = useState<boolean>(false);
  const [spellType, setSpellType]       = useState<SpellType>("Abjuração");
  const [spellCircle, setSpellCircle]   = useState<SpellCircle>(1);
  const [haveEffectApplication, setHaveEffectApplication] = useState<boolean>(false);
  const [effectApplication, setEffectApplication] = useState<EffectType[]>([]);

  const [haveDuration, setHaveDuration] = useState<boolean>(false);
  const [cardRecharge, setCardRecharge] = useState(4);
  
  /* Configuráveis de Pivot */
  const [pivotImgUrl, setPivotImgUrl] = useState<string>("");
  const [pivotType, setPivotType]     = useState<PivotType>("Trigger-Fix");
  const [pivotCellRange, setPivotCellRange] = useState<number>(1);
  /* * */

  useEffect(() => {
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
  }, [isSpell])

  useEffect(() => {
    if(!haveEffectApplication)
    {
      setEffectApplication([]);
    }
  }, [haveEffectApplication])

  useEffect(() => 
    {
      if(haveDuration)
      {
        setCardDuration(4);
      }
      else if(!haveDuration)
      {
        setCardDuration(0);
      }
    }, [haveDuration]);

  useEffect(() => {
    console.log(cardDuration);
  }, [cardDuration])

  const [cardName, setCardName] = useState<string>("Generic");
  const [useBaseDice, setUseBaseDice]   = useState(false);
  const [diceQuantity, setDiceQuantity] = useState(1);
  const [diceType, setDiceType] = useState<DiceType>("d6");
  const [isPartilOffensive, setIsPartialOffensive] = useState<boolean | undefined>(false);

  const [useManaScale, setUseManaScale] = useState(false);
  const [manaScale, setManaScale]       = useState<ManaCostScale>("Normal");
  useEffect(() =>
  {
    if(causalityType !== "Offensive")
    {
      setIsPartialOffensive(undefined);
    }
    else if(causality === "Offensive")
    {
      setIsPartialOffensive(false);
    }

  },[causalityType])

  useEffect(() =>
  {
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
  }, [typeTarget]);

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

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePivotImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPivotImgUrl("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setPivotImgUrl(reader.result as string);
    reader.readAsDataURL(file);    
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!imagePreview || !description.trim() || !causality.trim()) {
      alert("Imagem, descrição e causalidade são obrigatórios.");
      return;
    }

    const card: Card = {
      name: cardName,
      id: generateId(),
      img: imagePreview,
      desc: description.trim(),
      causality: causality.trim(),
      causalityType: causalityType,
      spellCircle: spellCircle,
      spellType: spellType,
      entityQuantity: numbersEntity,
      partialOffensive: isPartilOffensive,
      actionsRequired: Math.max(1, actionsRequired),
      target: {
        type: typeTarget as TargetType,
        pivot: [1,1],
        pivotSettings: {
          areaImgUrl: pivotImgUrl,
          pivotType: pivotType as PivotType,
          range: pivotCellRange,
        },
        numbersTarget: numbersTarget,
        tokenTarget: null
      },
      duration: cardDuration,
      recharge: cardRecharge,
      remainingDuration: cardDuration as number,
      itsLoaded: true,
      effectToApply: effectApplication,
    };

    if (useBaseDice) {
      card.baseDice = {
        quantity: Math.max(1, diceQuantity),
        type: diceType,
      };
    }

    if (useManaScale) {
      switch (manaScale) {
        case "Normal":
          card.manaRequired = 1;
          break;
        case "Dobro":
          card.manaRequired = 2;
          break;
        case "Triplo":
          card.manaRequired = 3;
          break;
        case "Quadruplo":
          card.manaRequired = 4;
          break;
        case "Quintuplo":
          card.manaRequired = 5;
          break
        default:
          card.manaRequired = 1;
          break;
      }
    }



    onSave(card);
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
          Criar Novo Card
        </h2>
        
        {/* Nome do Card */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Nome do Card</span>
          <input 
            type="text" 
            onChange={(e) => setCardName(e.target.value)}
            required
            className="p-2 rounded bg-gray-700 border border-gray-600"
          />
        </label>

        {/* Imagem */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Imagem</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
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
        </fieldset>

        
        {/* Ações */}
        <label className="flex flex-col gap-1 pb-2">
          <span className="font-semibold text-sm">
            Ações Requeridas
          </span>
          <input
            type="number"
            min={1}
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

                  {EFFECT_TYPES.map((effect) => (
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
                type="file"
                accept="image/*"
                onChange={handlePivotImageChange}
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
            Criar Card
          </button>
        </div>
      </form>
    </div>
  );
};

export default CardCreate;
