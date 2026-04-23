import React from "react";
import type { Mapa } from "../../types/mapas";

interface MapSelectProps {
  mapas: Mapa[];
  selectedMapa?: Mapa;
  onChoice: (mapa: Mapa) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

const MapSelect: React.FC<MapSelectProps> = ({
  mapas,
  selectedMapa,
  onChoice,
  onCreateNew,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      
      <div className="bg-gray-800 p-4 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Selecionar Mapa</h2>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>

        {/* Grid de mapas */}
        <div className="grid grid-cols-3 gap-3">
          {mapas.map((mapa) => {
            const isSelected = selectedMapa?.id === mapa.id;

            return (
              <div
                key={mapa.id}
                onClick={() => onChoice(mapa)}
                className={`
                  cursor-pointer rounded overflow-hidden border-2
                  ${isSelected ? "border-cyan-400" : "border-transparent"}
                  hover:border-cyan-300
                `}
              >
                <img
                  src={mapa.img}
                  alt={mapa.name}
                  className="w-full h-24 object-cover"
                />
                <div className="text-center text-sm text-white p-1">
                  {mapa.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Criar novo mapa */}
        <button
          onClick={onCreateNew}
          className="mt-4 w-full bg-purple-600 hover:bg-purple-500 p-2 rounded font-semibold"
        >
          + Novo Mapa
        </button>

      </div>
    </div>
  );
};

export default MapSelect;