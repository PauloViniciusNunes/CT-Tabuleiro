import React, { useState } from "react";
import type { MapObject } from "../../types/mapObject";

interface GenerateMazeProps {
  rows: number;
  cols: number;
  setBoardMapObjects: React.Dispatch<React.SetStateAction<MapObject[]>>;
  onClose: () => void;
}

type Cell = {
  col: number;
  row: number;
};

const GenerateMaze: React.FC<GenerateMazeProps> = ({
  rows,
  cols,
  setBoardMapObjects,
  onClose,
}) => {
  const [wallImg, setWallImg] = useState<string>("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setWallImg("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setWallImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 🔥 GERADOR DE LABIRINTO (DFS)
  const generateMaze = () => {
    const visited = new Set<string>();
    const pathCells = new Set<string>();

    const key = (c: Cell) => `${c.col}-${c.row}`;

    const directions = [
      { dc: 2, dr: 0 },
      { dc: -2, dr: 0 },
      { dc: 0, dr: 2 },
      { dc: 0, dr: -2 },
    ];

    const shuffle = (arr: typeof directions) =>
      arr.sort(() => Math.random() - 0.5);

    const inBounds = (c: Cell) =>
      c.col > 0 && c.col <= cols && c.row > 0 && c.row <= rows;

    const dfs = (cell: Cell) => {
      visited.add(key(cell));
      pathCells.add(key(cell));

      for (const dir of shuffle([...directions])) {
        const next: Cell = {
          col: cell.col + dir.dc,
          row: cell.row + dir.dr,
        };

        const wallBetween: Cell = {
          col: cell.col + dir.dc / 2,
          row: cell.row + dir.dr / 2,
        };

        if (!inBounds(next)) continue;
        if (visited.has(key(next))) continue;

        // remove parede entre
        pathCells.add(key(wallBetween));

        dfs(next);
      }
    };

    // começa em posição ímpar (melhor distribuição)
    dfs({ col: 1, row: 1 });

    // 🔥 gerar walls
    const walls: MapObject[] = [];

    for (let col = 1; col <= cols; col++) {
      for (let row = 1; row <= rows; row++) {
        const k = `${col}-${row}`;

        if (!pathCells.has(k)) {
          walls.push({
            type: "wall",
            position: { col, row },
            imgUrl: wallImg,
            itemRelative: null,
          });
        }
      }
    }

    setBoardMapObjects(walls);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-4 rounded-lg w-full max-w-md text-white space-y-4">
        <h2 className="text-xl font-bold text-purple-400">
          Gerar Labirinto
        </h2>

        {/* IMG */}
        <div>
          <span className="text-sm font-semibold">
            Imagem da Parede
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full mt-1 p-2 rounded bg-gray-700 border border-gray-600"
          />

          {wallImg && (
            <img
              src={wallImg}
              className="mt-2 w-24 h-24 object-cover rounded border-2 border-purple-400"
            />
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Cancelar
          </button>
          <button
            onClick={generateMaze}
            className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded"
          >
            Gerar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateMaze;