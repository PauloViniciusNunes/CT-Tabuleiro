import React, { useState, type ChangeEvent, type FormEvent } from "react";
import type { Token, TokenAttributes, TokenStatus, TokenTeam } from "../../types/token";

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

const generateId = (): string => Math.random().toString(36).slice(2, 11);

export const TokenForm: React.FC<TokenFormProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<TokenAttributes>(initialAttributes);
  const [status, setStatus] = useState<TokenStatus>("Vivo");
  const [team, setTeam] = useState<TokenTeam>("Red");

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) {
      setImagePreview(null);
      setImageFile(null);
      return;
    }
    const file = e.target.files[0];
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAttributeChange = (key: keyof TokenAttributes, value: number) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !name.trim()) {
      alert("Por favor, preencha o nome e selecione a imagem do token.");
      return;
    }
    const newToken: Token = {
      id: generateId(),
      name: name.trim(),
      imageUrl: imagePreview,
      attributes,
      status,
      team,
      position: { col: 1, row: 1 }, // posição inicial padrão
    };
    onSave(newToken);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded p-6 w-96 max-h-[90vh] overflow-auto flex flex-col gap-4 text-white"
      >
        <h2 className="text-xl font-bold mb-2">Criar Novo Token</h2>

        <label className="flex flex-col" htmlFor="token-name">
          Nome:
          <input
            id="token-name"
            type="text"
            className="mt-1 p-1 rounded bg-gray-700 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col" htmlFor="token-image">
          Imagem:
          <input
            id="token-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-1"
            required
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview do token"
              className="mt-2 w-24 h-24 object-cover rounded"
            />
          )}
        </label>

        <fieldset className="border border-gray-600 p-2 rounded">
          <legend className="font-semibold mb-2">Atributos</legend>
          {(
            Object.keys(attributes) as (keyof TokenAttributes)[]
          ).map((attr) => (
            <label key={attr} className="flex items-center gap-2 mb-1">
              <span className="capitalize w-28">{attr}</span>
              <input
                type="number"
                min={0}
                className="p-1 rounded bg-gray-700 text-white w-20"
                value={attributes[attr]}
                onChange={(e) =>
                  handleAttributeChange(attr, Number(e.target.value))
                }
              />
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col" htmlFor="token-status">
          Status:
          <select
            id="token-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TokenStatus)}
            className="mt-1 p-1 rounded bg-gray-700 text-white"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col" htmlFor="token-team">
          Time:
          <select
            id="token-team"
            value={team}
            onChange={(e) => setTeam(e.target.value as TokenTeam)}
            className="mt-1 p-1 rounded bg-gray-700 text-white"
          >
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

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
