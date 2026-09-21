import React, { useState, type FormEvent } from "react";
import { useEffect } from "react";
import {
  TokenPrimaryElement,
  type TokenPrimaryDisvantage,
  type PrimaryMechanic,
} from "../../types/effects.ts"
import {
  type Token,
  type TokenAttributes,
  type TokenProficiencies,
  type TokenInventory,
  type TokenStatus,
  type TokenTeam,
  type TokenClass,
  type TokenType,
  type TokenAttributeMultipliers,
  type TokenMultipliableAttribute,
} from "../../types/token";
import type { Card } from "../../types/card";
import type { Item } from "../../types/item";
import { type ItemSlot } from "../../types/item";
import { type BossInterfaceColors } from "../../types/token";
import type { Campaign, User } from "../../types/campaign.ts";
import { tokenFromForm } from "../../models/forms/tokenFormModel";
import {
  DEFAULT_TOKEN_ATTRIBUTE_MULTIPLIERS,
  MULTIPLIABLE_TOKEN_ATTRIBUTES,
} from "../../api/mappers/tokenTransformationMapper";

export interface TokenModelFormProps {
  onSave: (token: Token) => void | Promise<void>;
  onClose: () => void;
  cards: Card[];
  items: Item[];
  users: User[];
  campaign: Campaign | null;
  tokens?: Token[];
  initialToken?: Token;
  mode?: "create" | "edit";
}

const teams: TokenTeam[] = ["Red", "Blue", "Green", "Yellow"];
const statuses: TokenStatus[] = ["Vivo", "Morto"];
const classes: TokenClass[] = ["Guerreiro", "Mago", "Bárbaro", "Ladino", "Feitiçeiro"];
const elements: PrimaryMechanic[] = [...TokenPrimaryElement];
const disvantages: TokenPrimaryDisvantage[] = [...TokenPrimaryElement, "none"];


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
  inventoryDimensions: { rows: 4, cols: 5 },
  primaryHand: undefined,
  offHand: undefined,
  neck: undefined,
  ring: undefined,
  armor: undefined,
  commonSlot: [],
  economy: 0,
};

export const TokenModelForm: React.FC<TokenModelFormProps> = ({
  onSave,
  onClose,
  cards,
  items,
  users,
  campaign,
  tokens = [],
  initialToken,
  mode = initialToken ? "edit" : "create",
}) => {
  const [name, setName] = useState(initialToken?.name ?? "");
  const [type, setType] = useState<TokenType>(initialToken?.type ?? "player");
  const [bossSettings, setBossSettings] = useState<BossInterfaceColors>(initialToken?.bossSettings ?? {
    fill: "#000000",
    stroke: "#971e91",
    shadow_init: "#5e3f7c",
    shadow_mid: "#d645e4",
    shadow_end: "#db36c5"
  });
  const [imagePreview, setImagePreview] = useState<string | null>(initialToken?.imageUrl ?? null);
  const [attributes, setAttributes] = useState<TokenAttributes>(
    initialToken?.attributes ?? initialAttributes,
  );
  const [isTransformation, setIsTransformation] = useState(
    Boolean(initialToken?.transformation),
  );
  const [baseTokenId, setBaseTokenId] = useState(
    initialToken?.transformation?.baseTokenId ?? "",
  );
  const [inheritBaseCards, setInheritBaseCards] = useState(
    initialToken?.transformation?.inheritBaseCards ?? true,
  );
  const [attributeMultipliers, setAttributeMultipliers] = useState<TokenAttributeMultipliers>(
    initialToken?.transformation?.attributeMultipliers ?? {
      ...DEFAULT_TOKEN_ATTRIBUTE_MULTIPLIERS,
    },
  );
  const [proficiencies, setProficiencies] = useState<TokenProficiencies>(
    initialToken?.proficiencies ?? initialProficiencies,
  );
  const [inventory, setInventory] = useState<TokenInventory>(
    initialToken?.inventory ?? initialInventory,
  );

  const slotToTokenInventory: Record<ItemSlot, keyof TokenInventory> =
  {
    "primary-hand": "primaryHand",
    "off-hand": "offHand",
    neck: "neck",
    ring: "ring",
    armor: "armor",
    "inventory-only": "commonSlot",
  }

  function addItemInCommonSlot(item: Item) {
    setInventory(prev => ({ ...prev, commonSlot: [...(prev.commonSlot ?? []), item] }));
  }

  function removeItemInSlot(id: string) {
    setInventory(prev => ({ ...prev, commonSlot: prev.commonSlot?.filter(x => x.id !== id) }))
  }

  const [itemChooseOpen, setItemChooseOpen] = useState<boolean>(false);

  const [status, setStatus] = useState<TokenStatus>(initialToken?.status ?? "Vivo");
  const [team, setTeam] = useState<TokenTeam>(initialToken?.team ?? "Red");
  const [bodytobodyRange, setBodytobodyRange] = useState(initialToken?.bodytobodyRange ?? 1);
  const [magicalRange, setMagicalRange] = useState(initialToken?.magicalRange ?? 6);
  const [naturalMovement, setNaturalMovement] = useState(initialToken?.naturalMovement ?? 6);
  const [tokenClass, setTokenClass] = useState<TokenClass>(initialToken?.class ?? "Guerreiro");
  const [primaryElements, setPrimaryElements] = useState<PrimaryMechanic[]>(
    initialToken?.transformation
      ? initialToken.transformation.additionalMechanics
      : initialToken?.tokenPrimaryElement?.length
      ? initialToken.tokenPrimaryElement
      : ["neutro"],
  );
  const [primaryDisvantages, setPrimaryDisvantages] = useState<TokenPrimaryDisvantage[]>(
    initialToken?.transformation
      ? initialToken.transformation.additionalDisadvantages
      : initialToken?.tokenPrimaryDisvantege?.length
      ? initialToken.tokenPrimaryDisvantege
      : ["none"],
  );
  const [selectedUser, setSelectedUser] = useState<User | null>(
    users.find((user) => user.id === initialToken?.ownerId) ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePrimaryElement = (element: PrimaryMechanic) => {
    setPrimaryElements((current) => {
      if (element === "neutro") return ["neutro"];
      const active = current.filter((value) => value !== "neutro");
      if (active.includes(element)) {
        const next = active.filter((value) => value !== element);
        return next.length ? next : ["neutro"];
      }
      return [...active, element];
    });
  };

  const togglePrimaryDisvantage = (disvantage: TokenPrimaryDisvantage) => {
    setPrimaryDisvantages((current) => {
      if (disvantage === "none") return ["none"];
      const active = current.filter((value) => value !== "none");
      if (active.includes(disvantage)) {
        const next = active.filter((value) => value !== disvantage);
        return next.length ? next : ["none"];
      }
      return [...active, disvantage];
    });
  };

  useEffect(() => {
    console.log("[USER]: ", selectedUser?.name)
  }, [selectedUser])

  const [selfCards, setSelfCards] = useState<Card[]>(
    initialToken?.transformation?.additionalCards ?? initialToken?.cards ?? [],
  );
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

  const handleAttrChange = (key: keyof TokenAttributes, val: number) => {
    setAttributes((a) => ({ ...a, [key]: val }));
  };

  const selectedBaseToken = tokens.find((token) => token.id === baseTokenId);
  const transformationCandidates = tokens.filter(
    (token) => token.id !== initialToken?.id && token.campaignId === (campaign?.id ?? initialToken?.campaignId),
  );
  const effectiveAttributes: TokenAttributes = selectedBaseToken
    ? {
        ...selectedBaseToken.attributes,
        ...Object.fromEntries(
          MULTIPLIABLE_TOKEN_ATTRIBUTES.map((attribute) => [
            attribute,
            Math.round(selectedBaseToken.attributes[attribute] * attributeMultipliers[attribute]),
          ]),
        ),
      } as TokenAttributes
    : attributes;

  const handleMultiplierChange = (attribute: TokenMultipliableAttribute, value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    setAttributeMultipliers((current) => ({ ...current, [attribute]: value }));
  };

  const handleProfChange = (key: keyof TokenProficiencies, checked: boolean) => {
    setProficiencies((p) => ({ ...p, [key]: checked }));
  };

  const handleInvChange = (key: keyof TokenInventory, val: Item | null) => {
    setInventory((inv) => ({ ...inv, [key]: val }));
  };

  const handleEconomyChange = (val: number) => {
    setInventory((inv) => ({ ...inv, ["economy" as keyof TokenInventory]: val }));
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedUser && !initialToken?.ownerId) {
      alert("Selecione um usuário para criar o token.");
      return;
    }

    if (!name.trim() || !imagePreview) {
      alert("Nome e imagem são obrigatórios.");
      return;
    }

    if (isTransformation && !selectedBaseToken) {
      alert("Selecione um token base para a transformação.");
      return;
    }

    const transformation = isTransformation && selectedBaseToken
      ? {
          baseTokenId: selectedBaseToken.id,
          inheritBaseCards,
          attributeMultipliers,
          additionalCards: selfCards,
          additionalMechanics: primaryElements.filter((mechanic) => mechanic !== "neutro"),
          additionalDisadvantages: primaryDisvantages.filter((disadvantage) => disadvantage !== "none"),
        }
      : undefined;

    const token = tokenFromForm({
      existing: initialToken,
      name,
      type,
      imageUrl: imagePreview,
      attributes: isTransformation ? effectiveAttributes : attributes,
      proficiencies,
      inventory,
      status,
      team,
      tokenClass,
      cards: selfCards,
      bodyToBodyRange: bodytobodyRange,
      magicalRange: Math.max(1, magicalRange),
      naturalMovement,
      primaryElements,
      primaryDisadvantages: primaryDisvantages,
      bossSettings: type === "boss" ? bossSettings : undefined,
      ownerId: selectedUser?.id ?? initialToken?.ownerId ?? "",
      campaignId: campaign?.id ?? initialToken?.campaignId ?? "",
      transformation,
      baseToken: selectedBaseToken,
    });

    setIsSubmitting(true);

    try {
      await onSave(token);
      onClose();
    } catch (error) {
      console.error("Não foi possível salvar o token:", error);
      alert("Não foi possível salvar o token. Verifique os dados e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[520px] md:max-w-[560px] bg-gray-800 rounded-lg p-4 md:p-6 text-white shadow-2xl
               max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold text-green-400">
          {mode === "edit" ? "Editar Token" : "Criar Novo Token"}
        </h2>

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
            type="text"
            value={imagePreview ?? ""}
            onChange={(e) => setImagePreview(e.target.value)}
            placeholder="Cole a URL da imagem"
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

        <fieldset className="border border-cyan-700 p-3 rounded bg-cyan-950/20">
          <legend className="font-semibold text-cyan-300 px-2">Transformação</legend>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isTransformation}
              onChange={(event) => setIsTransformation(event.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            Este token é uma transformação
          </label>

          {isTransformation && (
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Token base</span>
                <select
                  required
                  value={baseTokenId}
                  onChange={(event) => setBaseTokenId(event.target.value)}
                  className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="" disabled>Selecione o token base...</option>
                  {transformationCandidates.map((token) => (
                    <option key={token.id} value={token.id}>{token.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inheritBaseCards}
                  onChange={(event) => setInheritBaseCards(event.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
                Herdar cards do token base
              </label>

              <div>
                <p className="mb-2 text-sm font-semibold text-cyan-200">
                  Multiplicadores de atributos
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MULTIPLIABLE_TOKEN_ATTRIBUTES.map((attribute) => (
                    <label key={attribute} className="flex items-center gap-2">
                      <span className="w-24 text-xs capitalize">{attribute}</span>
                      <input
                        type="number"
                        min={0}
                        step={0.05}
                        value={attributeMultipliers[attribute]}
                        onChange={(event) => handleMultiplierChange(attribute, Number(event.target.value))}
                        className="min-w-0 flex-1 rounded border border-gray-500 bg-gray-700 p-1 text-center"
                      />
                      <span className="w-14 text-right text-xs text-gray-300">
                        = {effectiveAttributes[attribute]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-300">
                Itens são copiados do token base. Cards, mecânicas e desvantagens abaixo são adicionais.
              </p>
            </div>
          )}
        </fieldset>

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
                  disabled={isTransformation}
                  className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                  value={isTransformation ? effectiveAttributes[key] : attributes[key]}
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
                disabled={isTransformation}
                className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                value={isTransformation ? effectiveAttributes.level : attributes.level}
                onChange={(e) => handleAttrChange("level", Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">XP</span>
              <input
                type="number"
                min={0}
                disabled={isTransformation}
                className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                value={isTransformation ? effectiveAttributes.xp : attributes.xp}
                onChange={(e) => handleAttrChange("xp", Number(e.target.value))}
              />
            </label>
          </div>
        </fieldset>

        {/* Tipo de Token */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">
            Tipo de Token
          </legend>
          <select name="" id="" className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
            value={type}
            onChange={(e) => setType(e.target.value as TokenType)}>
            <option value="player">Player</option>
            <option value="ia">IA</option>
            <option value="boss">Boss</option>
          </select>
        </fieldset>

        {/* Boss Interface Settings */}
        {type === "boss" && (
          <fieldset className="border border-purple-600 p-3 rounded bg-gray-700 bg-opacity-50 mt-3">
            <legend className="font-semibold text-purple-400 px-2">
              Boss Visual (Cinematic)
            </legend>

            <div className="grid grid-cols-2 gap-3">

              {/* Fill */}
              <div>
                <label className="text-sm">Fill</label>
                <input
                  type="color"
                  value={bossSettings.fill}
                  onChange={(e) =>
                    setBossSettings({ ...bossSettings, fill: e.target.value })
                  }
                  className="w-full h-10 cursor-pointer"
                />
              </div>

              {/* Stroke */}
              <div>
                <label className="text-sm">Stroke</label>
                <input
                  type="color"
                  value={bossSettings.stroke}
                  onChange={(e) =>
                    setBossSettings({ ...bossSettings, stroke: e.target.value })
                  }
                  className="w-full h-10 cursor-pointer"
                />
              </div>

              {/* Shadow Init */}
              <div>
                <label className="text-sm">Shadow Start</label>
                <input
                  type="color"
                  value={bossSettings.shadow_init}
                  onChange={(e) =>
                    setBossSettings({ ...bossSettings, shadow_init: e.target.value })
                  }
                  className="w-full h-10 cursor-pointer"
                />
              </div>

              {/* Shadow Mid */}
              <div>
                <label className="text-sm">Shadow Mid</label>
                <input
                  type="color"
                  value={bossSettings.shadow_mid}
                  onChange={(e) =>
                    setBossSettings({ ...bossSettings, shadow_mid: e.target.value })
                  }
                  className="w-full h-10 cursor-pointer"
                />
              </div>

              {/* Shadow End */}
              <div className="col-span-2">
                <label className="text-sm">Shadow End</label>
                <input
                  type="color"
                  value={bossSettings.shadow_end}
                  onChange={(e) =>
                    setBossSettings({ ...bossSettings, shadow_end: e.target.value })
                  }
                  className="w-full h-10 cursor-pointer"
                />
              </div>

            </div>
          </fieldset>
        )}
        {/* Elemento */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">
            Definição Elementar
          </legend>

          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm">
              {isTransformation ? "Mecânicas adicionais" : "Mecânicas do token"}
            </span>
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded border border-gray-600 bg-gray-800 p-2 sm:grid-cols-3">
              {elements.map((element) => (
                <button
                  key={element}
                  type="button"
                  onClick={() => togglePrimaryElement(element)}
                  className={`rounded px-2 py-1 text-xs capitalize ${primaryElements.includes(element) ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  {element.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <span className="font-semibold text-sm">
              {isTransformation ? "Desvantagens adicionais" : "Desvantagens mecânicas"}
            </span>
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded border border-gray-600 bg-gray-800 p-2 sm:grid-cols-3">
              {disvantages.map((disvantage) => (
                <button
                  key={disvantage}
                  type="button"
                  onClick={() => togglePrimaryDisvantage(disvantage)}
                  className={`rounded px-2 py-1 text-xs capitalize ${primaryDisvantages.includes(disvantage) ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  {disvantage.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>
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

        <label className="flex flex-col gap-1">
          <span>Deslocamento natural (células)</span>
          <input
            type="number"
            min={0}
            step={1}
            required
            value={naturalMovement}
            onChange={(event) => setNaturalMovement(Number(event.target.value))}
            className="p-2 rounded bg-gray-700 border border-gray-600"
          />
        </label>

        {/* Inventário */}
        {isTransformation ? (
          <fieldset className="border border-cyan-800 p-3 rounded bg-gray-700 bg-opacity-50">
            <legend className="font-semibold text-cyan-300 px-2">Inventário herdado</legend>
            {selectedBaseToken ? (
              <div className="flex flex-col gap-2 text-sm text-gray-200">
                <p>Os itens serão copiados de <strong>{selectedBaseToken.name}</strong>.</p>
                <p>
                  {(selectedBaseToken.inventory.commonSlot?.length ?? 0)} item(ns) na mochila e{" "}
                  {equipSlots.filter((slot) => Boolean(selectedBaseToken.inventory[slot])).length} equipado(s).
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Selecione um token base para visualizar o inventário.</p>
            )}
          </fieldset>
        ) : (
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
                    type="button"
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
                        type="button"
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
        )}

        {/* Cards */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">
            {isTransformation ? "Cards adicionais" : "Cards"}
          </legend>
          {isTransformation && inheritBaseCards && selectedBaseToken && (
            <p className="mb-2 text-xs text-cyan-200">
              {selectedBaseToken.cards.length} card(s) herdado(s) de {selectedBaseToken.name}.
            </p>
          )}
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
                      type="button"
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

        {/* Usuário */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">
            Dono do Token
          </legend>

          <select
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 focus:border-green-400 focus:outline-none cursor-pointer"
            value={selectedUser?.id ?? initialToken?.ownerId ?? ""}
            required
            onChange={(e) => {
              const user = users.find((u) => u.id === e.target.value);
              setSelectedUser(user ?? null);
            }}
          >
            {/* 🟢 Opção padrão quando nada estiver selecionado */}
            <option value="" disabled>
              Selecione um usuário...
            </option>

            {initialToken?.ownerId &&
              !users.some((user) => user.id === initialToken.ownerId) && (
                <option value={initialToken.ownerId}>Dono atual</option>
              )}

            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </fieldset>

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
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-500 cursor-pointer px-6 py-2 rounded font-semibold transition-colors"
          >
            {isSubmitting
              ? "Salvando..."
              : mode === "edit" ? "Salvar Token" : "Criar Token"}
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
                      type="button"
                      key={card.id}
                      disabled={alreadyAdded}
                      onClick={() => {
                        if (alreadyAdded) return;
                        setSelfCards((prev) => [...prev, card]);
                        setCardPickerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded
                        ${alreadyAdded
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
              type="button"
              onClick={() => setCardPickerOpen(false)}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 py-2 rounded font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {itemChooseOpen && !slotTarget && (
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
                      type="button"
                      key={item.id}
                      disabled={alreadyAdded}
                      onClick={() => {
                        if (alreadyAdded) return;
                        addItemInCommonSlot(item);
                        setItemChooseOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded
                        ${alreadyAdded
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
              type="button"
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
                  type="button"
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
              type="button"
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

const TokenForm: React.FC<Omit<TokenModelFormProps, "initialToken" | "mode">> = (props) => (
  <TokenModelForm {...props} mode="create" />
);

export default TokenForm;
