import React, { useState, type ChangeEvent, type FormEvent } from "react";
import type {TokenPrimaryElement, TokenPrimaryDisvantage} from "/home/paulon/Área de trabalho/Projetos/CT-Tabuleiro/src/types/effects.ts"
import type {
  Token,
  TokenAttributes,
  TokenProficiencies,
  TokenInventory,
  TokenStatus,
  TokenTeam,
  TokenClass
} from "../../types/token";
import type { Card } from "../../types/card";
import type { Item } from "../../types/item";
import { type ItemSlot } from "../../types/item";

interface TokenFormProps {
  onSave: (token: Token) => void;
  onClose: () => void;
  cards: Card[];
  items: Item[];
}

const teams: TokenTeam[] = ["Red", "Blue", "Green", "Yellow"];
const statuses: TokenStatus[] = ["Vivo", "Morto"];
const classes: TokenClass[] = ["Guerreiro", "Mago", "Bárbaro", "Ladino", "Feitiçeiro"];
export const elements: TokenPrimaryElement[] = [
  "neutro",
  "fogo",
  "terra",
  "vento",
  "agua",
  "darkfire",
  "arcano",
  "acido",
  "eletrico",
  "veneno",
  "som",
  "gelo",
  "sangue",
  "darkelectric"
];

export const disvantages: TokenPrimaryDisvantage[] = [
  "neutro",
  "fogo",
  "terra",
  "vento",
  "agua",
  "darkfire",
  "arcano",
  "acido",
  "eletrico",
  "veneno",
  "som",
  "gelo",
  "sangue",
  "darkelectric",
  "none", 
];


const initialAttributes: TokenAttributes = {
  forca: 20,
  destreza: 20,
  consistencia: 20,
  inteligencia: 20,
  sabedoria: 20,
  carisma: 20,
  level: 2,
  xp: 0,
};

const initialProficiencies: TokenProficiencies = {
  forca: false,
  destreza: false,
  consistencia: false,
  inteligencia: false,
  sabedoria: false,
  carisma: false,
};

const initialInventory: TokenInventory = {
  inventoryDimensions: {rows: 4, cols: 5},
  primaryHand: undefined,
  offHand: undefined,
  neck: undefined,
  ring: undefined,
  armor: undefined,
  commonSlot: [],
  economy: 0,
};

const generateId = (): string => Math.random().toString(36).slice(2, 11);

export const TokenForm: React.FC<TokenFormProps> = ({ onSave, onClose, cards, items }) => {
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<TokenAttributes>(initialAttributes);
  const [proficiencies, setProficiencies] = useState<TokenProficiencies>(
    initialProficiencies
  );
  const [inventory, setInventory]           = useState<TokenInventory>(initialInventory);

  const slotToTokenInventory: Record<ItemSlot, keyof TokenInventory> = 
  {
    "primary-hand": "primaryHand",
    "off-hand": "offHand",
    neck: "neck",
    ring: "ring",
    armor: "armor",
    "inventory-only": "commonSlot",
  }

  function addItemInCommonSlot(item: Item)
  {
    setInventory(prev => ({...prev, commonSlot: [...(prev.commonSlot ?? []), item]}));
  }

  function removeItemInSlot(id: string)
  {
    setInventory(prev => ({...prev, commonSlot: prev.commonSlot?.filter(x => x.id !== id)}))
  }

  const [itemChooseOpen, setItemChooseOpen] = useState<boolean>(false);

  const [status, setStatus] = useState<TokenStatus>("Vivo");
  const [team, setTeam] = useState<TokenTeam>("Red");
  const [bodytobodyRange, setBodytobodyRange] = useState(1);
  const [magicalRange, setMagicalRange] = useState(6);
  const [tokenClass, setTokenClass] = useState<TokenClass>("Guerreiro");
  const [primaryElement, setPrimaryElement] = useState<TokenPrimaryElement>("neutro");
  const [primaryDisvantage, setPrimaryDisvantage] = useState<TokenPrimaryDisvantage>("none");
  
  const [selfCards, setSelfCards] = useState<Card[]>([]);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);

  const equipSlots = [
    "primaryHand",
    "offHand",
    "neck",
    "ring",
    "armor",
  ] as const;

  const [slotTarget, setSlotTarget] = useState<keyof TokenInventory | null>(null);

  const openItemSelector = (slot: keyof TokenInventory) => {
    setSlotTarget(slot);
    setItemChooseOpen(true);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAttrChange = (key: keyof TokenAttributes, val: number) => {
    setAttributes((a) => ({ ...a, [key]: val }));
  };

  const handleProfChange = (key: keyof TokenProficiencies, checked: boolean) => {
    setProficiencies((p) => ({ ...p, [key]: checked }));
  };

  const handleInvChange = (key: keyof TokenInventory, val: Item | null) => {
    setInventory((inv) => ({ ...inv, [key]: val }));
  };

  const handleEconomyChange = (val: number) =>
  {
    setInventory((inv) => ({...inv, ["economy" as keyof TokenInventory]: val}));
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !imagePreview) {
      alert("Nome e imagem são obrigatórios.");
      return;
    }

    const token: Token = {
      id: generateId(),
      name: name.trim(),
      imageUrl: imagePreview,
      attributes,
      proficiencies,
      inventory,
      status,
      team,
      class: tokenClass,
      cards: selfCards, 
      position: { col: 1, row: 1 },
      bodytobodyRange: Math.max(1, bodytobodyRange),
      magicalRange: Math.max(1, magicalRange),
      tokenPrimaryElement: primaryElement,
      tokenPrimaryDisvantege: primaryDisvantage,
      ocassionalAddition: {
        forca: 0,
        destreza: 0,
        consistencia: 0,
        inteligencia: 0,
        sabedoria: 0,
        carisma: 0,
      },
    };

    onSave(token);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[520px] md:max-w-[560px] bg-gray-800 rounded-lg p-4 md:p-6 text-white shadow-2xl
               max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold text-green-400">Criar Novo Token</h2>

        {/* Nome */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Nome</span>
          <input
            type="text"
            className="w-full min-w-0 p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite o nome do token"
            required
          />
        </label>

        {/* Imagem */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Imagem</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full min-w-0 p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
            required
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-2 w-24 h-24 object-cover rounded border-2 border-green-400"
            />
          )}
        </label>

        {/* Atributos */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">Atributos</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {(
              [
                "forca",
                "destreza",
                "consistencia",
                "inteligencia",
                "sabedoria",
                "carisma",
              ] as const
            ).map((key) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs capitalize font-semibold">{key}</span>
                <input
                  type="number"
                  min={1}
                  className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                  value={attributes[key]}
                  onChange={(e) => handleAttrChange(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          {/* Classe* */}

          <label className="flex flex-col gap-1">
            <span className="font-semibold text-sm">Classe</span>
            <select
              value={tokenClass}
              onChange={(e) => setTokenClass(e.target.value as TokenClass)}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>            

          {/* Level e XP */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Level</span>
              <input
                type="number"
                min={1}
                className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                value={attributes.level}
                onChange={(e) => handleAttrChange("level", Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">XP</span>
              <input
                type="number"
                min={0}
                className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                value={attributes.xp}
                onChange={(e) => handleAttrChange("xp", Number(e.target.value))}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">
            Definição Elementar
          </legend>

          <label className="flex flex-col gap-1">
            <span className="font-semibold text-sm">Elemento Principal</span>
            <select
              value={primaryElement}
              onChange={(e) => setPrimaryElement(e.target.value as TokenPrimaryElement)}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
            >
              {elements.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label> 

          <label className="flex flex-col gap-1">
            <span className="font-semibold text-sm">Desvantagem Principal</span>
            <select
              value={primaryDisvantage}
              onChange={(e) => setPrimaryDisvantage(e.target.value as TokenPrimaryDisvantage)}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
            >
              {disvantages.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>                          
        </fieldset>

        {/* Proficiências */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">
            Proficiências
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {(
              [
                "forca",
                "destreza",
                "consistencia",
                "inteligencia",
                "sabedoria",
                "carisma",
              ] as const
            ).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={proficiencies[key]}
                  onChange={(e) => handleProfChange(key, e.target.checked)}
                  className="accent-green-400 w-4 h-4 cursor-pointer"
                />
                <span className="capitalize text-sm">{key}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Alcances de Ataque */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">
            Alcances de Ataque
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Alcance Físico</span>
              <input
                type="number"
                min={1}
                max={10}
                className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                value={bodytobodyRange}
                onChange={(e) => setBodytobodyRange(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Alcance Mágico</span>
              <input
                type="number"
                min={1}
                max={20}
                className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                value={magicalRange}
                onChange={(e) => setMagicalRange(Number(e.target.value))}
              />
            </label>
          </div>
        </fieldset>

        {/* Inventário */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">Inventário</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {equipSlots.map((slot) => {
              const item = inventory[slot];

              return (
                <div key={slot} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold capitalize">
                    {slot === "primaryHand"
                      ? "Mão Primária"
                      : slot === "offHand"
                      ? "Mão Secundária"
                      : slot}
                  </span>

                  <button
                    onClick={() => openItemSelector(slot)}
                    className="flex items-center gap-2 p-2 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600"
                  >
                    {item ? (
                      <>
                        <img
                          src={item.imgUrl}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <span className="text-sm text-white truncate">
                          {item.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Slot vazio — clicar para equipar
                      </span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* Economia permanece input */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Economia</span>
              <input
                type="number"
                min={0}
                className="p-1 rounded bg-gray-600 border border-gray-500 text-center"
                value={inventory.economy}
                onChange={(e) =>
                  handleEconomyChange(Number(e.target.value))
                }
              />
            </label>
          </div>
            
            <fieldset className="border border-gray-600 rounded p-2">
              <legend className="font-semibold text-green-400 px-2">Mochila</legend>
              <button
                type="button"
                onClick={() => {
                  setSlotTarget(null);
                  setItemChooseOpen(true);
                }}
                className="w-full text-center bg-blue-600 hover:bg-blue-500 cursor-pointer px-6 py-2 rounded font-semibold transition-colors"
              >
                + Adicionar Item
              </button>

            <div className="pt-2">
              {inventory.commonSlot?.length === 0 ? (
                <p className="text-gray-400 text-sm text-center">Nenhum item na mochila.</p>
              ) : (
                inventory.commonSlot?.map((i) => (
                  <div
                    key={i.id}
                    className="bg-gray-800 p-3 rounded flex flex-col gap-2 hover:bg-gray-750 transition-colors mb-1"

                  >
                    <div className="flex items-start gap-3">
                        <img
                          src={i.imgUrl}
                          alt="Card"
                          className="w-12 h-12 object-cover rounded border border-gray-600"
                          draggable={false}
                        />

                        <div className="flex-1 overflow-hidden">
                          <h2 className="text-sm font-bold text-white line-clamp-2">
                            {i.name}
                          </h2>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">

                          {i.rarity && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">
                              {i.rarity}
                            </span>
                          )}

                          {i.value && (
                            <span className="bg-blue-700/40 px-2 py-0.5 rounded text-blue-300">
                              Valor: {i.value}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            removeItemInSlot(i.id)
                          }
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Remover card"
                        >
                          ✕
                        </button>
                                                                                                
                    </div>
                  </div>
                ))
              )
              }
            </div>              

            </fieldset>
        </fieldset>

        {/* Cards */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
            <legend className="font-semibold text-green-400 px-2">Cards</legend>
            <button
              type="button"
              onClick={() => setCardPickerOpen(true)}
              className="w-full text-center bg-green-600 hover:bg-green-500 cursor-pointer px-6 py-2 rounded font-semibold transition-colors"
            >
              + Adicionar Card
            </button>
            
            <div className="pt-2">
              {selfCards?.length === 0 ? (
                <p className="text-gray-400 text-sm text-center">Nenhum card adicionado.</p>
              ) : (
                selfCards?.map((c) => (
                  <div
                    key={c.id}
                    className="bg-gray-800 p-3 rounded flex flex-col gap-2 hover:bg-gray-750 transition-colors"

                  >
                    <div className="flex items-start gap-3">
                        <img
                          src={c.img}
                          alt="Card"
                          className="w-12 h-12 object-cover rounded border border-gray-600"
                          draggable={false}
                        />

                        <div className="flex-1 overflow-hidden">
                          <h2 className="text-sm font-bold text-white line-clamp-2">
                            {c.name}
                          </h2>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                          <span className="bg-gray-700 px-2 py-0.5 rounded">
                            Ações: {c.actionsRequired}
                          </span>

                          {c.baseDice && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">
                              {c.baseDice.quantity}
                              {c.baseDice.type}
                            </span>
                          )}

                          {c.manaRequired && (
                            <span className="bg-blue-700/40 px-2 py-0.5 rounded text-blue-300">
                              Mana: {c.manaRequired}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setSelfCards((prev) => prev.filter((x) => x.id !== c.id))
                          }
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Remover card"
                        >
                          ✕
                        </button>
                                                                                                
                    </div>
                  </div>
                ))
              )
              }
            </div>

        </fieldset>

        {/* Status e Time */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-sm">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TokenStatus)}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-sm">Time</span>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value as TokenTeam)}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
            >
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-600">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto bg-green-600 hover:bg-green-500 cursor-pointer px-6 py-2 rounded font-semibold transition-colors"
          >
            Criar Token
          </button>
        </div>
      </form>

      {cardPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-4 shadow-xl">
            <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">
              Selecionar Card
            </h3>

            <div className="max-h-[320px] overflow-y-auto space-y-2">
              {cards.length === 0 ? (
                <p className="text-gray-400 text-sm text-center">
                  Nenhum card na biblioteca.
                </p>
              ) : (
                cards.map((card) => {
                  const alreadyAdded = selfCards.some((c) => c.id === card.id);

                  return (
                    <button
                      key={card.id}
                      disabled={alreadyAdded}
                      onClick={() => {
                        if (alreadyAdded) return;
                        setSelfCards((prev) => [...prev, card]);
                        setCardPickerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded
                        ${
                          alreadyAdded
                            ? "bg-gray-700 opacity-50 cursor-not-allowed"
                            : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                      <img
                        src={card.img}
                        alt={card.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">
                          {card.name}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {card.causality}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setCardPickerOpen(false)}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 py-2 rounded font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {itemChooseOpen && !slotTarget &&(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-4 shadow-xl">
            <h3 className="text-lg font-bold text-blue-400 mb-3 text-center">
              Selecionar Item
            </h3>

            <div className="max-h-[320px] overflow-y-auto space-y-2">
              {items.length === 0 ? (
                <p className="text-gray-400 text-sm text-center">
                  Nenhum item na biblioteca.
                </p>
              ) : (
                items.map((item) => {
                  const alreadyAdded = inventory.commonSlot?.some((i) => i.id === item.id);

                  return (
                    <button
                      key={item.id}
                      disabled={alreadyAdded}
                      onClick={() => {
                        if (alreadyAdded) return;
                        addItemInCommonSlot(item);
                        setItemChooseOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded
                        ${
                          alreadyAdded
                            ? "bg-gray-700 opacity-50 cursor-not-allowed"
                            : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                      <img
                        src={item.imgUrl}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">
                          {item.name}
                        </p>

                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setItemChooseOpen(false)}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 py-2 rounded font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>        
      )}

      {itemChooseOpen && slotTarget && slotTarget !== "commonSlot" && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-4 shadow-xl">
            <h3 className="text-lg font-bold text-blue-400 mb-3 text-center">
              Equipar item
            </h3>

            <div className="max-h-[320px] overflow-y-auto space-y-2">
              {items.filter((i) => slotTarget === slotToTokenInventory[i.slot]).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    handleInvChange(slotTarget, item);
                    setItemChooseOpen(false);
                    setSlotTarget(null);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded bg-gray-700 hover:bg-gray-600"
                >
                  <img
                    src={item.imgUrl}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <span className="text-sm text-white">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setItemChooseOpen(false);
                setSlotTarget(null);
              }}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 py-2 rounded font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>

  );
};

export default TokenForm;
