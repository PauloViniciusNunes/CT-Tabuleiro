import React, { useState } from "react";

import type { MapObjectKind } from "../../api/modules/mapObjects";
import type { Item } from "../../types/item";
import type { Mapa } from "../../types/mapas";
import { isValidMapObjectImageLink } from "../../utils/mapObjectImageUrl";

export type MapObjectEditorMode = "paint" | "erase" | "maze";

export interface MapObjectBrush {
  type: MapObjectKind;
  imgUrl: string;
  itemRelativeId: string | null;
  linkedMapId: string | null;
}

interface MapObjectEditorPanelProps {
  mode: MapObjectEditorMode;
  brush: MapObjectBrush;
  rows: number;
  cols: number;
  selectedMap: Mapa;
  maps: readonly Mapa[];
  items: readonly Item[];
  isSaving: boolean;
  paintError: string | null;
  onModeChange: (mode: MapObjectEditorMode) => void;
  onBrushChange: (brush: MapObjectBrush) => void;
  onGenerateMaze: (
    walls: readonly { row: number; col: number; imgUrl: string }[],
  ) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}

type Cell = { col: number; row: number };

function generateMazeWalls(rows: number, cols: number, imgUrl: string) {
  const visited = new Set<string>();
  const pathCells = new Set<string>();
  const key = (cell: Cell) => `${cell.col}-${cell.row}`;
  const directions = [
    { dc: 2, dr: 0 },
    { dc: -2, dr: 0 },
    { dc: 0, dr: 2 },
    { dc: 0, dr: -2 },
  ];
  const inBounds = (cell: Cell) =>
    cell.col > 0 && cell.col <= cols && cell.row > 0 && cell.row <= rows;

  const visit = (cell: Cell) => {
    visited.add(key(cell));
    pathCells.add(key(cell));
    const randomizedDirections = [...directions].sort(() => Math.random() - 0.5);
    for (const direction of randomizedDirections) {
      const next = {
        col: cell.col + direction.dc,
        row: cell.row + direction.dr,
      };
      if (!inBounds(next) || visited.has(key(next))) continue;
      pathCells.add(key({
        col: cell.col + direction.dc / 2,
        row: cell.row + direction.dr / 2,
      }));
      visit(next);
    }
  };

  visit({ col: 1, row: 1 });
  const walls: Array<{ row: number; col: number; imgUrl: string }> = [];
  for (let col = 1; col <= cols; col += 1) {
    for (let row = 1; row <= rows; row += 1) {
      if (!pathCells.has(`${col}-${row}`)) walls.push({ col, row, imgUrl });
    }
  }
  return walls;
}

const MapObjectEditorPanel: React.FC<MapObjectEditorPanelProps> = ({
  mode,
  brush,
  rows,
  cols,
  selectedMap,
  maps,
  items,
  isSaving,
  paintError,
  onModeChange,
  onBrushChange,
  onGenerateMaze,
  onClear,
  onClose,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const imageIsValid = isValidMapObjectImageLink(brush.imgUrl);
  const availableMaps = maps.filter((map) => map.id !== selectedMap.id);
  const brushIsReady = imageIsValid &&
    (brush.type !== "chest" || Boolean(brush.itemRelativeId)) &&
    (brush.type !== "door" || Boolean(brush.linkedMapId));

  const updateBrush = (changes: Partial<MapObjectBrush>) => {
    onBrushChange({ ...brush, ...changes });
  };

  const handleGenerateMaze = async () => {
    if (!imageIsValid || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      await onGenerateMaze(generateMazeWalls(rows, cols, brush.imgUrl.trim()));
    } catch (error) {
      setGenerationError(error instanceof Error
        ? error.message
        : "Não foi possível gerar o labirinto.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = async () => {
    if (isSaving || isGenerating || isClearing) return;
    setIsClearing(true);
    setClearError(null);
    try {
      await onClear();
      setIsConfirmingClear(false);
    } catch (error) {
      setClearError(error instanceof Error
        ? error.message
        : "Não foi possível limpar os objetos do mapa.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <aside className="fixed left-4 top-20 z-[70] w-80 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-purple-500/50 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-purple-300">Editor de objetos</h2>
          <p className="mt-1 text-xs text-slate-400">Pressione C para abrir ou fechar.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar editor de objetos"
          className="rounded border border-slate-700 px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
        >
          ×
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onModeChange("paint")}
          disabled={isSaving || isGenerating || isClearing}
          className={`rounded px-3 py-2 text-sm font-semibold ${mode === "paint" ? "bg-purple-600" : "bg-slate-800 hover:bg-slate-700"}`}
        >
          Pincel
        </button>
        <button
          type="button"
          onClick={() => onModeChange("erase")}
          disabled={isSaving || isGenerating || isClearing}
          className={`rounded px-3 py-2 text-sm font-semibold ${mode === "erase" ? "bg-red-700" : "bg-slate-800 hover:bg-slate-700"}`}
        >
          Borracha
        </button>
        <button
          type="button"
          onClick={() => onModeChange("maze")}
          disabled={isSaving || isGenerating || isClearing}
          className={`rounded px-3 py-2 text-sm font-semibold ${mode === "maze" ? "bg-purple-600" : "bg-slate-800 hover:bg-slate-700"}`}
        >
          Labirinto
        </button>
      </div>

      {mode !== "erase" && (
        <>
          <label className="mt-4 block text-sm font-semibold" htmlFor="map-object-image-url">
            Link da imagem <span className="text-red-400">*</span>
          </label>
          <input
            id="map-object-image-url"
            type="url"
            value={brush.imgUrl}
            onChange={(event) => updateBrush({ imgUrl: event.target.value })}
            placeholder="https://exemplo.com/objeto.png"
            className={`mt-1 w-full rounded border bg-slate-900 px-3 py-2 text-sm outline-none ${brush.imgUrl && !imageIsValid ? "border-red-500" : "border-slate-700 focus:border-purple-400"}`}
          />
          {brush.imgUrl && !imageIsValid && (
            <p className="mt-1 text-xs text-red-300">Use um link HTTP ou HTTPS válido.</p>
          )}
          {imageIsValid && (
            <img
              src={brush.imgUrl.trim()}
              alt="Prévia do objeto"
              className="mt-3 h-20 w-20 rounded border border-purple-400 object-cover"
            />
          )}
        </>
      )}

      {mode === "paint" ? (
        <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
          <div>
            <label className="block text-sm font-semibold" htmlFor="map-object-kind">Objeto</label>
            <select
              id="map-object-kind"
              value={brush.type}
              onChange={(event) => updateBrush({
                type: event.target.value as MapObjectKind,
                itemRelativeId: null,
                linkedMapId: null,
              })}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="wall">Parede</option>
              <option value="chest">Baú</option>
              <option value="article">Artigo</option>
              <option value="door">Porta</option>
            </select>
          </div>

          {brush.type === "chest" && (
            <div>
              <label className="block text-sm font-semibold" htmlFor="map-object-item">Item do baú</label>
              <select
                id="map-object-item"
                value={brush.itemRelativeId ?? ""}
                onChange={(event) => updateBrush({ itemRelativeId: event.target.value || null })}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="">Selecione um item...</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          )}

          {brush.type === "door" && (
            <div>
              <label className="block text-sm font-semibold" htmlFor="map-object-destination">Mapa de destino</label>
              <select
                id="map-object-destination"
                value={brush.linkedMapId ?? ""}
                onChange={(event) => updateBrush({ linkedMapId: event.target.value || null })}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="">Selecione um mapa...</option>
                {availableMaps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
              </select>
            </div>
          )}

          <div className={`rounded border px-3 py-2 text-xs ${brushIsReady ? "border-emerald-700 bg-emerald-950/60 text-emerald-200" : "border-amber-700 bg-amber-950/60 text-amber-200"}`}>
            {brushIsReady
              ? "Clique ou arraste com o botão esquerdo sobre o tabuleiro para pintar."
              : "Informe a imagem e os dados obrigatórios para liberar a pintura."}
          </div>
          {isSaving && <p className="text-xs text-cyan-300">Salvando pintura...</p>}
          {paintError && <p className="text-xs text-red-300">{paintError}</p>}
        </div>
      ) : mode === "erase" ? (
        <div className="mt-4 rounded border border-red-800 bg-red-950/40 p-3">
          <p className="text-sm font-semibold text-red-100">Borracha ativa</p>
          <p className="mt-1 text-xs text-red-200/80">
            Clique ou arraste com o botão esquerdo sobre os objetos que deseja apagar.
          </p>
          {isSaving && <p className="mt-2 text-xs text-cyan-300">Apagando objetos...</p>}
          {paintError && <p className="mt-2 text-xs text-red-300">{paintError}</p>}
        </div>
      ) : (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400">
            Gera paredes para todo o mapa usando a imagem acima. Células que já possuem objetos serão preservadas.
          </p>
          <button
            type="button"
            onClick={() => void handleGenerateMaze()}
            disabled={!imageIsValid || isGenerating}
            className="mt-3 w-full rounded bg-purple-600 px-3 py-2 text-sm font-semibold hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? "Gerando..." : "Gerar labirinto"}
          </button>
          {generationError && <p className="mt-2 text-xs text-red-300">{generationError}</p>}
        </div>
      )}

      <div className="mt-4 border-t border-slate-800 pt-4">
        {!isConfirmingClear ? (
          <button
            type="button"
            onClick={() => {
              setClearError(null);
              setIsConfirmingClear(true);
            }}
            disabled={isSaving || isGenerating || isClearing}
            className="w-full rounded border border-red-700 bg-red-950/60 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpar tudo
          </button>
        ) : (
          <div className="rounded border border-red-800 bg-red-950/50 p-3">
            <p className="text-sm font-semibold text-red-100">
              Tem certeza que deseja limpar tudo?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleClear()}
                disabled={isClearing}
                className="rounded bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
              >
                {isClearing ? "Limpando..." : "Sim"}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                disabled={isClearing}
                className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600 disabled:opacity-50"
              >
                Não
              </button>
            </div>
          </div>
        )}
        {clearError && <p className="mt-2 text-xs text-red-300">{clearError}</p>}
      </div>
    </aside>
  );
};

export default MapObjectEditorPanel;
