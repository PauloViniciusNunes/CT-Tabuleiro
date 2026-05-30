import React from "react";
import type { Item } from "../../types/item";
import type { Card } from "../../types/card";

interface PresentItemProps {
  item: Item | null;
  onClose: () => void;
}

const PresentItem: React.FC<PresentItemProps> = ({
  item,
  onClose,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg text-white shadow-2xl border border-purple-600 animate-fade-in">

        {/* HEADER */}
        <h2 className="text-2xl font-bold text-purple-400 text-center mb-4">
          🎁 Item Obtido!
        </h2>

        {/* IMAGEM */}
        <div className="flex justify-center mb-4">
          <img
            src={item.imgUrl}
            alt={item.name}
            className="w-32 h-32 object-cover rounded-lg border-2 border-purple-500 shadow-lg"
          />
        </div>

        {/* NOME */}
        <h3 className="text-xl font-semibold text-center mb-2">
          {item.name}
        </h3>

        {/* DESCRIÇÃO */}
        <p className="text-gray-300 text-sm text-center mb-3">
          {item.desc}
        </p>

        {/* BONUS */}
        {item.ocasionalAdd && (
          <div className="mb-3">
            <span className="text-green-400 font-semibold text-sm">
              Bônus:
            </span>
            <p className="text-gray-300 text-sm">
              {item.ocasionalAdd}
            </p>
          </div>
        )}

        {/* CARDS / HABILIDADES */}
        {item.habilityCards && item.habilityCards.length > 0 && (
          <div className="mt-4">
            <span className="text-blue-400 font-semibold text-sm">
              Habilidades:
            </span>

            <div className="max-h-[200px] overflow-y-auto mt-2 space-y-2 pr-1">
              {item.habilityCards.map((card: Card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 bg-gray-800 p-2 rounded border border-gray-700"
                >
                  <img
                    src={card.img}
                    alt={card.name}
                    className="w-10 h-10 rounded object-cover"
                  />

                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {card.name}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {card.causality}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTION */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresentItem;