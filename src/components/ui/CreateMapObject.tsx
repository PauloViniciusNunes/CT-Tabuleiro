import React, { useEffect, useState } from "react";
import type { MapObject } from "../../types/mapObject";
import type { Item } from "../../types/item";
import type { Mapa } from "../../types/mapas";

type MapObjectType = "wall" | "chest" | "article" | "item" | "door";

interface CreateMapObjectProps {
  position: { col: number; row: number };
  createdItems: Item[];
  selectedMapa: Mapa | undefined;
  createdMapas: Mapa[]; 
  setBoardMapObjects: React.Dispatch<React.SetStateAction<MapObject[]>>;
  generatePairDoor: (d: MapObject) => void;
  onClose: () => void;
}

const generateId = (): string =>
  Math.random().toString(36).slice(2, 11);

const CreateMapObject: React.FC<CreateMapObjectProps> = ({
  position,
  createdItems,
  selectedMapa,
  createdMapas,
  setBoardMapObjects,
  generatePairDoor,
  onClose,
}) => {
  const [type, setType] = useState<MapObjectType>("wall");

  const availableMaps = createdMapas.filter((m) => m.id !== selectedMapa?.id)

  const [isChest, setIsChest] = useState(false);
  const [isDoor, setIsDoor] = useState(false);

  const [imgUrl, setImgUrl] = useState<string>("");

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);

  // 🔥 Door
  const [linkedMapId, setLinkedMapId] = useState<string>("");

  useEffect(() => {
    setIsChest(type === "chest");
    setIsDoor(type === "door");

    if (type !== "chest") {
      setSelectedItem(null);
    }

    if (type !== "door") {
      setLinkedMapId("");
    }
  }, [type]);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      setImgUrl("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImgUrl(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    const newObj: MapObject = {
      id: generateId(),
      type,
      position,
      imgUrl,
      itemRelative: selectedItem,

      // 🔥 Door linkage
      linkedMapId: isDoor ? linkedMapId : undefined,
      linkedDoorId: isDoor ? generateId() : undefined,
    };

    setBoardMapObjects((prev) => [...prev, newObj]);

    if(type === 'door') generatePairDoor(newObj);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-4 rounded-lg w-full max-w-md text-white space-y-4">

        <h2 className="text-xl font-bold text-purple-400">
          Criar Map Object
        </h2>

        {/* Tipo */}
        <div>
          <span className="text-sm font-semibold">
            Tipo
          </span>

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as MapObjectType)
            }
            className="w-full mt-1 p-2 rounded bg-gray-700 border border-gray-600"
          >
            <option value="wall">Wall</option>
            <option value="chest">Chest</option>
            <option value="article">Article</option>
            <option value="item">Item</option>
            <option value="door">Door</option>
          </select>
        </div>

        {/* 🔥 SELECT DE MAPAS */}
        {isDoor && (
          <div className="space-y-2">
            <span className="text-sm font-semibold">
              Mapa de destino
            </span>

            <select
              value={linkedMapId}
              onChange={(e) => setLinkedMapId(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
            >
              <option value="">
                Selecionar mapa...
              </option>

              {availableMaps.map((mapa) => (
                <option
                  key={mapa.id}
                  value={mapa.id}
                >
                  {mapa.name}
                </option>
              ))}
            </select>

            {/* preview */}
            {linkedMapId && (
              <div className="text-xs text-cyan-300 bg-gray-900 p-2 rounded border border-cyan-700">
                Linkado para:
                {" "}
                {
                  createdMapas.find(
                    (m) => m.id === linkedMapId
                  )?.name
                }
              </div>
            )}
          </div>
        )}

        {/* Imagem */}
        <div>
          <span className="text-sm font-semibold">
            Imagem
          </span>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full mt-1 p-2 rounded bg-gray-700 border border-gray-600"
          />

          {imgUrl && (
            <img
              src={imgUrl}
              alt="Preview"
              className="mt-2 w-24 h-24 object-cover rounded border-2 border-purple-400"
            />
          )}
        </div>

        {/* Item relativo */}
        {isChest && (
          <div>
            <span className="text-sm font-semibold">
              Item Relativo
            </span>

            <button
              onClick={() =>
                setItemPickerOpen((prev) => !prev)
              }
              className="w-full mt-1 p-2 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 text-left"
            >
              {selectedItem
                ? selectedItem.name
                : "Selecionar item..."}
            </button>

            {itemPickerOpen && (
              <div className="max-h-[200px] overflow-y-auto mt-2 space-y-2">

                {createdItems.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center">
                    Nenhum item disponível.
                  </p>
                ) : (
                  createdItems.map((item) => {
                    const alreadySelected =
                      selectedItem?.id === item.id;

                    return (
                      <button
                        key={item.id}
                        disabled={alreadySelected}
                        onClick={() => {
                          setSelectedItem(item);
                          setItemPickerOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 p-2 rounded
                          ${
                            alreadySelected
                              ? "bg-gray-700 opacity-50 cursor-not-allowed"
                              : "bg-gray-700 hover:bg-gray-600"
                          }
                        `}
                      >
                        <img
                          src={item.imgUrl}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded"
                        />

                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-white">
                            {item.name}
                          </p>

                          <p className="text-xs text-gray-400 line-clamp-1">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">

          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Cancelar
          </button>

          <button
            onClick={handleCreate}
            disabled={isDoor && linkedMapId === ""}
            className={`
              px-4 py-2 rounded
              ${
                isDoor && linkedMapId === ""
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500"
              }
            `}
          >
            Criar
          </button>

        </div>
      </div>
    </div>
  );
};

export default CreateMapObject;