import React, { useState } from "react";
import type { Mapa } from "../../types/mapas";

interface MapSelectProps {
  mapas: Mapa[];
  selectedMapa?: Mapa;
  onChoice: (mapa: Mapa) => void;
  onCreateNew: (mapName: string) => void;
  onClose: () => void;
}

const MapSelect: React.FC<MapSelectProps> = ({
  mapas,
  selectedMapa,
  onChoice,
  onCreateNew,
  onClose
}) => {

  const [creatingNewMap, setCreatingNewMap] = useState(false);
  const [newMapName, setNewMapName] = useState("");

  const handleCreate = () => {
    if (!newMapName.trim()) return;

    onCreateNew(newMapName);

    setNewMapName("");
    setCreatingNewMap(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">

      <div className="bg-gray-800 p-4 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Selecionar Mapa
          </h2>

          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-3 gap-3">
          {mapas.map((mapa) => {

            const isSelected = selectedMapa?.id === mapa.id;

            return (
              <div
                key={mapa.id}
                onClick={() => onChoice(mapa)}
                className={`
                  cursor-pointer rounded overflow-hidden border-2
                  transition-all duration-150
                  ${isSelected
                    ? "border-cyan-400 scale-[1.02]"
                    : "border-gray-600 hover:border-cyan-700"
                  }
                `}
              >
                <img
                  src={mapa.img}
                  alt={mapa.name}
                  className="w-full h-24 object-cover"
                />

                <div className="text-center text-sm text-white p-2 bg-gray-900">
                  {mapa.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* CREATE MAP */}
        <div className="mt-5 border-t border-gray-700 pt-4">

          {!creatingNewMap && (
            <button
              onClick={() => setCreatingNewMap(true)}
              className="w-full bg-purple-600 hover:bg-purple-500 p-2 rounded font-semibold transition-colors"
            >
              + Novo Mapa
            </button>
          )}

          {creatingNewMap && (
            <div className="space-y-3 animate-fade-in">

              <div>
                <label className="text-sm text-gray-300 font-semibold">
                  Nome do mapa
                </label>

                <input
                  type="text"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="Ex: Castelo Abandonado"
                  className="
                    mt-1 w-full p-2 rounded
                    bg-gray-700
                    border border-gray-600
                    text-white
                    outline-none
                    focus:border-purple-400
                  "
                />
              </div>

              <div className="flex gap-2">

                <button
                  onClick={() => {
                    setCreatingNewMap(false);
                    setNewMapName("");
                  }}
                  className="
                    flex-1
                    bg-gray-700
                    hover:bg-gray-600
                    p-2 rounded
                  "
                >
                  Cancelar
                </button>

                <button
                  onClick={handleCreate}
                  disabled={!newMapName.trim()}
                  className="
                    flex-1
                    bg-purple-600
                    hover:bg-purple-500
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    p-2 rounded
                    font-semibold
                  "
                >
                  Criar
                </button>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default MapSelect;