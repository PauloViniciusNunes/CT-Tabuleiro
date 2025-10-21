import React, { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";

interface SettingsDropdownProps {
  rows: number;
  cols: number;
  onChangeRows: (rows: number) => void;
  onChangeCols: (cols: number) => void;
  onChangeBackgroundImage: (imageUrl: string | null) => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  rows,
  cols,
  onChangeRows,
  onChangeCols,
  onChangeBackgroundImage,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      onChangeBackgroundImage(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChangeBackgroundImage(reader.result as string);
    };
    reader.readAsDataURL(file);
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

            <div>
              <label className="block text-sm font-semibold mb-1" htmlFor="bg-image-input">
                Selecionar Imagem
              </label>
              <input
                id="bg-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-white bg-gray-800 rounded border border-gray-700 py-1 px-2 cursor-pointer"
              />
            </div>

            <div className="mt-3 text-xs italic text-gray-400">
              Mais opções em breve...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDropdown;
