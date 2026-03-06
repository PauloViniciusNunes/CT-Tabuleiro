import type React from "react";
import type { Token, TokenInventory } from "../../types/token";
import { useState, useEffect, useRef } from "react";
import type { Item, ItemRarity, ItemSlot } from "../../types/item";
import { DollarSign, ChevronRight, ChevronLeft } from "lucide-react";

export interface InventoryUIProps
{
    token: Token,
    onClose: (t: boolean) => void;
    swap: (i: Item, n: number) => void;
}

const PARTICLE_RARITIES = [
  "legendary",
  "supreme",
  "absolute",
] as const;

type ParticleRarity = typeof PARTICLE_RARITIES[number];

function isParticleRarity(
  rarity: ItemRarity | null
): rarity is ParticleRarity {
  return (
    rarity !== null &&
    PARTICLE_RARITIES.includes(rarity as ParticleRarity)
  );
}

export function useRarityParticles(
  canvas: HTMLCanvasElement | null,
  textEl: HTMLElement | null,
  rarity: ItemRarity | null
) {
  useEffect(() => {
    if (!canvas || !textEl || !rarity) return;

    const ctx = canvas.getContext("2d")!;
    const rect = textEl.getBoundingClientRect();

    const padding = 6;

    const w = canvas.width = rect.width + padding * 2;
    const h = canvas.height = rect.height + padding * 2;

    const particleSpeed = rarity === "legendary" ? 0.7 : rarity === "supreme" ? 0.3 : rarity === "absolute" ? 0.1 : 0.7;
    const particleRay   = rarity === "legendary" ? 2 : rarity === "supreme" ? 3 : rarity === "absolute" ? 5 : 0.7;

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: h + Math.random() * h,
      speed: 0.3 + Math.random() * particleSpeed,
      size: 1 + Math.random() * particleRay,
      alpha: 0.4 + Math.random() * 0.6,
    }));

    if (
      rarity !== "legendary" &&
      rarity !== "supreme" &&
      rarity !== "absolute"
    ) return;

    const palette =
      rarity === "legendary"
        ? ["#facc15", "#eab308"]
        : rarity === "supreme"
        ? ["#ef4444", "#7f1d1d"]
        : ["#4c1d95", "#000000"];



    if (!palette) return;

    let running = true;

    function tick() {
      if (!running) return;

      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.y -= p.speed;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
        ctx.globalAlpha = p.alpha;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }

    tick();

    return () => {
      running = false;
    };
  }, [canvas, rarity, textEl]);
}

export function xpProgressionByLevel(lvl: number) {
  return Math.ceil(100 * Math.pow(lvl, 1.4));
}

const InventoryUI: React.FC<InventoryUIProps> = ({ token, onClose, swap}) => {
  const inventory = token.inventory;
  const { rows, cols } = inventory.inventoryDimensions;
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const nameRef = useRef<HTMLParagraphElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [page, setPage]         = useState<number>(1); // 1,2
  const [pageName, setPageName] = useState<string>("MOCHILA");



  const numberToSlot: Record<number, Partial<ItemSlot>> = 
  {
    0: "primary-hand",
    1: "off-hand",
    2: "neck",
    3: "ring",
    4: "armor",
  }

  const numberToTokenSlot: Record<number, keyof TokenInventory> =
  {
    0: "primaryHand",
    1: "offHand",
    2: "neck",
    3: "ring",
    4: "armor",
  }

  const slotTradution: Record<Partial<ItemSlot>, string> = 
  {
    "primary-hand": "Mão Primária",
    "off-hand": "Mão Segundária",
    neck: "Pescoço",
    ring: "Anel",
    "armor": "Armadura",
    "inventory-only": "Inventário",
  };

  const currentXP = token.attributes.xp;
  const maxXP = xpProgressionByLevel(token.attributes.level);
  const percent = Math.min((currentXP / maxXP) * 100, 100);



  function numberDisplayFormat(coins: number)
  {
    let stringCoin = coins.toString();

    const posfix   = 
    [
      "K", 
      "Mi", 
      "Bi", 
      "Tri", 
      "Q", 
      "Qi", 
      "Se", 
      "Spt", 
      "Oct", 
      "Non", 
      "Dec", 
      "Und",
      "Duo",
      "Tre",
      "Qua",
      "Qui",
      "Sexd",
      "Sept",
      "Octo",
      "Nove",
      "Vigi",
      "Unvi",
      "Duovi",
      "Tresvi",
      "Quatu",
      "Quinvi",
      "Sexvi",
      "Septemvi",
      "Octovi",
      "Novemvi",
      "Trigi",
      "Untri",
      "Duotri",
      "Tritri",
      "Quatri",
      "Quintri",
      "Sextri",
      "Septtri",
      "Octotri",
      "Nontri",
      "Quad",
    ]

    const coinHouses  = stringCoin.length;

    // 500

    // 12000 -> 12 K -> 2
    // 12100 -> 12.1 K -> 2 e 1
    // 500000 -> 500 K -> 3
    // 500100 -> 500.1 K

    const posfixIndex = Math.floor((coinHouses - 1) / 3) - 1;

    const housesToDisplay = ((coinHouses -1) % 3) + 1
    const houseAfterPoint = stringCoin[housesToDisplay] === "0" ? undefined : stringCoin[housesToDisplay]

    if(coinHouses < 4)
    {
      return coins.toString();
    }
    else
    {
      const rawNumbers = stringCoin.substring(0, housesToDisplay);
      if(houseAfterPoint)
      {
        return `${rawNumbers}.${houseAfterPoint} ${posfix[posfixIndex]}`
      }
      else
      {
        return `${rawNumbers} ${posfix[posfixIndex]}`;
      }
    }
  }
  
  const rarityTraduction: Record<ItemRarity, string> =
  {
    common: "Comum",
    uncommon: "Incomum",
    rare: "Raro",
    "very-rare": "Muito Raro",
    epic: "Épico",
    mitic: "Mítico",
    legendary: "Lendário",
    supreme: "Supremo",
    absolute: "Absoluto",
  }

  const totalSlots = rows * cols;

  useRarityParticles(
    canvasRef.current,
    nameRef.current,
    isParticleRarity(hoveredItem?.rarity ?? null)
      ? hoveredItem!.rarity
      : null
  );


  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-md rounded-lg border-2 border-blue-900 bg-gray-800 p-4 text-gray-100 shadow-2xl">
        
        <div className="flex flex-row justify-between">
          <div className="flex flex-row items-center gap-3 mb-4">
            <img
              className="w-16 h-16 rounded"
              src={token.imageUrl}
              alt={token.name}
            />
            <div>
              <p className="text-sm font-semibold">
                {token.name} - Lvl {token.attributes.level}
              </p>

              <div className="bg-gray-600 w-40 rounded p-2 text-xs mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p>
                    <span className=" font-semibold italic">FOR:</span>{" "}
                    <span>{token.attributes.forca}</span>
                  </p>
                </div>

                <div>
                  <p>
                    <span className=" font-semibold italic">INT:</span>{" "}
                    <span>{token.attributes.inteligencia}</span>
                  </p>
                </div>

                <div>
                  <p>
                    <span className=" font-semibold italic">DES:</span>{" "}
                    <span>{token.attributes.destreza}</span>
                  </p>
                </div>

                <div>
                  <p>
                    <span className=" font-semibold italic">SAB:</span>{" "}
                    <span>{token.attributes.sabedoria}</span>
                  </p>
                </div>

                <div>
                  <p>
                    <span className=" font-semibold italic">CON:</span>{" "}
                    <span>{token.attributes.consistencia}</span>
                  </p>
                </div>

                <div>
                  <p>
                    <span className=" font-semibold italic">CAR:</span>{" "}
                    <span>{token.attributes.carisma}</span>
                  </p>
                </div>                            
              </div>
            </div>

            <div className="relative flex flex-col justify-center h-32 w-52 space-y-1">
              <p className="font-bold text-sm text-center">XP</p>

              <div className="relative h-4 w-full bg-white border border-gray-800 rounded overflow-hidden">
                
                {/* Barra preenchida */}
                <div
                  className="absolute inset-y-0 left-0 bg-purple-500 z-10"
                  style={{ width: `${percent}%` }}
                />

                {/* Texto */}
                <p className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-black z-20">
                  {numberDisplayFormat(currentXP)}/{numberDisplayFormat(maxXP)}
                </p>

              </div>

            </div>

          </div>


          <button 
            className="font-serif text-red-500 hover:text-gray-600 p-2 text-xl flex items-start justify-center h-full w-12 rounded"
            onClick={() => onClose(false)}
          >X
          </button>

        </div>
        {/* Páginas do Inventário */}
        <h3 className="font-semibold text-center font-serif">{pageName}</h3>
          
          <div className="flex flex-row items-center">
            
            {page === 2 && (
              <ChevronLeft
                className="hover:text-blue-500"
                style={{
                  height: "2rem",
                  width: "2rem",
                  top: "50%",
                  transition: "0.5s",
                  marginLeft: "-1rem"
                }}
                onClick={() => {
                  setPage(1);
                  setPageName("MOCHILA")
                }}
              />

            )}

            {/* Slots */}
            {page === 1 && (
              <div
                id="slots"
                className="grid gap-1 border border-gray-700 rounded p-1 w-full h-full"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: totalSlots }).map((_, index) => {
                  const item = inventory.commonSlot?.[index];

                  return (
                    <div
                      key={index}
                      className="aspect-square rounded border border-gray-600 bg-gray-700
                                flex items-center justify-center overflow-hidden
                                hover:border-blue-400 transition"
                      onMouseEnter={(e) => {
                        if (!item) return;
                        setHoveredItem(item);
                        setMousePos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseMove={(e) => {
                        if (!item) return;
                        setMousePos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredItem(null)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if(!item) return;
                        swap(item, index);
                      }}
                    >
                      {item ? (
                        <div className="text-xs text-center">
                          <img
                            src={item.imgUrl}
                            alt={item.id}
                            className="w-full h-full object-contain rounded"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Vazio</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}            

            {page === 2 && (
              <div className="grid grid-cols-[auto_1fr] gap-x-4 border border-gray-700 rounded p-3 h-100 w-100 align-center">

                {/* Coluna dos nomes */}
                <div className="flex flex-col justify-between gap-3 h-full">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div className="flex items-center h-10">
                      <p
                        key={index}
                        className="text-xs text-gray-300 leading-none font-semibold"
                      >
                        {slotTradution[numberToSlot[index]]}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Coluna dos slots */}
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, index) => 
                    {

                      const item = inventory[numberToTokenSlot[index]] as Item;

                      return(
                        <div>
                          <div
                            key={index}
                            className="
                              w-16 h-16
                              rounded border border-gray-600 bg-gray-700
                              flex items-center justify-center overflow-hidden
                              hover:border-purple-400 transition
                            "
                            onMouseEnter={(e) => {
                              if (!item) return;
                              setHoveredItem(item);
                              setMousePos({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseMove={(e) => {
                              if (!item) return;
                              setMousePos({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseLeave={() => setHoveredItem(null)}                            
                          >
                            {item ? (
                              <div className="text-xs text-center">
                                <img
                                  src={item.imgUrl}
                                  alt={item.id}
                                  className="w-full h-full object-contain rounded"
                                />
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs">Vazio</span>
                            )}
                          </div>
                        </div>
                      )
                    }
                  )}
                </div>

              </div>
            )}



            {page === 1 && (
              <ChevronRight
                className="hover:text-blue-500"
                style={{
                  height: "2rem",
                  width: "2rem",
                  top: "50%",
                  transition: "0.5s",
                  marginRight: "-1rem"
                }}
                onClick={() => {
                  setPage(2);
                  setPageName("SLOTS")
                }}
              />

            )}

          </div>
        <div className="flex items-center justify-center gap-1 mt-3">
          <DollarSign className="text-yellow-400" />
          <p className="leading-none">{numberDisplayFormat(token.inventory.economy)}</p>
        </div>

      </div>

      {hoveredItem && (
      <div
        className="fixed z-[200] pointer-events-none
                  bg-blue-900/90 border border-black
                  rounded p-3 shadow-xl text-xs text-gray-100"
        style={{
          left: mousePos.x + 12,
          top: mousePos.y + 12,
          maxWidth: 220,
        }}
      >
        <div className="relative inline-block rounded">
          <canvas ref={canvasRef} className="rarity-canvas" />

          <p
            ref={nameRef}
            className={`item-name rarity-${hoveredItem.rarity}`}
          >
            {hoveredItem.name}
          </p>
        </div>

        <p className="text-gray-400 italic">
          “{hoveredItem.desc}”
        </p>

        {/* Informações */}
        <div className="mt-2 space-y-1">
          <p> 
            <span className="font-semibold">Raridade:</span>{" "}
            <span className={`font-semibold font-serif rarity-${hoveredItem.rarity}`}>{rarityTraduction[hoveredItem.rarity]}</span>
          </p>
          <p>
            <span className="font-semibold">Bônus:</span>{" "}
            +{hoveredItem.ocasionalAdd}{" "}
            {hoveredItem.atributeToOcasionalAdd}
          </p>

          {hoveredItem.habilityCards?.length ? (
            <div>
              <p className="font-semibold mt-1">Habilidades:</p>
              <ul className="list-disc list-inside">
                {hoveredItem.habilityCards.map(c => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {hoveredItem.craftable ? (
            <p className="font-semibold mt-1">Material</p>
          ): null}

          <div className="flex flex-row items-center gap-1">
            <span className="font-semibold mt-1">Venda:</span>{" "}
            <DollarSign className="w-3 h-3 text-yellow-400 relative top-[2px]" />
            <span className="font-semibold mt-1">{numberDisplayFormat(hoveredItem.value)}</span>
          </div>
        </div>
      </div>
    )}

    </div>
  );
};


export default InventoryUI;