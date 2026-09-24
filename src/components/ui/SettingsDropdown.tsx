import React, { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";

interface SettingsDropdownProps {
  rows: number;
  cols: number;
  backgroundImage: string | null;
  onChangeRows: (rows: number) => void;
  onChangeCols: (cols: number) => void;
  onChangeBackgroundImage: (imageUrl: string | null) => void;
  onGenerateMazeOpen: (b: boolean) => void;
  onMapSelect: (b: boolean) => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  rows,
  cols,
  backgroundImage,
  onChangeRows,
  onChangeCols,
  onChangeBackgroundImage,
  onGenerateMazeOpen,
  onMapSelect
}) => {
  const [open, setOpen] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(backgroundImage ?? "");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setBackgroundImageUrl(backgroundImage ?? "");
  }, [backgroundImage]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const commitBackgroundImageUrl = () => {
    onChangeBackgroundImage(backgroundImageUrl.trim() || null);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-center rounded-md p-2 bg-gray-800 hover:bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Configurações"
      >
        <Settings size={20} />
      </button>

      {open && (
        <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
          <div className="px-4 py-3 text-white">
            <div className="mb-4">
              <label
                htmlFor="rows"
                className="block text-sm font-semibold mb-1"
              >
                Linhas
              </label>
              <select
                id="rows"
                value={rows}
                onChange={(e) => onChangeRows(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              >
                {Array.from({ length: 50 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label
                htmlFor="cols"
                className="block text-sm font-semibold mb-1"
              >
                Colunas
              </label>
              <select
                id="cols"
                value={cols}
                onChange={(e) => onChangeCols(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              >
                {Array.from({ length: 100 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold" htmlFor="bg-image-url">
                Link da imagem do mapa
              </label>
              <input
                id="bg-image-url"
                type="url"
                value={backgroundImageUrl}
                onChange={(event) => setBackgroundImageUrl(event.target.value)}
                onBlur={commitBackgroundImageUrl}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                placeholder="https://exemplo.com/mapa.png"
                className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white placeholder:text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                A URL é aplicada ao sair do campo.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Selecionar Mapa
              </label>
                <button
                  onClick={() => onMapSelect(true)}
                  className="w-full text-sm text-gray-300 italic bg-gray-800 rounded border border-gray-700 py-1 px-2 cursor-pointer hover:bg-gray-900"
                >
                  Mapas
                </button>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Gerar Labirinto
              </label>
                <button
                  onClick={() => onGenerateMazeOpen(true)}
                  className="w-full text-sm text-gray-300 italic bg-gray-800 rounded border border-gray-700 py-1 px-2 cursor-pointer hover:bg-gray-900"
                >
                  Gerar
                </button>
            </div>            

          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDropdown;
