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
  forca: 0,
  destreza: 0,
  consistencia: 0,
  inteligencia: 0,
  sabedoria: 0,
  carisma: 0,
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
  economy: 0,
};

const generateId = (): string => Math.random().toString(36).slice(2, 11);

export const TokenForm: React.FC<TokenFormProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<TokenAttributes>(initialAttributes);
  const [proficiencies, setProficiencies] = useState<TokenProficiencies>(initialProficiencies);
  const [inventory, setInventory] = useState<TokenInventory>(initialInventory);
  const [status, setStatus] = useState<TokenStatus>("Vivo");
  const [team, setTeam] = useState<TokenTeam>("Red");

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
    };
    onSave(token);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded p-6 w-96 max-h-[90vh] overflow-auto flex flex-col gap-4 text-white"
      >
        <h2 className="text-xl font-bold">Criar Novo Token</h2>

        {/* Nome */}
        <label className="flex flex-col">
          Nome:
          <input
            type="text"
            className="mt-1 p-1 rounded bg-gray-700"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        {/* Imagem */}
        <label className="flex flex-col">
          Imagem:
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-1"
            required
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-2 w-24 h-24 object-cover rounded"
            />
          )}
        </label>

        {/* Atributos */}
        <fieldset className="border border-gray-600 p-2 rounded">
          <legend className="font-semibold">Atributos</legend>
          {(Object.keys(attributes) as (keyof TokenAttributes)[]).map((key) => (
            <label key={key} className="flex items-center gap-2 my-1">
              <span className="capitalize w-24">{key}</span>
              <input
                type="number"
                min={0}
                className="p-1 rounded bg-gray-700 w-20"
                value={attributes[key]}
                onChange={(e) => handleAttrChange(key, Number(e.target.value))}
              />
            </label>
          ))}
        </fieldset>

        {/* Proficiências */}
        <fieldset className="border border-gray-600 p-2 rounded">
          <legend className="font-semibold">Proficiências</legend>
          {(Object.keys(proficiencies) as (keyof TokenProficiencies)[]).map((key) => (
            <label key={key} className="flex items-center gap-2 my-1">
              <input
                type="checkbox"
                checked={proficiencies[key]}
                onChange={(e) => handleProfChange(key, e.target.checked)}
                className="accent-green-400"
              />
              <span className="capitalize">{key}</span>
            </label>
          ))}
        </fieldset>

        {/* Inventário */}
        <fieldset className="border border-gray-600 p-2 rounded">
          <legend className="font-semibold">Inventário</legend>
          <label className="flex flex-col my-1">
            Mão Primária:
            <input
              type="text"
              className="mt-1 p-1 rounded bg-gray-700"
              value={inventory.primaryHand || ""}
              onChange={(e) => handleInvChange("primaryHand", e.target.value)}
            />
          </label>
          <label className="flex flex-col my-1">
            Mão Secundária:
            <input
              type="text"
              className="mt-1 p-1 rounded bg-gray-700"
              value={inventory.offHand || ""}
              onChange={(e) => handleInvChange("offHand", e.target.value)}
            />
          </label>
          <label className="flex flex-col my-1">
            Colar:
            <input
              type="text"
              className="mt-1 p-1 rounded bg-gray-700"
              value={inventory.neck || ""}
              onChange={(e) => handleInvChange("neck", e.target.value)}
            />
          </label>
          <label className="flex flex-col my-1">
            Anel:
            <input
              type="text"
              className="mt-1 p-1 rounded bg-gray-700"
              value={inventory.ring || ""}
              onChange={(e) => handleInvChange("ring", e.target.value)}
            />
          </label>
          <label className="flex flex-col my-1">
            Armadura:
            <input
              type="text"
              className="mt-1 p-1 rounded bg-gray-700"
              value={inventory.armor || ""}
              onChange={(e) => handleInvChange("armor", e.target.value)}
            />
          </label>
          <label className="flex flex-col my-1">
            Economia:
            <input
              type="number"
              min={0}
              className="mt-1 p-1 rounded bg-gray-700"
              value={inventory.economy}
              onChange={(e) => handleInvChange("economy", Number(e.target.value))}
            />
          </label>
        </fieldset>

        {/* Status e Time */}
        <label className="flex flex-col">
          Status:
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TokenStatus)}
            className="mt-1 p-1 rounded bg-gray-700"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Time:
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value as TokenTeam)}
            className="mt-1 p-1 rounded bg-gray-700"
          >
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        {/* Ações */}
        <div className="flex justify-end gap-4 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
};

export default TokenForm;
