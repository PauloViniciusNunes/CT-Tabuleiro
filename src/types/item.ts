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
  { id: "roubo-elementar", label: "Roubo Elementar" },
  { id: "fogo-negro", label: "Fogo negro" },
  { id: "eletrico", label: "Elétrico" },
  { id: "escurecido", label: "Escurecido" },
  { id: "arma-magica", label: "Arma mágica" },
  { id: "visao-noturna", label: "Visão noturna" },
  { id: "asas-dragao", label: "Asas de dragão" },
  { id: "vida-por-mana", label: "Vida por mana" },
  { id: "cancelar-dano", label: "Cancelar dano" },
  { id: "carga-veneno", label: "Carga de veneno" },
  { id: "veneno", label: "Veneno" },
  { id: "surto-acao", label: "Surto de ação" },
  { id: "tres-ataques-extra", label: "Três ataques extras" },
  { id: "prisao", label: "Prisão" },
  { id: "desvantagem-cosistencia", label: "Desvantagem em consistência" },
  { id: "desvantagem-destreza", label: "Desvantagem em destreza" },
  { id: "turno-cancelado", label: "Cancelar próximo turno" },
  { id: "vantagem-forca", label: "Vantagem em força" },
  { id: "vantagem-consistencia", label: "Vantagem em consistência" },
  { id: "vida-virtual", label: "Vida virtual" },
  { id: "basica-regeneracao", label: "Regeneração básica" },
  { id: "cancelar-acao-aplicar-fogo", label: "Cancelar ação e aplicar fogo" },
  { id: "amplificador-fogo", label: "Amplificador de fogo" }
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
