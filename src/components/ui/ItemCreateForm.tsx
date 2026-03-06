import React, { useState, type FormEvent } from "react";
import type { Item } from "../../types/item";
import type { Card } from "../../types/card";
import type { ItemSlot, ItemRarity } from "../../types/item";
import type { TokenAttributes } from "../../types/token";
import { type ChangeEvent } from "react";

interface ItemCreateProps {
  availableCards: Card[];
  onSave: (item: Item) => void;
  onClose: () => void;
}

const generateId = () => crypto.randomUUID();

const ItemCreateForm: React.FC<ItemCreateProps> = ({
  availableCards,
  onSave,
  onClose,
}) => { 
  const [slot, setSlot]     = useState<ItemSlot>("inventory-only");
  const [rarity, setRarity] = useState<ItemRarity>("common");

  const [ocasionalAdd, setOcasionalAdd] = useState(0);
  const [atribute, setAtribute] =
    useState<keyof Omit<TokenAttributes, "level" | "xp">>("forca");

  const [selectedCards, setSelectedCards]   = useState<Card[]>([]);
  const [cardPickerOpen, setCardPickerOpen] = useState<boolean>(false);
  const [craftable, setCraftable] = useState(false);

  const toggleCard = (card: Card) => {
    setSelectedCards(prev =>
      prev.some(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : [...prev, card]
    );
  };

  const [itemName, setItemName]   = useState<string>("")
  const [itemDesc, setItemDesc]   = useState<string>("")

  const [itemImgUrl, setItemImgUrl]   = useState<string>("")
  const [itemValue, setItemValue]     = useState<number>(0)

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setItemImgUrl("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setItemImgUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const item: Item = {
      name: itemName,
      imgUrl: itemImgUrl,
      desc: itemDesc,
      id: generateId(),
      slot,
      ocasionalAdd,
      atributeToOcasionalAdd: atribute,
      habilityCards: selectedCards.length > 0 ? selectedCards : null,
      rarity,
      value: itemValue,
      craftable,
      craftableWith: undefined,
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-3">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[520px] bg-gray-800 rounded-lg p-4 md:p-6 text-white shadow-2xl
                   max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-blue-400 mb-3">
          Criar Item
        </h2>


        {/* Nome */}
        <label className="flex flex-col gap-1 mb-4">
          <span className="text-sm font-semibold">Nome</span>
          <input
            className="bg-gray-700 border border-gray-600 rounded p-2"
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            required
          />
        </label>



        {/* Imagem */}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Imagem</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
            className="p-2 rounded bg-gray-700 border border-gray-600"
          />
          {itemImgUrl !== "" && (
            <img
              src={itemImgUrl}
              alt="Preview"
              className="mt-2 w-24 h-24 object-cover rounded border-2 border-purple-400"
            />
          )}
        </label>

        {/* Descrição */}

        <label className="flex flex-col gap-1 mb-2">
          <span className="text-sm font-semibold">Descrição</span>
          <input
            className="bg-gray-700 border border-gray-600 rounded p-2 h-20"
            value={itemDesc}
            onChange={e => setItemDesc(e.target.value)}
            required
          />
        </label>

        {/* Slot */}
        <label className="flex flex-col gap-1 mb-2">
          <span className="text-sm font-semibold">Slot</span>
          <select
            className="bg-gray-700 border border-gray-600 rounded p-2"
            value={slot}
            onChange={e => setSlot(e.target.value as ItemSlot)}
          >
            <option value="primary-hand">Mão Principal</option>
            <option value="off-hand">Mão Secundária</option>
            <option value="armor">Armadura</option>
            <option value="neck">Colar</option>
            <option value="ring">Anel</option>
            <option value="inventory-only">Mochila</option>
          </select>
        </label>

        {/* Raridade */}
        <label className="flex flex-col gap-1 mb-2">
          <span className="text-sm font-semibold">Raridade</span>
          <select
            className="bg-gray-700 border border-gray-600 rounded p-2"
            value={rarity}
            onChange={e => setRarity(e.target.value as ItemRarity)}
          >
            {["common" , "uncommon" , "rare" , "very-rare" , "epic" , "mitic" , "legendary" , "supreme" , "absolute"].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        {/* Buff */}
        <fieldset className="border border-gray-600 rounded p-3 mb-3">
          <span className="text-sm font-semibold">Bônus Ocasional</span>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <input
              type="number"
              className="bg-gray-700 border border-gray-600 rounded p-1 text-center"
              value={ocasionalAdd}
              onChange={e => setOcasionalAdd(Number(e.target.value))}
            />

            <select
              className="bg-gray-700 border border-gray-600 rounded p-1"
              value={atribute}
              onChange={e =>
                setAtribute(
                  e.target.value as keyof Omit<TokenAttributes, "level" | "xp">
                )
              }
            >
              {[
                "forca",
                "destreza",
                "consistencia",
                "sabedoria",
                "inteligencia",
              ].map(attr => (
                <option key={attr} value={attr}>
                  {attr}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        {/* Cards */}
        <fieldset className="border border-gray-600 p-3 rounded bg-gray-700 bg-opacity-50 mb-2">
            <legend className="font-semibold text-blue-400 px-2">Cards</legend>
            <button
              type="button"
              onClick={() => setCardPickerOpen(true)}
              className="w-full text-center bg-blue-600 hover:bg-blue-500 cursor-pointer px-6 py-2 rounded font-semibold transition-colors"
            >
              + Adicionar Card
            </button>
            
            <div className="pt-2">
              {selectedCards?.length === 0 ? (
                <p className="text-gray-400 text-sm text-center">Nenhum card adicionado.</p>
              ) : (
                selectedCards?.map((c) => (
                  <div
                    key={c.id}
                    className="bg-gray-800 p-3 rounded flex flex-col gap-2 hover:bg-gray-750 transition-colors"

                  >
                    <div className="flex items-start gap-3">
                        <img
                          src={c.img}
                          alt="Card"
                          className="w-12 h-12 object-cover rounded border border-gray-600"
                          draggable={false}
                        />

                        <div className="flex-1 overflow-hidden">
                          <h2 className="text-sm font-bold text-white line-clamp-2">
                            {c.name}
                          </h2>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                          <span className="bg-gray-700 px-2 py-0.5 rounded">
                            Ações: {c.actionsRequired}
                          </span>

                          {c.baseDice && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">
                              {c.baseDice.quantity}
                              {c.baseDice.type}
                            </span>
                          )}

                          {c.manaRequired && (
                            <span className="bg-blue-700/40 px-2 py-0.5 rounded text-blue-300">
                              Mana: {c.manaRequired}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setSelectedCards((prev) => prev.filter((x) => x.id !== c.id))
                          }
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Remover card"
                        >
                          ✕
                        </button>
                                                                                                
                    </div>
                  </div>
                ))
              )
              }
            </div>

        </fieldset>
        {/* Valor do item */}
        <fieldset>
          <p className="font-semibold text-sm mb-1">Valor do Item</p>
          <label className="flex bg-gray-700 p-2 mb-2 rounded border border-gray-600">
            <input 
            type="number" 
            min={0} 
            value={itemValue} 
            onChange={(e) => setItemValue(Number(e.target.value))}
            className="flex w-full"
            />
          </label>
        </fieldset>
        {/* Craft */}
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={craftable}
            onChange={e => setCraftable(e.target.checked)}
            className="accent-blue-400"
          />
          <span className="text-sm font-semibold">Pode ser usado em Craft</span>
        </label>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-600">
          <button
            type="button"
            onClick={onClose}
            className="bg-red-600 px-4 py-2 rounded font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-blue-600 px-4 py-2 rounded font-semibold"
          >
            Criar Item
          </button>
        </div>
      </form>

      {cardPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-4 shadow-xl">
            <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">
              Selecionar Card
            </h3>

            <div className="max-h-[320px] overflow-y-auto space-y-2">
              {availableCards.length === 0 ? (
                <p className="text-gray-400 text-sm text-center">
                  Nenhum card na biblioteca.
                </p>
              ) : (
                availableCards.map((card) => {
                  const alreadyAdded = selectedCards.some((c) => c.id === card.id);

                  return (
                    <button
                      key={card.id}
                      disabled={alreadyAdded}
                      onClick={() => {
                        if (alreadyAdded) return;
                        setSelectedCards((prev) => [...prev, card]);
                        setCardPickerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded
                        ${
                          alreadyAdded
                            ? "bg-gray-700 opacity-50 cursor-not-allowed"
                            : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                      <img
                        src={card.img}
                        alt={card.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">
                          {card.name}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {card.causality}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setCardPickerOpen(false)}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 py-2 rounded font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}      
    </div>
  );
};

export default ItemCreateForm;
