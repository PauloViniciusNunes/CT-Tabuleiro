import React, { useState, type ChangeEvent, type FormEvent } from "react";
import type {
  Token,
  TokenAttributes,
  TokenProficiencies,
  TokenInventory,
  TokenStatus,
  TokenTeam,
} from "../../types/token";

interface TokenFormProps {
  onSave: (token: Token) => void;
  onClose: () => void;
}

const teams: TokenTeam[] = ["Red", "Blue", "Green", "Yellow"];
const statuses: TokenStatus[] = ["Vivo", "Morto"];

const initialAttributes: TokenAttributes = {
  forca: 10,
  destreza: 10,
  consistencia: 10,
  inteligencia: 10,
  sabedoria: 10,
  carisma: 10,
  level: 1,
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
  primaryHand: "",
  offHand: "",
  neck: "",
  ring: "",
  armor: "",
  economy: 0,
};

const generateId = (): string => Math.random().toString(36).slice(2, 11);

export const TokenForm: React.FC<TokenFormProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<TokenAttributes>(initialAttributes);
  const [proficiencies, setProficiencies] = useState<TokenProficiencies>(
    initialProficiencies
  );
  const [inventory, setInventory] = useState<TokenInventory>(initialInventory);
  const [status, setStatus] = useState<TokenStatus>("Vivo");
  const [team, setTeam] = useState<TokenTeam>("Red");
  const [bodytobodyRange, setBodytobodyRange] = useState(1);
  const [magicalRange, setMagicalRange] = useState(6);

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

  const handleInvChange = (key: keyof TokenInventory, val: string | number) => {
    setInventory((inv) => ({ ...inv, [key]: val }));
  };

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
      position: { col: 1, row: 1 },
      bodytobodyRange: Math.max(1, bodytobodyRange),
      magicalRange: Math.max(1, magicalRange),
    };

    onSave(token);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-auto flex flex-col gap-4 text-white shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-green-400">Criar Novo Token</h2>

        {/* Nome */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Nome</span>
          <input
            type="text"
            className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
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
            className="p-2 rounded bg-gray-700 border border-gray-600 focus:border-green-400 focus:outline-none"
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
          <div className="grid grid-cols-2 gap-3 mt-2">
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

        {/* Proficiências */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50">
          <legend className="font-semibold text-green-400 px-2">
            Proficiências
          </legend>
          <div className="grid grid-cols-2 gap-2 mt-2">
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
          <div className="grid grid-cols-2 gap-3 mt-2">
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
          <div className="grid grid-cols-1 gap-2 mt-2">
            {(
              ["primaryHand", "offHand", "neck", "ring", "armor"] as const
            ).map((slot) => (
              <label key={slot} className="flex flex-col gap-1">
                <span className="text-xs font-semibold capitalize">
                  {slot === "primaryHand"
                    ? "Mão Primária"
                    : slot === "offHand"
                    ? "Mão Secundária"
                    : slot.charAt(0).toUpperCase() + slot.slice(1)}
                </span>
                <input
                  type="text"
                  className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-sm"
                  value={inventory[slot] || ""}
                  onChange={(e) => handleInvChange(slot, e.target.value)}
                  placeholder="Vazio"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold">Economia</span>
              <input
                type="number"
                min={0}
                className="p-1 rounded bg-gray-600 border border-gray-500 focus:border-green-400 focus:outline-none text-center"
                value={inventory.economy}
                onChange={(e) => handleInvChange("economy", Number(e.target.value))}
              />
            </label>
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
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-600">
          <button
            type="button"
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-semibold transition-colors"
          >
            Criar Token
          </button>
        </div>
      </form>
    </div>
  );
};

export default TokenForm;
