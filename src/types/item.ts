import type { Card } from "./card";
import type { TokenAttributes, TokenInventory } from "./token"


export type ItemSlot   = "primary-hand" | "off-hand" | "neck" | "ring" | "armor" | "inventory-only";
export type ItemRarity = "common" | "uncommon" | "rare" | "very-rare" | "epic" | "mitic" | "legendary" | "supreme" | "absolute";

/** Mechanics currently available in the engine for an equipped item to grant. */
export const PASSIVE_MECHANIC_OPTIONS = [
  { id: "fogo", label: "Fogo" },
  { id: "gravidade", label: "Gravidade" },
  { id: "dano-reduzido", label: "Dano reduzido" },
  { id: "invulnerabilidade", label: "Invulnerabilidade" },
  { id: "força-acumulada", label: "Força Acumulada" },
  { id: "imunidade-dano-agua", label: "Imunidade a dano de água" },
  { id: "imunidade-efeito-agua", label: "Imunidade a efeitos de água" },
  { id: "ignorar-imunidade-fogo", label: "Ignorar imunidade a fogo" },
  { id: "dano-fogo-por-afinidade", label: "Dano de fogo por afinidade" },
  { id: "negacao-alteracao-ambiente-spell", label: "Negação de ambiente por spell" },
  { id: "queimacao-ao-negar-spell", label: "Queimação ao negar spell" },
  { id: "equalizacao-menor-vida", label: "Equalização pela menor vida" },
  { id: "equalizacao-menor-mana", label: "Equalização pela menor mana" },
  { id: "controle-proximo-turno", label: "Controle no próximo turno" },
  { id: "carga-fogo-proximo-turno", label: "Carga de fogo no próximo turno" },
  { id: "autodestruicao-falha-carisma", label: "Autodestruição por falha de Carisma" },
  { id: "repeticao-dano-magico", label: "Repetição de dano mágico" },
  { id: "acumulo-dano-magico-adicao", label: "Acúmulo de dano mágico em adição" },
  { id: "super-percepcao", label: "Super percepção" },
  { id: "repeticao-dano-fisico", label: "Repetição de dano físico"},
  { id: "dano-para-bonus-forca", label: "Dano para Bônus Força"},
  { id: "drenar-sangue", label: "Drenagem sanguínea" },
  { id: "roubo-elementar", label: "Roubo Elementar" }
] as const;

export type PassiveMechanic = typeof PASSIVE_MECHANIC_OPTIONS[number]["id"];

export type ArtificeSettings =
{
  lifeAdd: number,
  manaAdd: number,
  mechanicToApply: PassiveMechanic | null,
  cardDispach: Card | null,
}

export type Item = 
{
    name:string;
    imgUrl: string;
    desc:   string;

    id: string;                    // Seu id único.
    slot:         ItemSlot;        // Qual slot ocupa.
    ocasionalAdd: number;          // Valor bruto da adição ocasional.

    atributeToOcasionalAdd: keyof Omit<TokenAttributes, "level" | "xp">;    // Qual atributo que receberá a adição ocasional.

    habilityCards: Card[] | null;        // Habilidades que são concedidas a quem possui.
    rarity:        ItemRarity;          // Raridade.
    value:         number;              // Valor pelo qual pode ser vendido.

    craftable: boolean;                  // Pode ser usado como craft?
    craftableWith: string[] | undefined; // Armazena IDs de outros items.
    
    isArtifice: boolean;
    artficeSettings: ArtificeSettings;
    passiveMechanics: PassiveMechanic[];
    
    vfxUrl?: string[];
    sfxUrl?: string;
}

type KeysMatching<T, V> =
    {
      [K in keyof T]:
      T[K] extends V
      ? K
      : never
    }[keyof T];

export type EquippedSlot =
    NonNullable<
      KeysMatching<
        TokenInventory,
        Item | undefined
      >
    >;
