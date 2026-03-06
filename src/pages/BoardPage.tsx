import React, { useMemo, useState, useEffect, useRef } from "react";
import SettingsDropdown from "../components/ui/SettingsDropdown";
import Sidebar from "../components/ui/Sidebar";
import BattlePanel from "../components/ui/BattlePanel";
import StatusBars from "../components/ui/StatusBars";
import ActionForm from "../components/ui/ActionForm";
import ReactionPrompt from "../components/ui/ReactionPrompt";

import DefenseResolutionForm from "../components/ui/DefenseResolutionForm";
import { calculateCardRoll, calculateDistance, isInAttackRange, sum } from "../utils/battleCalculations";
import type { Token, TokenAttributes, TokenClass, TokenProficiencies } from "../types/token";
import type { Item, ItemSlot } from "../types/item";
import type { Track } from "../types/music";
import { canDefenderReact, nextParalysisAfterHit } from '../utils/paralysis';
import type { ParalysisState } from '../types/status';
import type { TokenInventory } from "../types/token";

import type { Position } from "../types/card";

import {getTokenVisualEffects} from "../types/getTokenVisual"

import type {
  BattleState,
  InitiativeData,
  RollResult,
  ActionChoice,
} from "../types/battle";
import {
  rollInitiative,
  initializeBattleStats,
  calculateActionRoll,
} from "../utils/battleCalculations";
import processTurnEffects from "../utils/battleEffects";

import type { EffectType, TokenPrimaryElement, EffectMoment, TokenEffect,} from "../types/effects";
import type { CardEntityInstance, Card } from "../types/card";
import CardForm from "../components/ui/CardForm";
import type { Pivot, Target } from "../types/target";
import OffensiveCardResolution from "../components/ui/OffensiveCardResolution";
import type { ActionRollParams } from "../types/battle";
import InventoryUI from "../components/ui/Inventory";
import {type MusicContextType } from "../components/context/MusicContext";
import { type DJEffects } from "../components/context/MusicContext";

const getColumnName = (num: number): string => {
  let name = "";
  while (num > 0) {
    const rem = (num - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    num = Math.floor((num - 1) / 26);
  }
  return name;
};

const columnToNumber = (name: string): number => {
  let num = 0;

  for (let i = 0; i < name.length; i++) {
    const charCode = name.charCodeAt(i) - 64; // 'A' = 65 → 1
    num = num * 26 + charCode;
  }

  return num;
};


const teamGlowColors: Record<string, string> = {
  Red: "rgba(239, 68, 68, 0.6)",
  Blue: "rgba(59, 130, 246, 0.6)",
  Green: "rgba(34, 197, 94, 0.6)",
  Yellow: "rgba(234, 179, 8, 0.6)",
};

type ExecuteChoice = ActionChoice & {
  targetId: string;
  usedMana: number;
  usedActions: number;
  usedCertaintyDie?: boolean;
  pos: number;
  actionType: string;
};


type PendingReaction = {
  type: "consistencia" | "destreza";
  targetToken: Token;
};

export const MusicContext = React.createContext<MusicContextType | null>(null);

const BoardPage: React.FC = () => {

  /* Audio Resolution */
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio();

    const a = audioRef.current;
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTrack(null);
    };

    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("ended", onEnded);
      a.pause();
    };
  }, []);

  function playTrack(track: Track) {
    const a = audioRef.current;
    if (!a) return;

    const isSame = currentTrack?.id === track.id;

    if (!isSame) {
      a.src = track.url;
      a.currentTime = 0;
      a.play()
        .then(() => {
          setCurrentTrack(track);
          setIsPlaying(true);
        })
        .catch(() => {
          setCurrentTrack(null);
          setIsPlaying(false);
        });
      return;
    }

    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      a.play().then(() => setIsPlaying(true));
    }
  }


  /* * */

  const [rows, setRows] = useState(25);
  const [cols, setCols] = useState(25);

  type GridCell = {
    row: number;
    col: number;
  };


  const gridCells: GridCell[] = useMemo(() => {
    const cells: GridCell[] = [];
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= cols; col++) {
        cells.push({ row, col });
      }
    }
    return cells;
  }, [rows, cols]);

  const [remainingPivots, setRemainingPivots] = useState<number>(0);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [didActThisTurn, setDidActThisTurn] = useState<Record<string, boolean>>({});
  const [shouldAdvanceTurn, setShouldAdvanceTurn] = useState(false);
  const [lastTurnActed, setLastTurnActed] = useState<Record<string, boolean>>({});
  const [lastTurnMoved, setLastTurnMoved] = useState<Record<string, boolean>>({});
  const [tokenParalysis, setTokenParalysis] = useState<Record<string, ParalysisState>>({}); // tokenId -> state
  const [freeActionLock, setFreeActionLock] = useState<Record<string, string>>({}); 
  const [sidebarWidth, setSidebarWidth] = useState<number>(320); // inicial
  const [cardEntities, setCardEntities] = useState<CardEntityInstance[]>([]);

  function decreaseCardEntityDuration(triggerId: string) {
    setCardEntities(prev => {
      // 1️⃣ decrementa duração
      const updated = prev.map(c =>
        c.triggerId === triggerId
          ? { ...c, duration: c.duration - 1 }
          : c
      );

      // 2️⃣ identifica entidades que acabaram
      const expired = updated.filter(c => c.duration <= 0);

      if (expired.length > 0) {
        const expiredIds = expired.map(c => c.id);

        // 3️⃣ remove efeitos causados por essas entidades
        setBoardTokens(tokens =>
          tokens.map(t => ({
            ...t,
            tokenEffects: t.tokenEffects?.filter(
              e => !expiredIds.includes(e.cardResultantId ?? "")
            )
          }))
        );
      }

      // 4️⃣ remove entidades expiradas do estado
      return updated.filter(c => c.duration > 0);
    });
  }

  function tokenHasCardEffect(token: Token, cardId: string): boolean | undefined {
    return token.tokenEffects?.some(
      eff =>
        eff.isCardResultant === true &&
        eff.cardResultantId === cardId
    );
  }

function applyCardEffectToToken(
  token: Token,
  card: CardEntityInstance
): Token {
  // ⛔ aliado
  if (token.team === card.friendlyTeam) return token;

  const currentEffects = token.tokenEffects ?? [];

  // remove efeitos já aplicados por esta carta (evita duplicação)
  const newEffects: TokenEffect[] = card.effectToApply
    .filter(effect =>
      !currentEffects.some(e =>
        e.cardResultantId === card.id &&
        e.effectType === effect
      )
    )
    .map(effect => ({
      duration: undefined,
      intensity: 1,
      effectType: effect,          // ✅ agora é unitário
      elementResultant: "neutro",
      effectMoment: "AllTurn",
      isCardResultant: true,
      cardResultantId: card.id
    }));

  if (newEffects.length === 0) return token;

  return {
    ...token,
    tokenEffects: [
      ...currentEffects,
      ...newEffects
    ]
  };
}






  function IsTokenInCardInstanceRange(token: Token, cardInstance: CardEntityInstance)
  {
    const dx     = Math.abs(token.position.col - cardInstance.position.col);
    const dy     = Math.abs(token.position.row - cardInstance.position.row);
    const output = dx <= cardInstance.pivotSettings.range && dy <= cardInstance.pivotSettings.range;
    return output;
  }

  function removeCardEffectsFromToken(token: Token, cardId: string): Token {
    return {
      ...token,
      tokenEffects: token.tokenEffects?.filter(
        eff =>
          !eff.isCardResultant ||
          eff.cardResultantId !== cardId
      )
    };
  }


  function applyCardEntityEffect() {
    cardEntities.forEach((c) => {
      const affectedTokens = getTokensInCardEntityRadius(
        boardTokens,
        c.position,
        c.pivotSettings.range,
        c.triggerId
      );

      const triggerToken = boardTokens.find(t => t.id === c.triggerId);
      const tokenProficiency = Math.ceil(
        (((triggerToken?.attributes.level ?? 1) - 10) / 4) + 4
      );

      affectedTokens
        // ⛔ ignora aliados
        .filter(t => t.team !== c.friendlyTeam)
        .forEach(t => {
          c.effectToApply.forEach(e =>{
            applyTokenEffect(
              t,
              "neutro",
              e,
              undefined,
              tokenProficiency,
              "AllTurn",
              true,
              c.id
            );
          })

        });
    });
  }

  function resolveTriggerFixPivot(triggerToken: Token) 
  {
    if (!armedCard || !triggerToken) return;

    const instance: CardEntityInstance = 
    {
      id: crypto.randomUUID(),
      pivotSettings: armedCard.target?.pivotSettings!,
      effectToApply: armedCard.effectToApply,
      triggerId: triggerToken.id,
      duration: armedCard.duration ?? Infinity,
      position: { ...triggerToken.position }, // 🎯 nasce no trigger
      friendlyTeam: triggerToken.team
    };    

    const affectedTokens = getTokensInCardEntityRadius(
      boardTokens,
      instance.position,
      instance.pivotSettings.range,
      instance.triggerId
    );

    affectedTokens.forEach(t => {
      applyCardEntityEffectToToken(instance, t);
    });

    setCardEntities(prev => [...prev, instance]);
  }


function applyCardEntityEffectToToken(
  cardEntity: CardEntityInstance,
  targetToken: Token
) {
  // ⛔ aliado não sofre efeito
  if (targetToken.team === cardEntity.friendlyTeam) return;

  const triggerToken = boardTokens.find(t => t.id === cardEntity.triggerId);

  const tokenProficiency = Math.ceil(
    (((triggerToken?.attributes.level ?? 1) - 10) / 4) + 4
  );

  cardEntity.effectToApply.forEach(e =>{
    applyTokenEffect(
      targetToken,
      "neutro",
      e,
      undefined,
      tokenProficiency,
      "AllTurn",
      true,
      cardEntity.id
    );
  })

}


  const [prevReaction, setPrevReaction] = useState<Record<string, string>>({});
  
  const [lastAllUsedResponse, setLastAllUsedResponse] = useState<Record<string, boolean>>({});
  
  const [postParalyse, setPostParalyse] = useState<{
    responderId: string;
    forcedId: string;
    allowedPostAtack: boolean;
  } | null>(null);

  const lastTurnKeyRef = useRef<string>("");
  
  const [pendingFreeResponse, setPendingFreeResponse] = useState<{
  responderId: string;  // quem ganhou a ação livre
  paralyzedId: string;  // quem ficou sem poder reagir a este próximo ataque
  } | null>(null);

  const [pendingCardResolution,           setPendingCardResolution]         = useState<Token | null>(null);
  const [showDefenseResolution, setShowDefenseResolution] = useState<{
    reactionResult: number;
    reactionType: "destreza";
  } | null>(null);





  const isAdvancingTurnRef = useRef(false);
  


  const [createdTokens, setCreatedTokens]       = useState<Token[]>([]);
  const [createdItems, setCreatedItems]         = useState<Item[]>([])
  const [tokenBeingEdited, setTokenBeingEdited] = useState<Token | null>(null);

  function addItem(item: Item)
  {
    setCreatedItems(prev => [...prev, item])
  }

  function removeItem(itemId: string)
  {
    setCreatedItems(prev => prev.filter((i) => i.id !== itemId))
  }

function swapItemInInventory(
  item: Item,
  itemIndex: number,
  token: Token,
  setCreatedTokens: React.Dispatch<React.SetStateAction<Token[]>>,
  setBoardTokens: React.Dispatch<React.SetStateAction<Token[]>>
) {
  if (item.slot === "inventory-only") return;

  const slotMap: Record<ItemSlot, keyof TokenInventory | null> = {
    "primary-hand": "primaryHand",
    "off-hand": "offHand",
    neck: "neck",
    ring: "ring",
    armor: "armor",
    "inventory-only": null,
  };

  const targetSlot = slotMap[item.slot];
  if (!targetSlot) return;

  const updateToken = (t: Token): Token => {
    if (t.id !== token.id) return t;

    const inventory = t.inventory;
    const equippedItem = inventory[targetSlot];

    // remove item da mochila
    const newCommonSlot = (inventory.commonSlot ?? [])
      .filter((_, i) => i !== itemIndex)
      .filter(Boolean); // remove buracos

    // devolve item equipado para mochila
    if (equippedItem) {
      newCommonSlot.push(equippedItem as Item);
    }

    return {
      ...t,
      inventory: {
        ...inventory,
        [targetSlot]: item,
        commonSlot: newCommonSlot,
      },
    };
  };

  // atualiza tokens criados (fonte de verdade)
  setCreatedTokens((prev) => {
    const index = prev.findIndex((t) => t.id === token.id);
    if (index === -1) return prev;

    const next = [...prev];
    next[index] = updateToken(prev[index]);
    return next;
  });

  // espelha no board
  setBoardTokens((prev) => prev.map(updateToken));
}



  function handleEditToken(token: Token) {
    setTokenBeingEdited(token);
    console.warn(tokenBeingEdited)
  }

  function handleSaveEditedToken(editedToken: Token) {
    setCreatedTokens(prev =>
      prev.map(t => t.id === editedToken.id ? editedToken : t)
    );

    setTokenBeingEdited(null);
  }

  const [boardTokens, setBoardTokens] = useState<Token[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [cards, setCards] = useState<Card[]>([]);

  const addCard = (card: Card) => {
    setCards((prev) => [...prev, card]);
  };

  const removeCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };


  const [battleState, setBattleState] = useState<BattleState>({
    status: "Not in Battle",
    round: 0,
    turnOrder: [],
    currentTurnIndex: 0,
    accumulatedActions: {},
    activeEffects: {},
    actionHistory: [],
  });

  const [pendingAttack, setPendingAttack] = useState<{
    attackerId: string;
    targetId: string;
    rawDamage: number;
    attackRoll: number;
    usedMana: number;
    attackAttribute: ActionChoice['attribute']; 
    pendingReactions: PendingReaction[];
    isReactionAllowed: boolean;
    isFreeAttack?: boolean;
    usedActions: number;
    atackElement: TokenPrimaryElement;
  } | null>(null);

  const pendingAttackRef = useRef(pendingAttack);

  const [inCardSelection, setInCardSelection] = useState<boolean>(false);

  useEffect(() =>{
    pendingAttackRef.current = pendingAttack;
  }, [pendingAttack])

  const [pendingEsquivaRoll, setPendingEsquivaRoll] = useState<RollResult | null>(null);
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);
  const [isCooling, setIsCooling] = useState<boolean>(false);
  const [movedThisTurn, setMovedThisTurn] = useState<Record<string, boolean>>({});
  const hasEnteredFirstTurnRef = useRef<Record<string, boolean>>({});

  const [isInDefenseResolution, setIsInDefenseResolution] = useState(false);
  const [tokensInOffensiveCard, setTokensInOffensiveCard] = useState<Token[]>([]);
  const [offensivePendingCard, setOffensivePendingCard]   = useState<Card>();
  const [armedCard, setArmedCard]                         = useState<Card>()

  useEffect(() => {
    setArmedCard(offensivePendingCard)
  },
  [offensivePendingCard]);

  useEffect(() => {
    if(armedCard)
    {
      
      if(armedCard.target.pivotSettings?.pivotType === "Trigger-Fix")
      {
        confirmAmbientPivots();
      }
    }
  }, [armedCard]);


  const [offensiveCardScore, setOffensiveCardScore]        = useState<number | null>(null);
  const [offensiveCardTestScore,setOffensiveCardTestScore] = useState<number | null>(null);
  const [tokensBattlePosition, setTokensBattlePosition]    = useState<Record<string, number>>({})

  function removeTokenFromOffensiveCard(tokenId: string) {
    setTokensInOffensiveCard(prev =>
      prev.filter(token => token.id !== tokenId)
    );
  }

  
  function searchTokenPosition(tokenId: string, attr: string)
  {
    const key = `${tokenId}->${attr}`;
    return tokensBattlePosition[key] ?? 1;
  }

  const [cardAreUsed, setCardAreUsed] = useState<boolean>(false);

  useEffect(() => 
    {
      if(tokensInOffensiveCard.length <= 0)
      {
        setOffensiveCardTestScore(null);
      }
    }, [tokensInOffensiveCard])

  useEffect(() => {
    if(!cardAreUsed) return;

    const currentId = battleState.turnOrder[battleState.currentTurnIndex]?.tokenId;
    if (!currentId) return;

    const actionsLeft = battleState.accumulatedActions[currentId] ?? 0;

    console.error('Ações restante pós uso de card: ', actionsLeft)
    if (actionsLeft <= 0) 
    {
      console.error("Passou o turno");
      setShouldAdvanceTurn(true);
    }
    setCardAreUsed(false);
  }, [
    cardAreUsed
  ]);
    

  const remainingExtraActions     = useRef<{ attackerId: string; extraActions: number } | null>(null); // Mudando para useRef para evitar assincronidade
  const remainingPrevisionAttacks = useRef<Record<string, number>>({});
  const cardsNotRechargeds        = useRef<Record<string, string[]>>({});
  const timeToRechargeCard        = useRef<Record<string, number>>({});

  function removeCardNotRecharge(currentId: string, valor: string) {
      const index = cardsNotRechargeds.current[currentId].indexOf(valor);
      
      if (index !== -1) {
          cardsNotRechargeds.current[currentId].splice(index, 1);
      }
      
  }


  function formatRechargeCardRecord(tokenId: string, cardId: string, recharge: number) 
  {
    const key = `${tokenId}->${cardId}`
    timeToRechargeCard.current[key] = recharge
  }

  function formatRechargeCardRecordReturn(tokenId: string, cardId: string)
  {
    const key = `${tokenId}->${cardId}`
    return timeToRechargeCard.current[key]
  }

  function reduceTimeToRecharge(currentId: string) {
    const record = timeToRechargeCard.current;

    Object.keys(record).forEach((key) => {
      if (key.includes(currentId)) {
        const newValue = record[key] - 1;
        const cardId   = key.replace(`${currentId}->`,"")

        if (newValue <= 0) 
        {
          delete record[key];
          removeCardNotRecharge(currentId, cardId)
        } 
        else 
        {
          record[key] = newValue;
        }
      }
    });
  }


  function defineRemainingPrevisionAttacks(defenderId: string, attackerId: string, numbersActions: number)
  {
    const formatedKey = `${defenderId}->${attackerId}`;

    const current = remainingPrevisionAttacks.current[formatedKey] ?? 0;

    remainingPrevisionAttacks.current[formatedKey] = Math.min(5, current + numbersActions);
  }

  function formatedPrevisionAttackKey(defenderId: string, attackerId: string)
  {
    return `${defenderId}->${attackerId}`;
  }

  const [controllEndResponse, setControllEndResponse] = useState<boolean>(false);
 
  const getParalysis = (tokenId: string): ParalysisState =>
    (tokenParalysis as Record<string, ParalysisState>)[tokenId] ?? 'none';

  const setParalysis = (tokenId: string, state: ParalysisState) => {
    setTokenParalysis((prev: Record<string, ParalysisState>) => ({ ...prev, [tokenId]: state }));
  };

  
  const totalActionsReturn = useRef(0);
  function grantFreeActionNoReaction(nextActorId: string, nextDefenderId: string, paralasysType: ParalysisState, totalActions: number) {
    
    if(paralasysType !== 'none')
    {
      console.log("🔴 ENTROU PARA DEFINIR O TOTAL DE AÇÕES DO TOKEN COMO: 2");
      setBattleState(prev => ({
        ...prev,
        accumulatedActions: {
          ...prev.accumulatedActions,
          [nextActorId]: Math.max(1, prev.accumulatedActions[nextActorId] + totalActions),
        },
      }));
    }

    setFreeActionLock(prev => ({ ...prev, [`${nextActorId}->${nextDefenderId}`]: totalActions.toString() }));
    const responder = boardTokens.find(t => t.id === nextActorId);
    const target = boardTokens.find(t => t.id === nextDefenderId);

    remainingExtraActions.current = { attackerId: nextActorId, extraActions: totalActions };
    totalActionsReturn.current = totalActions + 1;

    setParalysis(nextDefenderId, paralasysType);

    if (responder && target) 
    {
        const hasPhys = isInAttackRange(responder, target, "fisico");
        const hasMag  = isInAttackRange(responder, target, "magico");

        if (hasPhys || hasMag) 
        {
          setPendingFreeResponse({ responderId: nextActorId, paralyzedId: nextDefenderId });
        }
    }
  }


  const attributeTable = useRef<Record<string, Record<string, number>>>({});
  // USO: attributeTable.current["atlas"]["forca"] = 15;



const elementToEffect: Record<TokenPrimaryElement, EffectType> = {
  neutro: "none",
  fogo: "queimando",
  terra: "corroendo", 
  vento: "consistencia_debuff", 
  agua: "afogando",  
  darkfire: "darkfire", 
  arcano: "purificado", 
  acido: "corroendo", 
  eletrico: "eletrizado", 
  veneno: "envenenado", 
  som: "vulneravel_som",
  gelo: "congelando",
  sangue: "sangrando",
  darkelectric: "eletrizado_dark",
  magia_neutra: "neutral_magicalized",
  caos: "caozificado",
  alma: "almificado",
  psiquico: "psicotico",
  ferro: "enferrujado",
  cobre: "encobrizado",
  hidrogenio: "hidrogenado",
  fosforo: "fosforizado",
  helio: "heliozinado",
  neonio: "neozinado",
  argonio: "argonizado",
  criptonio: "criptonizado",
  xenonio: "xeonizado",
  radonio: "radonizado",
  sombra: "sombrificado",
  luz: "clareado",
  esporos: "esporizado",
  resina: "resinizado",
  plasma: "plasmizado",
  entropia: "entropizado",
  miasma: "miasmisado",
  eter: "eterificado",
  encumbria: "encumbriado",
  aether: "aetherificado",
  antimagia: "antimagicalizado",
  vazio: "envaziado",
  radiacao: "radioativado",
  vetor: "vetorizado",
  primordialidade: "primordializado",
  fogo_azul: "queimando_azul",
  fogo_verde: "queimando_verde",
  fogo_vermelho: "queimando_vermelho",
  gravidade: "gratitacionalizado",
  espaco: "espaciado",
  realidade: "realizado",
  fogo_cromatico: "queimando_cromatizado",
  ethereum: "etherizado"
};

  const buffOrDebuffToAttribute: Partial<Record<EffectType, string>> = {
    forca_buff: "forca",
    destreza_buff: "destreza",
    consistencia_buff: "consistencia",
    inteligencia_buff: "inteligencia",
    sabedoria_buff: "sabedoria",
    carisma_buff: "carisma",
    forca_debuff: "forca",
    destreza_debuff: "destreza",
    consistencia_debuff: "consistencia",
    inteligencia_debuff: "inteligencia",
    sabedoria_debuff: "sabedoria",
    carisma_debuff: "carisma",    
  }

function tokenHasEffects(token: Token, effects: EffectType[]): boolean {
  const list = token.tokenEffects ?? [];
  return effects.every(effect =>
    list.some(e => e.effectType === effect)
  );
}

type CombinationResult = | { remove: EffectType[]; add?: EffectType | EffectType[]; intensityMultiplier?: number; explosion?: boolean; areaRadius?: number; areaDamage?: number; areaEffect?: EffectType; areaElement?: TokenPrimaryElement; overlay?: string; gifPath?: string;} | null;
type EffectGrowthModel = "A" | "B";

const effectGrowthRules: Partial<Record<EffectType, EffectGrowthModel>> = {
  envenenado: "A",     // stacking exponencial
  queimando: "B",      // sempre reinicia baseado no ataque atual
  eletrizado: "B",     // lógica híbrida
  congelando: "B",
  darkfire: "B",
  preso: "B",
  sangrando: "A",
  eletrizado_dark: "B"
  // ... etc
};

function getTokensInRadius(tokens: Token[], center: Token, radius: number) {
  return tokens.filter(t => {
    const dx = Math.abs(t.position.col - center.position.col);
    const dy = Math.abs(t.position.row - center.position.row);
    return dx <= radius && dy <= radius;
  });
}

function applyAreaDamage(
  center: Token,
  radius: number,
  baseDamage: number
) {
  setBoardTokens(prev =>
    prev.map(t => {
      const dx = Math.abs(t.position.col - center.position.col);
      const dy = Math.abs(t.position.row - center.position.row);

      if (dx <= radius && dy <= radius) {
        // Aplica efeito de dano
        return {
          ...t,
          currentLife: Math.max(0, (t.currentLife ?? 0) - baseDamage)
        };
      }

      return t;
    })
  );
}

function applyAreaEffect(
  center: Token,
  radius: number,
  effect: EffectType,
  intensity: number,
  duration: number,
  resultantElement: TokenPrimaryElement
) {
  const affectedTokens = getTokensInRadius(boardTokens, center, radius);

  affectedTokens.forEach(t => {
    applyTokenEffect(
      t,
      resultantElement,
      effect,
      duration,
      intensity,
      "InTurn"
    );
  });
}

function resolveEffectCombinations(
  token: Token,
  incoming: EffectType
): CombinationResult {

  const has = (eff: EffectType[]) => tokenHasEffects(token, eff);

  if (has([incoming])) {
    return { remove: [incoming], add: incoming };
  }
   
  if(incoming === "explosao")
  {
    return {
      explosion: true,
      remove: ["queimando"],
      areaRadius: 1,
      areaDamage: 10,
      areaEffect: undefined,
      overlay: "overlay-explosao-area",
      gifPath: "/effects/explosion.gif"
    };    
  }

  if (incoming === "toxic_explosao") {
    return {
      explosion: true,
      remove: ["envenenado"],
      add: "darkfire",
      areaRadius: 2,
      areaDamage: 10,
      areaEffect: "darkfire",
      overlay: "overlay-explosao-area",
      gifPath: "/effects/dark-poison-fire.gif"
    };
  }  
  
  // ======== EXEMPLOS EXISTENTES ========
  //

  if (has(["congelando"]) && incoming === "queimando")
    return { remove: ["congelando", "queimando"] };

  if (has(["queimando"]) && incoming === "congelando")
    return { remove: ["queimando", "congelando"] };

  if (has(["congelando"]) && incoming === "darkfire")
    return { remove: ["congelando"], add: "darkfire" };

  if (has(["sangrando"]) && incoming === "queimando")
    return { remove: ["sangrando"], add: "queimando" };

  if (has(["afogando"]) && incoming === "eletrizado")
    return { remove: ["afogando"], add: "eletrizado", intensityMultiplier: 2 };

    // ======== Efeitos com Buff/Debuff ========

  if(incoming === "congelando")
  {
    return {remove: ["none"], add: ["destreza_debuff", "congelando"]};
  }
  // ========= 💥 GENERALIZAÇÃO DO SISTEMA DE EXPLOSÃO =========

  if (has(["queimando"]) && incoming === "eletrizado") {
    return {
      explosion: true,
      remove: ["queimando"],
      areaRadius: 1,
      areaDamage: 10,
      areaEffect: undefined,
      overlay: "overlay-explosao-area",
      gifPath: "/effects/explosion.gif"
    };
  }

  if (has(["eletrizado"]) && incoming === "queimando") {
    return {
      explosion: true,
      remove: ["eletrizado"],
      areaRadius: 1,
      areaDamage: 10,
      areaEffect: undefined,
      overlay: "overlay-explosao-area",
      gifPath: "/effects/explosion.gif"
    };
  }

  // ========= 🚀 NOVAS POSSIBILIDADES (SEM MEXER NO RESTO) =========


  // fogo + veneno → chama tóxica
  if (has(["envenenado"]) && incoming === "queimando") {
    return {
      explosion: true,
      remove: ["envenenado"],
      add: "darkfire",
      areaRadius: 2,
      areaDamage: 10,
      areaEffect: "darkfire",
      overlay: "overlay-explosao-area",
      gifPath: "/effects/dark-poison-fire.gif"
    };
  }

  // eletrizado + água → choque em corrente no raio 2
  if (has(["afogando"]) && incoming === "eletrizado") {
    return {
      remove: ["afogando"],
      add: "eletrizado",
      intensityMultiplier: 2,
      areaRadius: 2,
      areaEffect: "eletrizado",
      overlay: "overlay-shockwave"
    };
  }


  //
  // padrão
  //
  return null;
}


function addLargeExplosionOverlay(
  tokenId: string,
  radius: number,
  cellSize: number,
  overlayType: string,
  gifPath: string
) {
  const size = (radius * 2 + 1) * cellSize;

  // Offset para centralizar no token
  const offset = -radius * cellSize;

  const overlay = {
    id: crypto.randomUUID(),
    type: overlayType ?? "overlay-explosao-area",
    size,
    offset,
    gifPath: gifPath ?? "/effects/explosion.gif",
  };

  // ADICIONAR AO TOKEN CENTRAL
  setBoardTokens(prev =>
    prev.map(t =>
      t.id === tokenId
        ? {
            ...t,
            visualOverlays: [...(t.visualOverlays ?? []), overlay],
          }
        : t
    )
  );

  // REMOVER AUTOMATICAMENTE APÓS 1000ms
  setTimeout(() => {
    setBoardTokens(prev =>
      prev.map(t =>
        t.id === tokenId
          ? {
              ...t,
              visualOverlays: (t.visualOverlays ?? []).filter(
                o => o.id !== overlay.id
              ),
            }
          : t
      )
    );
  }, 1000);
}

function applyTokenEffect(
  token: Token,
  resultantElement: TokenPrimaryElement,
  typeEffect: EffectType,
  duration: number | undefined,
  intensity: number,
  effectMoment: EffectMoment,
  effectIsCardInstace?: boolean,
  cardInstanceId?: string,
) {
  // Garante estrutura
  token.tokenEffects ??= [];


  const       combo                 = resolveEffectCombinations(token, typeEffect);

  const buffEffects:   EffectType[] = ["forca_buff", "destreza_buff", "consistencia_buff", "inteligencia_buff", "sabedoria_buff", "carisma_buff"];
  const debuffEffects: EffectType[] = ["forca_debuff", "destreza_debuff", "consistencia_debuff", "inteligencia_debuff", "sabedoria_debuff", "carisma_debuff"];

  const adds = combo?.add ? Array.isArray(combo.add) ? combo.add : [combo.add] : [typeEffect];
  const buffDebuffMultiplier = 3;
  for(const effType of adds)
  {
    if(buffEffects.includes(effType))
    {
      if (buffOrDebuffToAttribute[effType])
      {
        attributeTable.current[token.id][buffOrDebuffToAttribute[effType]] = (attributeTable.current[token.id][buffOrDebuffToAttribute[effType]] ?? 0) + buffDebuffMultiplier * intensity;

        switch (buffOrDebuffToAttribute[effType])
        {
          case "forca":
            token.ocassionalAddition.forca = (token.ocassionalAddition.forca ?? 0) + buffDebuffMultiplier * intensity; 
            break;
          case "destreza":
            token.ocassionalAddition.destreza = (token.ocassionalAddition.destreza ?? 0) + buffDebuffMultiplier * intensity; 
            break;
          case "consistencia":
            token.ocassionalAddition.consistencia = (token.ocassionalAddition.consistencia ?? 0) + buffDebuffMultiplier * intensity; 
            break;
          case "inteligencia":
            token.ocassionalAddition.inteligencia = (token.ocassionalAddition.inteligencia ?? 0) + buffDebuffMultiplier * intensity; 
            break;                  
          case "sabedoria":
            token.ocassionalAddition.sabedoria = (token.ocassionalAddition.sabedoria ?? 0) + buffDebuffMultiplier * intensity; 
            break;          
          case "carisma":
            token.ocassionalAddition.carisma = (token.ocassionalAddition.carisma ?? 0) + buffDebuffMultiplier * intensity; 
            break;          
          default:
            break;
        }
        
      }

    }

    if(debuffEffects.includes(effType))
    {

      if (buffOrDebuffToAttribute[effType])
      {
        attributeTable.current[token.id][buffOrDebuffToAttribute[effType]] = (attributeTable.current[token.id][buffOrDebuffToAttribute[effType]] ?? 0) - buffDebuffMultiplier * intensity;

        switch (buffOrDebuffToAttribute[effType])
        {
          case "forca":
            token.ocassionalAddition.forca = (token.ocassionalAddition.forca ?? 0) - buffDebuffMultiplier * intensity; 
            break;
          case "destreza":
            token.ocassionalAddition.destreza = (token.ocassionalAddition.destreza ?? 0) - buffDebuffMultiplier * intensity; 
            break;
          case "consistencia":
            token.ocassionalAddition.consistencia = (token.ocassionalAddition.consistencia ?? 0) - buffDebuffMultiplier * intensity; 
            break;
          case "inteligencia":
            token.ocassionalAddition.inteligencia = (token.ocassionalAddition.inteligencia ?? 0) - buffDebuffMultiplier * intensity; 
            break;                  
          case "sabedoria":
            token.ocassionalAddition.sabedoria = (token.ocassionalAddition.sabedoria ?? 0) - buffDebuffMultiplier * intensity; 
            break;          
          case "carisma":
            token.ocassionalAddition.carisma = (token.ocassionalAddition.carisma ?? 0) - buffDebuffMultiplier * intensity; 
            break;          
          default:
            break;
        }
        
      }

    }
  }

  if (combo?.explosion) 
  {
    console.log("💥 Combo gerou explosão!");

    // remover efeitos envolvidos na reação
    if (combo.remove) {
      token.tokenEffects = token.tokenEffects.filter(
        eff => !combo.remove!.includes(eff.effectType)
      );
    }

    // dispara explosão
    triggerExplosion(token, intensity, combo);
    return;
  }


  // Remove efeitos que devem sair
  if (combo?.remove?.length) {
    token.tokenEffects = token.tokenEffects.filter(
      eff => !combo.remove.includes(eff.effectType)
    );
  }

  // Caso combinação diga que o efeito resultante muda
  let effectsToApply: EffectType[];

  if (combo?.add) {
    effectsToApply = Array.isArray(combo.add) ? combo.add : [combo.add];
  } else {
    effectsToApply = [typeEffect];
  }


  // Se combinação anulou sem adicionar nada → sair
  if (combo && combo.add === undefined && combo.remove?.length) {
    return;
  }

  // Aplica multiplicador direto da combinação
  if (combo?.intensityMultiplier) {
    intensity *= combo.intensityMultiplier;
  }

  // ===============================
  // 2. Determinar modelo de progressão (A, B, C)
  // ===============================

  const permanentEffects: TokenPrimaryElement[] = ["darkfire", "darkelectric"];
  const effectDuration = permanentEffects.includes(resultantElement) ? undefined : duration ?? 8;
  const uniqueEffects = Array.from(new Set(effectsToApply));

  for (const eff of uniqueEffects) {

    const existing = token.tokenEffects.find(e => e.effectType === eff);

    let finalIntensity = intensity;

    if (existing) {
      const model = effectGrowthRules[eff] ?? "B";
      if (model === "A") finalIntensity = existing.intensity * 2;
    }

    // remove antes
    token.tokenEffects = token.tokenEffects.filter(e => e.effectType !== eff);

    // aplica uma ÚNICA vez
    token.tokenEffects.push({
      isCardResultant: effectIsCardInstace,
      cardResultantId: cardInstanceId,
      duration: effectDuration,
      intensity: finalIntensity,
      effectType: eff,
      elementResultant: resultantElement,
      effectMoment,
    });

    token.tokenEffects = token.tokenEffects.filter(
      (e, i, arr) =>
        arr.findIndex(x => x.effectType === e.effectType) === i
    );

}

  /* 
  for (const eff of effectsToApply)
  {
    token.tokenEffects.push({
      duration: effectDuration,
      intensity,
      effectType: eff,
      elementResultant: resultantElement,
      effectMoment
    });    
  }
  */
}

function removeTokenEffect(
  token: Token,
  effectType: EffectType
) {
  if (!Array.isArray(token.tokenEffects)) return;

  token.tokenEffects = token.tokenEffects.filter(
    e => e.effectType !== effectType
  );
}


function triggerExplosion(centerToken: Token, baseIntensity: number, combo: CombinationResult) {
  const radius = 1; // pode ser variável
  const damage = baseIntensity * (combo?.areaDamage ?? 1); // explosão = dano amplificado

  console.log(`💥 EXPLOSÃO disparada no token ${centerToken.name}`);

  // 1) Dano em área
  applyAreaDamage(centerToken, radius, damage);

  // 2) Possível aplicação de efeitos em área
  applyAreaEffect(
    centerToken,
    radius,
    combo?.areaEffect ?? "none",
    Math.ceil(baseIntensity / 2),
    4,
    combo?.areaElement ?? "neutro"
  );

  // 3) Overlay visual
  addLargeExplosionOverlay(centerToken.id, radius, cellSize, combo?.overlay ?? "overlay-explosao-area", combo?.gifPath ?? "/effects/explosion.gif");
}


/* Seleção de Pivot, ambient */
const [previewCells, setPreviewCells] = useState<Set<string>>(new Set());

function addPreviewCells(cells: { col: number; row: number }[]) {
  setPreviewCells(prev => {
    const next = new Set(prev);

    cells.forEach(c => {
      next.add(`${c.col}-${c.row}`);
    });

    return next;
  });
}


type PivotCandidate =
  | { type: "cell"; position: Position }
  | { type: "token"; tokenId: string }
  | { type: "trigger" };

const [isAmbientPivotSelection, setIsAmbientPivotSelection]           = useState(false);
const [tokenInAmbientPivotSelection, setTokenInAmbientPivotSelection] = useState<string>("");

useEffect(() => {
  if (!isAmbientPivotSelection) return;

  setAmbientPivotPhase("awaiting-pivot");
}, [isAmbientPivotSelection]);

const [ambientPivotPhase, setAmbientPivotPhase] =
  useState<"awaiting-pivot" | "preview" | "confirm">("awaiting-pivot");

const [selectedPivots, setSelectedPivots] = useState<PivotCandidate[]>([]);

function getAvailablePivotTargets(): number {

  if (!armedCard?.target) return 0;

  switch (armedCard.target.pivotSettings?.pivotType) {
    case "Token-Fix":
      return boardTokens.length;

    case "Cell-Fix":
      return gridCells.length;

    case "Trigger-Fix":
      return 1;

    default:
      return 0;
  }
}


/* * */

function stepTokenEffect(token: Token) 
{
  if (!token.tokenEffects) return;

  const updatedEffects = token.tokenEffects
    .map(effect => 
    {

      const durationDecrement = effect.duration === undefined ? undefined : effect.duration - 1;

      const buffEffects:   EffectType[] = ["forca_buff", "destreza_buff", "consistencia_buff", "inteligencia_buff", "sabedoria_buff", "carisma_buff"];
      const debuffEffects: EffectType[] = ["forca_debuff", "destreza_debuff", "consistencia_debuff", "inteligencia_debuff", "sabedoria_debuff", "carisma_debuff"];
      
      if(buffEffects.includes(effect.effectType) && durationDecrement !== undefined && durationDecrement <= 0)
      {
        if (buffOrDebuffToAttribute[effect.effectType])
        {
          const attr = buffOrDebuffToAttribute[effect.effectType];

          if (attr !== undefined) 
          {
            switch (attr) 
            {
              case "forca":
                token.ocassionalAddition.forca =
                  (token.ocassionalAddition.forca ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "destreza":
                token.ocassionalAddition.destreza =
                  (token.ocassionalAddition.destreza ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "consistencia":
                token.ocassionalAddition.consistencia =
                  (token.ocassionalAddition.consistencia ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "inteligencia":
                token.ocassionalAddition.inteligencia =
                  (token.ocassionalAddition.inteligencia ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "sabedoria":
                token.ocassionalAddition.sabedoria =
                  (token.ocassionalAddition.sabedoria ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "carisma":
                token.ocassionalAddition.carisma =
                  (token.ocassionalAddition.carisma ?? 0) -
                  attributeTable.current[token.id][attr];
                break;
            }

            attributeTable.current[token.id][attr] = (attributeTable.current[token.id][attr] ?? 0) - 2 * effect.intensity;;
          }
        }
      }

      if(debuffEffects.includes(effect.effectType) && durationDecrement !== undefined && durationDecrement <= 0)
      {
        if (buffOrDebuffToAttribute[effect.effectType])
        {
          const attr = buffOrDebuffToAttribute[effect.effectType];

          if (attr !== undefined) 
          {
            switch (attr) {
              case "forca":
                token.ocassionalAddition.forca =
                  (token.ocassionalAddition.forca ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "destreza":
                token.ocassionalAddition.destreza =
                  (token.ocassionalAddition.destreza ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "consistencia":
                token.ocassionalAddition.consistencia =
                  (token.ocassionalAddition.consistencia ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "inteligencia":
                token.ocassionalAddition.inteligencia =
                  (token.ocassionalAddition.inteligencia ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "sabedoria":
                token.ocassionalAddition.sabedoria =
                  (token.ocassionalAddition.sabedoria ?? 0) -
                  attributeTable.current[token.id][attr];
                break;

              case "carisma":
                token.ocassionalAddition.carisma =
                  (token.ocassionalAddition.carisma ?? 0) -
                  attributeTable.current[token.id][attr];
                break;
            }

            
            attributeTable.current[token.id][attr] = (attributeTable.current[token.id][attr] ?? 0) + 2 * effect.intensity;
            console.log(">>> REVERSO DA OCASIONAL DEU: ", attributeTable.current[token.id][attr]); 
          }
        }
      }    

      return effect.duration === undefined ? effect : { ...effect, duration: durationDecrement };
    })
    .filter(effect => effect.duration === undefined || effect.duration > 0);


  // AQUI: você precisa persistir a mudança
  setBoardTokens(prev =>
    prev.map(t =>
      t.id === token.id
        ? { ...t, tokenEffects: updatedEffects }
        : t
    )
  );
}

function applyEffectsCausality(token: Token)
{

  if(!token.tokenEffects) return;

  token.tokenEffects.map(effect => {
    if(["queimando", "corroendo", "afogando", "darkfire", "eletrizado", "eletrizado_dark","envenenado", "sangrando"].includes(effect.effectType))
    {
      setBoardTokens((prev) =>
        prev.map((t) =>
          t.id === token.id
            ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - (effect.elementResultant === token.tokenPrimaryDisvantege ? 2 * (effect.intensity) : effect.intensity)) }
            : t
        )
      );      
    }
  });
}
  // Zoom & delete
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(z + 0.1, 3));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(z - 0.1, 0.5));
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedTokenId
      ) {
        e.preventDefault();
        setBoardTokens((prev) => prev.filter((t) => t.id !== selectedTokenId));
        setSelectedTokenId(null);
        setSelectedCell(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedTokenId]);


  // Movement keys when Not in Battle
  useEffect(() => {
    const handleMoveKey = (e: KeyboardEvent) => {
      if (battleState.status !== "Not in Battle") return;
      if (!selectedTokenId) return;
      const now = Date.now();
      if (now - lastMoveTime < 500) return;
      let dCol = 0, dRow = 0;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dRow = -1;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dRow = 1;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dCol = -1;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dCol = 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const token = boardTokens.find((t) => t.id === selectedTokenId);
      if (!token) return;
      const newCol = token.position.col + dCol;
      const newRow = token.position.row + dRow;
      if (newCol < 1 || newCol > cols || newRow < 1 || newRow > rows) return;
      moveTokenOnBoard(selectedTokenId, newCol, newRow);
      setLastMoveTime(now);
      setIsCooling(true);
      setTimeout(() => setIsCooling(false), 500);
    };
    window.addEventListener("keydown", handleMoveKey);
    return () => window.removeEventListener("keydown", handleMoveKey);
  }, [battleState.status, selectedTokenId, lastMoveTime, boardTokens, cols, rows]);

  const [inventoryOpen, setInventoryOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleCaptureOpen = (e: KeyboardEvent) =>
    {

      if(!selectedTokenId) return;
      switch(e.key)
      {
        case "E":
        case "e":
          setInventoryOpen(true);
          break;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", handleCaptureOpen);
    return () => window.removeEventListener("keydown", handleCaptureOpen);    
  }, [selectedTokenId])


  // Auto advance turn
  
  useEffect(() => {
    if (shouldAdvanceTurn && battleState.status === "In Battle" && !pendingAttack) {
      setShouldAdvanceTurn(false);
      handleNextTurn();
    }
  }, [shouldAdvanceTurn]); // ⬅️ APENAS shouldAdvanceTurn como dependência


  useEffect(() => {
  if (postParalyse && postParalyse.allowedPostAtack) {
    console.log("!!> Está entrando aqui");
    setPendingFreeResponse({
      responderId: postParalyse.responderId,
      paralyzedId: postParalyse.forcedId,
    });
  }
}, [postParalyse]);

  useEffect(() => {
    if(remainingExtraActions && (remainingExtraActions.current?.extraActions ?? 0) <= 0)
    {
      setPendingFreeResponse(null);
    }
  }, [controllEndResponse])


    // Adicione este useEffect após os outros useEffects em BoardPage.tsx
  useEffect(() => {
    // Quando showDefenseResolution é definido, mas pendingAttack ainda tem reações
    // Significa que o form DEVE aparecer
    if (showDefenseResolution && pendingAttack && pendingAttack.pendingReactions.length === 0) {
      console.log("✅ DefenseResolutionForm PRONTO PARA RENDERIZAR!");
      // O JSX renderizará automaticamente aqui
    }
  }, [showDefenseResolution, pendingAttack]);


  // Calcula ações apenas quando um novo token ENTRA seu turno
  // ⬅️ ÚNICO useEffect CORRETO
// Calcula ações apenas quando um novo token ENTRA seu turno
// ⬅️ ÚNICO useEffect CORRETO

// Coloque este ref junto dos outros useRef no topo do componente


  useEffect(() => {
    if (battleState.status !== "In Battle") return;
    if (pendingEsquivaRoll != null) return;
    if (isInDefenseResolution) return;

    const current = battleState.turnOrder[battleState.currentTurnIndex];
    const currentTokenId = current?.tokenId;
    if (!currentTokenId) return;

    const turnKey = `${battleState.status}-${battleState.round}-${battleState.currentTurnIndex}-${currentTokenId}`;
    if (lastTurnKeyRef.current === turnKey) return;
    lastTurnKeyRef.current = turnKey;

    console.log("⚠️ ENTROU NO USEEFFECT DE CÁLCULO DE AÇÕES");
    if (remainingExtraActions.current && remainingExtraActions.current.extraActions <= 0) 
    {
      remainingExtraActions.current = null;
    }

    console.log("🔄", `[${currentTokenId}]`, "ENTRANDO NO TURNO!");

    // USE o snapshot do turno ANTERIOR do próprio token
    const actedPrev = !!lastTurnActed[currentTokenId];
    const movedPrev = !!lastTurnMoved[currentTokenId];

    const prevActions = battleState.accumulatedActions[currentTokenId] ?? 1;

    let newActions = prevActions;
    if (!hasEnteredFirstTurnRef.current[currentTokenId]) {
      hasEnteredFirstTurnRef.current[currentTokenId] = true;
      newActions = Math.max(1, prevActions);
      console.log(`🆕 PRIMEIRA ENTRADA DO TOKEN, AÇÕES INICIAIS = ${newActions}`);
    } else if (!actedPrev && !movedPrev) {
      newActions = Math.min(5, Math.max(1, prevActions) + 1);
      console.log(`➕ [${currentTokenId}] NÃO AGIU E NEM MOVEU. AÇÕES: = ${prevActions} + 1 = ${newActions}`);
    } else {
      newActions = Math.max(1, prevActions);
      console.log(`➖ [${currentTokenId}] AGIU OU MOVEU. MANTÉM = ${newActions}`);
    }

    if (newActions === prevActions) return;

    setBattleState(prev => ({
      ...prev,
      accumulatedActions: {
        ...prev.accumulatedActions,
        [currentTokenId]: newActions,
      },
    }));
  }, [battleState.status, battleState.currentTurnIndex]);

  const letters = Array.from({ length: cols }, (_, i) => getColumnName(i + 1));


  // Token library ops
  const addCreatedToken = (token: Token) =>
    setCreatedTokens((prev) => [...prev, token]);
  const updateCreatedToken = (token: Token) =>
    setCreatedTokens((prev) =>
      prev.map((t) => (t.id === token.id ? token : t))
    );
  const removeCreatedToken = (tokenId: string) =>
    setCreatedTokens((prev) => prev.filter((t) => t.id !== tokenId));


  // Place & move
  const placeTokenOnBoard = (tokenId: string, col: number, row: number) => {
    const template = createdTokens.find((t) => t.id === tokenId);
    if (!template) return;
    const instance: Token = {
      ...template,
      id: `board_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      position: { col, row },
    };
    setBoardTokens((prev) => [...prev, instance]);
  };

 function resolveCardEntityPosition(
    card: CardEntityInstance,
    tokens: Token[]
  ): Position | null {
    if (card.pivotSettings.pivotType === "Cell-Fix") {
      return card.position;
    }

    if (card.pivotSettings.pivotType === "Trigger-Fix") {
      const trigger = tokens.find(t => t.id === card.triggerId);
      return trigger?.position ?? null;
    }

    if (card.pivotSettings.pivotType === "Token-Fix") {
      const anchor = tokens.find(t => t.id === card.anchorTokenId);
      return anchor?.position ?? null;
    }

    return null;
  }


  function reconcileCardEntityEffects(
    tokens: Token[],
    cards: CardEntityInstance[]
  ): Token[] {
    return tokens.map(token => {
      let updatedToken = { ...token };

      for (const card of cards) {
        // aliados ignoram completamente
        if (updatedToken.team === card.friendlyTeam) continue;

        const pivotPosition = resolveCardEntityPosition(card, tokens);
        if (!pivotPosition) continue;

        const virtualCard = { ...card, position: pivotPosition };

        const isInside  = IsTokenInCardInstanceRange(updatedToken, virtualCard);
        const hasEffect = tokenHasCardEffect(updatedToken, card.id);

        if (isInside && !hasEffect) {
          updatedToken = applyCardEffectToToken(updatedToken, card);
        }

        if (!isInside && hasEffect) {
          updatedToken = removeCardEffectsFromToken(updatedToken, card.id);
        }
      }

      return updatedToken;
    });
  }



  const moveTokenOnBoard = (id: string, col: number, row: number) => {
    const token = boardTokens.find(t => t.id === id);
    if (!token) return;

    if (token.position.col !== col || token.position.row !== row) {
      setMovedThisTurn(prev => ({ ...prev, [id]: true }));
    }

    // 1️⃣ Move o token
    const updatedTokens = boardTokens.map(t =>
      t.id === id ? { ...t, position: { col, row } } : t
    );

    // 2️⃣ Move áreas ancoradas (Trigger-Fix E Token-Fix)
    const updatedCards = cardEntities.map(card => {
      const isTriggerFix =
        card.pivotSettings.pivotType === "Trigger-Fix" &&
        card.triggerId === id;

      const isTokenFix =
        card.pivotSettings.pivotType === "Token-Fix" &&
        card.anchorTokenId === id;

      if (isTriggerFix || isTokenFix) {
        return {
          ...card,
          position: { col, row }
        };
      }

      return card;
    });

    // 3️⃣ Recalcula TODOS os efeitos de área
    const reconciledTokens = reconcileCardEntityEffects(
      updatedTokens,
      updatedCards
    );

    setBoardTokens(reconciledTokens);
    setCardEntities(updatedCards);
  };


  const handleCellClick = (
    letter: string,
    number: number,
    tokenInCell?: Token
  ) => {
    const position = { col: columnToNumber(letter), row: number };
    setSelectedTokenId(tokenInCell?.id || null);
    setSelectedCell(`${letter}${number}`);

    if (isAmbientPivotSelection && armedCard) 
    {
      const pivotType = armedCard.target.pivotSettings?.pivotType;

      // So aceita tokens, se for Token-Fix.
      if (pivotType === "Token-Fix" && !tokenInCell) 
      {
        return; 
      }

      handleAmbientPivotSelection(
        tokenInCell
          ? { type: "token", token: tokenInCell }
          : { type: "cell", position }, letter, number
      );
      return;
    }

  };


  // Start battle
// Start battle
const handleStartBattle = () => {
  const teams = new Set(boardTokens.map((t) => t.team));
  if (teams.size < 2 || boardTokens.length < 2) {
    alert("É necessário ter tokens de times diferentes para iniciar.");
    return;
  }
const initialized = boardTokens
  .map(initializeBattleStats)
  .map(t => ({
    ...t,
    ocassionalAddition: {
      ...(t.ocassionalAddition ?? {}), // <-- primeiro os existentes

      // Agora, garanta os que faltam
      forca: t.ocassionalAddition?.forca ?? 0,
      destreza: t.ocassionalAddition?.destreza ?? 0,
      consistencia: t.ocassionalAddition?.consistencia ?? 0,
      inteligencia: t.ocassionalAddition?.inteligencia ?? 0,
      sabedoria: t.ocassionalAddition?.sabedoria ?? 0,
      carisma: t.ocassionalAddition?.carisma ?? 0,
    }
  })) as Token[];

const attributeTableInit: Record<string, Record<string, number>> = {};

initialized.forEach(t => {
  attributeTableInit[t.id] = {
    forca: 0,
    destreza: 0,
    consistencia: 0,
    inteligencia: 0,
    sabedoria: 0,
    carisma: 0
  };
});

attributeTable.current = attributeTableInit;

  setBoardTokens(initialized);
  const inits: InitiativeData[] = initialized.map((token) => ({
    tokenId: token.id,
    initiative: rollInitiative(
      token.attributes.destreza,
      token.proficiencies.destreza,
      token.attributes.level
    ),
    hasExtraTurn: false,
  }));
  inits.sort((a, b) => b.initiative - a.initiative);
  if (inits[0]) inits[0].hasExtraTurn = true;
  
  const acc: Record<string, number> = {};
  const didActObj: Record<string, boolean> = {};
  const movedObj: Record<string, boolean> = {};
  
  inits.forEach((i, idx) => {
    acc[i.tokenId] = idx === 0 ? 2 : 1;
    didActObj[i.tokenId] = false;
    movedObj[i.tokenId] = false;
  });
  
  Object.keys(acc).forEach((id) => {
    acc[id] = Math.max(1, Math.min(5, acc[id]));
  });
  
  const firstId = inits[0]?.tokenId;
  setBoardTokens((prev) =>
    prev.map((t) =>
      t.id === firstId ? { ...t, startPosition: { ...t.position } } : t
    )
  );
  
  setBoardTokens(prev =>
    prev.map(t => ({
      ...t,
      certaintyDiceRemaining: 2, // 2 por batalha
    }))
  );


  const lastAct: Record<string, boolean> = {};
  const lastMove: Record<string, boolean> = {};
  inits.forEach(i => {
    lastAct[i.tokenId] = false;
    lastMove[i.tokenId] = false;
  });
  setLastTurnActed(lastAct);
  setLastTurnMoved(lastMove);

  hasEnteredFirstTurnRef.current = {};
  
  setBattleState({
    status: "In Battle",
    round: 1,
    turnOrder: inits,
    currentTurnIndex: 0,
    accumulatedActions: acc,
    activeEffects: {},
    actionHistory: [],
  });
  
  setDidActThisTurn(didActObj);
  setMovedThisTurn(movedObj);
};



// Next turn
// Avança para o próximo turno
const handleNextTurn = (isVoluntaryPass: boolean = false) => {
  console.log("-----------------------------------------------------------------------------------------------");
  console.log("➡️ ENTROU NO handleNextTurn");

  // Já está avançando? Evita reentrância
  if (isAdvancingTurnRef.current) {
    console.log("🚫 BLOQUEADO, JÁ ESTÁ AVANÇANDO");
    return;
  }

  // Só funciona em batalha
  if (battleState.status !== "In Battle") {
    console.log("⚠️ NOT IN BATTLE, ABORDANDO");
    return;
  }

  // Não pode avançar com resolução pendente
  if (pendingAttack || isInDefenseResolution || pendingEsquivaRoll != null) {
    console.log("⏸️ Há resolução de ataque/defesa pendente, abortando");
    return;
  }

  const currentIdx     = battleState.currentTurnIndex;
  const currentTokenId = battleState.turnOrder[currentIdx]?.tokenId;

  reduceTimeToRecharge(currentTokenId);

  // battleState.accumulatedActions[ battleState.turnOrder[battleState.currentTurnIndex]?.tokenId;] ?? 1
  
  if (!currentTokenId) {
    console.log("⚠️ Sem tokenId atual, abortando");
    return;
  }

  const tokenName = boardTokens.find(t => t.id === currentTokenId)?.name ?? "Desconhecido";
  console.log("🧭 FINALIZANDO TURNO DE:", tokenName);

  // Se não é passe voluntário e ainda há ações, não pode auto-passar
  const currentActions = battleState.accumulatedActions[currentTokenId] ?? 1;
  if (!isVoluntaryPass && currentActions > 0 && !(lastAllUsedResponse[currentId] ?? false)) 
    {
    console.log("🚫 BLOQUEADO, AINDA RESTAM AÇÕES");
    return;
  }

  console.log("REMAINING EXTRA ACTIONS: ", (remainingExtraActions.current?.extraActions));
  console.log("PEDDING ATACK: ", pendingAttack);
  console.log("PEDDING FREE RESPONSE: ", pendingFreeResponse);
  if(!pendingAttack && !pendingFreeResponse && !((remainingExtraActions.current?.extraActions ?? 0) > 0))
  {
    console.log("ESTÁ ENTRANDO NESSA CONDIÇÂO BIZARRA!");
  }
  // Inicia trava
  isAdvancingTurnRef.current = true;
  console.log("🔐 handleNextTurn INICIADO");

  try {

    const actedNow = !!didActThisTurn[currentTokenId];
    const movedNow = !!movedThisTurn[currentTokenId];

    // Snapshot do turno que está encerrando
    setLastTurnActed(prev => ({ ...prev, [currentTokenId]: actedNow }));
    setLastTurnMoved(prev => ({ ...prev, [currentTokenId]: movedNow }));

    const nextIdx = (currentIdx + 1) % battleState.turnOrder.length;
    const nextTokenId = battleState.turnOrder[nextIdx]?.tokenId;
    decreaseCardEntityDuration(nextTokenId)
    const nextTokenName = boardTokens.find(t => t.id === nextTokenId)?.name ?? "Desconhecido";
    const nextToken = boardTokens.find(t => t.id === nextTokenId);
    console.log(`➡️ AVANÇANDO: idx ${currentIdx} -> ${nextIdx} | Próximo: ${nextTokenName}`);

    // Atualiza estado de batalha: índice, round e aplica efeitos de turno
    setBattleState(prev => {
      // Evita condição de corrida: garante que ainda estamos no mesmo índice
      if (prev.currentTurnIndex !== currentIdx) {
        console.log("⚠️ ESTADO JÁ FOI ATUALIZADO POR OUTRO FLUXO, IGNORANDO ESTA ETAPA.");
        return prev;
      }

      const shouldIncrementRound = nextIdx === 0;
      const newRound = shouldIncrementRound ? prev.round + 1 : prev.round;

      const updated: BattleState = {
        ...prev,
        currentTurnIndex: nextIdx,
        round: newRound,
        // Não mexe em accumulatedActions aqui;
        // o cálculo de ações por entrada de turno ocorre no useEffect dedicado.
      };

      if(nextToken){
        if (!nextToken.tokenEffects || nextToken.tokenEffects.length === 0) {
          console.log(`Token ${nextToken.id} não possui efeitos.`);
        } else {
          console.log(`Efeitos do token '${nextToken.id}':`);
          nextToken.tokenEffects.forEach((e, i) => {
            console.log(
              `#${i + 1} | Tipo: ${e.effectType} | Duração: ${e.duration} | Intensidade: ${e.intensity}`
            );
          });
        }

        applyEffectsCausality(nextToken);
        stepTokenEffect(nextToken);
        
      };
      applyCardEntityEffect()
      return processTurnEffects(updated, boardTokens);
    });

    // Marca a posição inicial do PRÓXIMO token para rastrear movimento dentro do turno
    if (nextTokenId) {
      setDidActThisTurn(prev => ({ ...prev, [nextTokenId]: false }));
      setMovedThisTurn(prev => ({ ...prev, [nextTokenId]: false }));
      setBoardTokens(prev =>
        prev.map(t =>
          t.id === nextTokenId
            ? { ...t, startPosition: { ...t.position } }
            : t
        )
      );
    }

    console.log("✅ handleNextTurn CONCLUÍDO");
  } finally {
    isAdvancingTurnRef.current = false;
    console.log("🔓 LOCK LIBERADO");
  }
};
  // End battle


  const handleEndBattle = () => {
    setBattleState({
      status: "Not in Battle",
      round: 0,
      turnOrder: [],
      currentTurnIndex: 0,
      accumulatedActions: {},
      activeEffects: {},
      actionHistory: [],
    });
    setBoardTokens((prev) =>
      prev.map((t) => ({
        ...t,
        currentLife: undefined,
        maxLife: undefined,
        currentMana: undefined,
        maxMana: undefined,
        startPosition: undefined,
      }))
    );
    // Ao finalizar a batalha:
    setBoardTokens(prev =>
      prev.map(t => {
        const { certaintyDiceRemaining, ...rest } = t as any;
        return rest; // remove o campo de runtime
      })
    );

    setBoardTokens(prev =>
      prev.map(t => ({
        ...t,
        tokenEffects: [] // zera os efeitos
      }))
    );    

  setBoardTokens(prev =>
    prev.map(t => ({
      ...t,
      ocassionalAddition: {
        forca: 0,
        destreza: 0,
        consistencia: 0,
        inteligencia: 0,
        sabedoria: 0,
        carisma: 0,
      },
    }))
  );

    setPendingAttack(null);
    setMovedThisTurn({});
    // Limpando estados de batalha.
    setFreeActionLock({});
    setTokenParalysis({});
    setLastAllUsedResponse({});
    setPostParalyse(null);
    setPendingFreeResponse(null);
    setIsInDefenseResolution(false);

    remainingExtraActions.current     = null;
    remainingPrevisionAttacks.current = {};
    cardsNotRechargeds.current        = {};
    timeToRechargeCard.current        = {};

    totalActionsReturn.current     = 0;
    hasEnteredFirstTurnRef.current = {}; // ⬅️ Limpar ref
    remainingExtraActions.current  = null; // Reset das ações extras no fim do turno
    maxSelectablePivots.current    = 0;

    setInCardSelection(false);
    setPendingCardResolution(null);
    setTokensInOffensiveCard([]);
    setOffensiveCardScore(null);
    setOffensiveCardTestScore(null);
    setTokensBattlePosition({});
    setOffensivePendingCard(undefined);
    setCardEntities([]);
    setArmedCard(undefined);
    setIsAmbientPivotSelection(false);
    setSelectedPivots([]);
    setPreviewCells(new Set());
  };




  
const handleExecuteAction = (choice: ExecuteChoice) => {
  const current = battleState.turnOrder[battleState.currentTurnIndex];
  if (!current) return;
  const tokenId = current.tokenId;

  const token  = boardTokens.find((t) => t.id === tokenId);
  const target = boardTokens.find((t) => t.id === choice.targetId);

  if(token && choice.actionType === "card_selection")
  {
    console.log("ENTROU NA OPÇÂO DE SELEÇÂO DE CARD!")
    setInCardSelection(true);
    setPendingCardResolution(token);
    return;
  }

  if(token && choice.actionType === "mana_recover")
  {

    const usedActions = Math.max(
    1,
    Math.min(choice.usedActions ?? 1, battleState.accumulatedActions[tokenId] ?? 1)
  );
    const recovering = 3*(Math.floor((((token.attributes.level - 10)/4) + 4)/2))
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? { ...t, currentMana: Math.min(t.maxMana ?? 0, (t.currentMana ?? 0) + recovering*usedActions) }
          : t
      )
    );

    const currentActions = battleState.accumulatedActions[tokenId] ?? 1;
    const remainingActions = Math.max(0, currentActions - usedActions);
    setBattleState((prev) => ({
      ...prev,
      accumulatedActions: { ...prev.accumulatedActions, [tokenId]: remainingActions },
    }));
    if(remainingActions <= 0)
    {
      setShouldAdvanceTurn(true);
    }  
    return;
  }


  if (!token || !target) return;

  console.log(">>> ATRIBUTO USADO FOI: ", choice.attribute);

  const isPhysicalAttack = ["forca", "destreza"].includes(choice.attribute);
  const attackType = isPhysicalAttack ? "fisico" : "magico";
  if (!isInAttackRange(token, target, attackType)) {
    const distance = calculateDistance(token, target);
    const maxRange = isPhysicalAttack ? (token.bodytobodyRange || 1) : (token.magicalRange || 6);
    console.warn(
      `${token.name} está fora do alcance para atacar ${target.name}. ` +
        `Distância: ${distance}, Alcance máximo: ${maxRange}`
    );
    return;
  }

  // 2) Saneamento de custos (mesma lógica)
  const usedMana = Math.min(choice.usedMana ?? 0, token.currentMana ?? 0);
  const usedActions = Math.max(
    1,
    Math.min(choice.usedActions ?? 1, battleState.accumulatedActions[tokenId] ?? 1)
  );
  const wasCertainty = !!choice.usedCertaintyDie;

  // 3) Bônus de proficiência (mesma fórmula usada antes)
  const proficiencyBonus = token.proficiencies[choice.attribute]
    ? Math.ceil((token.attributes.level - 10) / 4 + 4)
    : 0;

  

  const elementalPos     = (choice.attribute === "forca" && target.tokenPrimaryDisvantege === token.tokenPrimaryElement && usedMana > 0) ? 2 * (choice.pos ?? 1) : choice.pos ?? 1;
  const attrPos = searchTokenPosition(token.id, choice.attribute);
  const finalPos = (a:number , b: number) => {
    if(a + b === 3)
    {
      return 2;
    }
    else if (a + b === 1)
    {
      return 0.5;
    }
    else if(a + b === 1.5)
    {
      return 0.5;
    }
    else if(a + b === 2)
    {
      return 1;
    }
    else if(a + b === 4)
    {
      return 2;
    }
    else if(a + b === 2.5)
    {
      return 1;
    }
    else if(a + b > 4)
    {
      return 2;
    }
    else
    {
      return 1;
    }
  }
  // 2, 1, 0.5


  const params = {
    tokenId: tokenId,
    Q: usedActions,
    P: finalPos(elementalPos, attrPos),
    A: token.attributes[choice.attribute],
    PF: proficiencyBonus,
    O: token.ocassionalAddition[choice.attribute],
    N:
      choice.attribute === "forca" || choice.attribute === "sabedoria"
        ? 0
        : token.proficiencies[choice.attribute]
        ? 1
        : 0,
    L: token.attributes.level,
    M: usedMana,
    certainty: wasCertainty,
    attribute: choice.attribute,
  };

  // 5) Rolagem base
  const baseRoll = calculateActionRoll(params) as RollResult;

  // 6) Calcula ações restantes (mantém logs/estado)
  setDidActThisTurn((prev) => ({ ...prev, [tokenId]: true }));
  const currentActions = battleState.accumulatedActions[tokenId] ?? 1;
  const remainingActions = Math.max(0, currentActions - usedActions);
  setBattleState((prev) => ({
    ...prev,
    accumulatedActions: { ...prev.accumulatedActions, [tokenId]: remainingActions },
  }));


  // 7) Dado Certo (MULT igual ao antigo)
  const MULT = 4;

  // Extrai d20s se existir rawRolls, para estimar mods por dado
  const raw = Array.isArray((baseRoll as any).rawRolls)
    ? ((baseRoll as any).rawRolls as number[])
    : [];
  const somaD20sBase =
    raw.length >= usedActions
      ? raw.slice(0, usedActions).reduce((a, b) => a + b, 0)
      : raw.length > 0
      ? raw.reduce((a, b) => a + b, 0)
      : usedActions * 10;

  const totalBase = baseRoll.total;
  const modsTotaisAproximados = totalBase - somaD20sBase;
  const modsPorDado = usedActions > 0 ? modsTotaisAproximados / usedActions : 0;

  let displayRoll: RollResult = baseRoll;
  let attackTotalForHistory = baseRoll.total;
  let rawDamage = baseRoll.total;

  if (wasCertainty) {
    const forcedRaw = Array.from({ length: usedActions }, () => 20);
    const critTotalPorDado = MULT * (20 + modsPorDado);
    const critTotal = Math.round(critTotalPorDado * usedActions);

    displayRoll = {
      ...baseRoll,
      rawRolls: forcedRaw,
      total: critTotal,
    };

    attackTotalForHistory = critTotal;
    rawDamage = critTotal;

    // Consome 1 carga de Dado Certo do atacante
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? { ...t, certaintyDiceRemaining: Math.max(0, (t.certaintyDiceRemaining ?? 0) - 1) }
          : t
      )
    );
  }

  // 8) Atualiza histórico
  if(baseRoll.rawRolls[0] === 1)
  {
    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: choice.attribute,
          type: `${choice.type} | FALHA CRÍTICA!`,
          rollResult: displayRoll,
          attackerId: tokenId,
          targetId: choice.targetId,
          round: prev.round,
        } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
      ],
    }));
  }
  else
  {
    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: choice.attribute,
          type: wasCertainty ? `${choice.type} | DADO CERTO` : choice.type,
          rollResult: displayRoll,
          attackerId: tokenId,
          targetId: choice.targetId,
          round: prev.round,
        } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
      ],
    }));
  }


  // 9) Desconta mana do atacante somente após os registros (mantém ordem da função antiga)
  if (usedMana > 0) 
  {
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedMana) }
          : t
      )
    );
  }

  // 10) Agenda reações com o dano “travado” (fora de qualquer if de mana)
  const defenderParalysis = getParalysis(choice.targetId);
  if(defenderParalysis !== "none")
  {
    console.log("ESTADO DE PARALISIA DE UM TOKEN ESTÁ COMO: ", defenderParalysis);
  }

  // Lock de ação livre (sem reação) — consome se existir
  const lockKey = `${tokenId}->${choice.targetId}`;
  const hasLock = !!freeActionLock[lockKey];
  if (hasLock) {
    setFreeActionLock((prev) => {
      const cp = { ...prev };
      delete cp[lockKey];
      return cp;
    });
  }

  // Permissão por Paralisia/Paralisia Rápida
  const reactionPermittedByParalysis = canDefenderReact(usedMana, defenderParalysis);
  const isReactionAllowed = hasLock ? false : reactionPermittedByParalysis;

  // Apenas se permitido, ofereça Destreza/Consistência
  const reactions: PendingReaction[] = isReactionAllowed
    ? [
        { type: "destreza", targetToken: target },
        { type: "consistencia", targetToken: target },
      ]
    : [];

  
  const elementUsed = usedMana > 0 ? token.tokenPrimaryElement ?? "neutro": "neutro"
  setPendingAttack({
    attackerId: tokenId,
    targetId: choice.targetId,
    rawDamage, // já crítico se Dado Certo
    attackRoll: attackTotalForHistory,
    usedMana: usedMana,
    attackAttribute: choice.attribute, // 'forca' | 'destreza' | ...
    pendingReactions: reactions,
    isReactionAllowed,
    isFreeAttack: hasLock || false,
    usedActions: usedActions,
    atackElement: elementUsed
  });

  // 11) Se não pode reagir, aplica dano e trata Paralisia já neste passo
  console.log("> VALOR DE REACTION ALLOWED: ", isReactionAllowed);
  if (!isReactionAllowed) {
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === choice.targetId
          ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - rawDamage) }
          : t
      )
    );

    const currentParalysis = getParalysis(choice.targetId);
    const nextState = nextParalysisAfterHit(currentParalysis, usedMana, (remainingExtraActions.current?.extraActions ?? 0));
    if (nextState !== currentParalysis) {
      grantFreeActionNoReaction(currentId, choice.targetId, nextState, 1)
    }

    setPendingAttack(null);
    setPendingEsquivaRoll(null);
    setIsInDefenseResolution(false);
    return;
  }

  // 12) Caso possa reagir, não faz mais nada aqui — o ReactionPrompt será exibido pelo JSX
};

// Reação do defensor: Defesa (consistência) ou Esquiva (destreza)
// Observações:
// - Se usedCertaintyDie = true: imunidade total imediata (encerra o ataque), apenas exibindo rolagem "travada" no histórico.
// - Se destreza (esquiva) sem Dado Certo: inicia fluxo de resolução binária (handleDefenseResolution).
// - Se consistência sem Dado Certo: reduz dano conforme rolagem e aplica dano restante.
const handleReaction = (
  reactionType: "consistencia" | "destreza" | "inteligencia" | "sabedoria",
  usedMana: number,
  usedActions: number,
  roll: RollResult,
  usedCertaintyDie: boolean
) => {
  if (!pendingAttack) return;

  const attackerId = pendingAttack.attackerId;
  const defenderId = pendingAttack.targetId;

  const attackerToken = boardTokens.find(t => t.id === attackerId);
  const defenderToken = boardTokens.find(t => t.id === defenderId);
  
  const typeDiretionalAction = pendingAttack.attackAttribute; // Captura qual o tipo de ação ofensiva que está vindo.

  const defender = boardTokens.find((t) => t.id === defenderId);
  if (!defender) return;

  console.log("⚠️ ENTROU EM HANDLE REACTION DO OUTRO TOKEN");

  // Saneamento de custos do defensor
  const availableActionsDef = battleState.accumulatedActions[defenderId] ?? 1;
  const usedActionsClamped = Math.max(1, Math.min(usedActions ?? 1, availableActionsDef));
  const usedManaClamped = Math.min(usedMana ?? 0, defender.currentMana ?? 0);

  // Consome mana do defensor (se houver)
  if (usedManaClamped > 0) {
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === defenderId
          ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedManaClamped) }
          : t
      )
    );
  }

  // Marca que o defensor agiu
  setDidActThisTurn((prev) => ({ ...prev, [defenderId]: true }));

  // Atualiza ações do defensor (TA padrão: gastar exatamente usedActionsClamped)
  const currentActionsDef = battleState.accumulatedActions[defenderId] ?? 1;
  const remainingActionsDef = Math.max(0, currentActionsDef - usedActionsClamped);
  setBattleState((prev) => ({
    ...prev,
    accumulatedActions: {
      ...prev.accumulatedActions,
      [defenderId]: remainingActionsDef,
    },
  }));

  // Caso especial: Dado Certo na reação → imunidade imediata
  if (usedCertaintyDie) 
  {
    console.log("🟣 ENTROU NO USO DO DADO CERTO");

    // Consome 1 carga de Dado Certo do defensor
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === defenderId
          ? {
              ...t,
              certaintyDiceRemaining: Math.max(0, (t.certaintyDiceRemaining ?? 0) - 1),
            }
          : t
      )
    );

    // Apenas para exibição no histórico: replicar a mesma estética de "dados travados"
    // Força Q dados a 20 e monta total crítico visual.
    const Q = usedActionsClamped;
    const MULT = 4;

    // Heurística para separar mods do roll do defensor, se necessário
    const raw = Array.isArray((roll as any).rawRolls)
      ? ((roll as any).rawRolls as number[])
      : [];
    const somaD20sBase =
      raw.length >= Q
        ? raw.slice(0, Q).reduce((a, b) => a + b, 0)
        : raw.length > 0
        ? raw.reduce((a, b) => a + b, 0)
        : Q * 10; // aproximação (apenas para extrair mods)
    const totalBase = roll.total;
    const modsTotaisAproximados = totalBase - somaD20sBase;
    const modsPorDado = Q > 0 ? modsTotaisAproximados / Q : 0;

    const forcedRaw = Array.from({ length: Q }, () => 20);
    const critTotalPorDado = MULT * (20 + modsPorDado);
    const critTotal = Math.round(critTotalPorDado * Q);

    const displayRoll: RollResult = {
      ...roll,
      rawRolls: forcedRaw,
      total: critTotal,
    };

    // Histórico da reação com Dado Certo
    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: reactionType,
          type:
            reactionType === "destreza"
              ? "Reação - Esquiva (Dado Certo)"
              : "Reação - Defesa (Dado Certo)",
          rollResult: displayRoll,
          attackerId: defenderId,
          targetId: attackerId,
          round: prev.round,
        } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
      ],
    }));

    // Encerra o ataque atual imediatamente (imunidade total)
    setPendingEsquivaRoll(null);
    setIsInDefenseResolution(false);
    setPendingAttack(null);

    // Avança o turno do atacante se ele já não tiver ações
    const attackerActions = battleState.accumulatedActions[attackerId] ?? 1;
    console.log("ATACCKER ID: ", attackerActions);
    if (attackerActions <= 0) setShouldAdvanceTurn(true);

    return;
  }

  if(reactionType === "inteligencia" && pendingAttack.attackAttribute === "inteligencia")
  {
    if(!pendingAttack) return;

    if(pendingAttack.attackRoll > roll.total)
    {
      defineRemainingPrevisionAttacks(attackerId, defenderId, 1);
    }

    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: "inteligencia",
          type: "Reação - Prever",
          rollResult: roll,
          attackerId: defenderId,
          targetId: attackerId,
          round: prev.round,
        } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
      ],
    }));    

    setPendingAttack(null);
    setPendingEsquivaRoll(null);
    setIsInDefenseResolution(false);

    const attackerActions = battleState.accumulatedActions[attackerId] ?? 1;
    console.log("ATACCKER ID: ", attackerActions);
    if (attackerActions <= 0) setShouldAdvanceTurn(true);

    return;    
  }

  if(reactionType === "sabedoria" && pendingAttack.attackAttribute === "sabedoria")
  {
    if(roll.total > pendingAttack.attackRoll)
    {
      setBattleState((prev) => ({
        ...prev,
        accumulatedActions: { ...prev.accumulatedActions, [defenderId]:  Math.min(5, battleState.accumulatedActions[defenderId] + battleState.accumulatedActions[attackerId])},
      }));
      setBattleState((prev) => ({
        ...prev,
        accumulatedActions: { ...prev.accumulatedActions, [attackerId]:  1},
      }));
      const token = boardTokens.find(t => t.id === defenderId);
      const targetToken = boardTokens.find(t => t.id === attackerId);

      if (!token || !targetToken) {
        console.warn("Token ou targetToken não encontrado");
        return; 
      }
    
      if(isInAttackRange(token, targetToken, 'fisico'))
      {
        grantFreeActionNoReaction(defenderId, attackerId, "paralisia", 1);
      }
      
    }
    else if(roll.total < pendingAttack.attackRoll)
    {
      setBattleState((prev) => ({
        ...prev,
        accumulatedActions: { ...prev.accumulatedActions, [attackerId]:  Math.min(5, battleState.accumulatedActions[defenderId] + battleState.accumulatedActions[attackerId])},
      }));
      setBattleState((prev) => ({
        ...prev,
        accumulatedActions: { ...prev.accumulatedActions, [defenderId]:  1},
      }));

      const token = boardTokens.find(t => t.id === attackerId);
      const targetToken = boardTokens.find(t => t.id === defenderId);

      if (!token || !targetToken) {
        console.warn("Token ou targetToken não encontrado");
        return; // interrompe para evitar erro
      }
    
      if(isInAttackRange(token, targetToken, 'fisico'))
      {
        grantFreeActionNoReaction(attackerId, defenderId, "paralisia", 1);
      }      
    }
    
    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: "sabedoria",
          type: "Reação - Desnortear",
          rollResult: roll,
          attackerId: defenderId,
          targetId: attackerId,
          round: prev.round,
        } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
      ],
    }));

    setPendingAttack(null);
    setPendingEsquivaRoll(null);
    setIsInDefenseResolution(false);

    const attackerActions = battleState.accumulatedActions[attackerId] ?? 1;
    console.log("ATACCKER ID: ", attackerActions);
    if (attackerActions <= 0) setShouldAdvanceTurn(true);

    return;    
  }

  if(reactionType === "destreza" && pendingAttack.attackAttribute === "destreza")
  {
    if(!pendingAttack) return;

    if(roll.total > pendingAttack.attackRoll)
    {
      grantFreeActionNoReaction(defenderId, attackerId, "paralisia", 1);
    }
    else if(roll.total < pendingAttack.attackRoll)
    {
      grantFreeActionNoReaction(attackerId, defenderId, "paralisia", 3);
    }
    
    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: "destreza",
          type: "Reação - Surpreender",
          rollResult: roll,
          attackerId: defenderId,
          targetId: attackerId,
          round: prev.round,
        } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
      ],
    }));

    setPendingAttack(null);
    setPendingEsquivaRoll(null);
    setIsInDefenseResolution(false);
  }
  else if (reactionType === "destreza") {
    // Esquiva binária: guarda rolagem do defensor e vai para resolução com rolagem de definição do atacante
    setPendingEsquivaRoll(roll);

    setPrevReaction(prev => ({
      ...prev,
      [defenderId]: "destreza"
    }));
    
    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: "destreza",
          type: "Reação - Esquiva",
          rollResult: roll,
          attackerId: defenderId,
          targetId: attackerId,
          round: prev.round,
        } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
      ],
    }));

    // Ativa UI de resolução (definição do atacante)
    setIsInDefenseResolution(true);
    return;
  }

  // Defesa por consistência: reduz o dano do ataque atual e aplica restante
  if (reactionType === "consistencia") {

 
  if (pendingAttack && pendingAttack.attackAttribute === 'forca' && roll.total > pendingAttack.attackRoll) 
  {
    console.log("⚠️ TOKEN SETADO COMO 'NÃO PODE REAGIR'");
    grantFreeActionNoReaction(defenderId, attackerId, "paralisia",1);
  }
    if (!pendingAttack) return;

        setPrevReaction(prev => ({
          ...prev,
          [defenderId]: "consistencia"
        }));

    const reduction = Math.max(0, roll.total);
    const mitigatedRoll = Math.max(0, pendingAttack.attackRoll - reduction);
    const finalDamage = Math.max(0, Math.min(pendingAttack.rawDamage, mitigatedRoll));

    // Histórico da defesa
    setBattleState((prev) => ({
      ...prev,
      actionHistory: [
        ...prev.actionHistory,
        {
          attribute: "consistencia",
          type: "Reação - Defesa",
          rollResult: roll,
          attackerId: defenderId,
          targetId: attackerId,
          round: prev.round,
        } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
      ],
    }));

    // Aplica dano restante no defensor
    if (finalDamage > 0) 
    {


      const intesityCalculus = Math.ceil(((attackerToken?.attributes.level ?? 1) - 10)/4 + 4);

      if(defenderToken) applyTokenEffect(defenderToken, pendingAttack.atackElement,elementToEffect[pendingAttack.atackElement],8, intesityCalculus, "InTurn");

      setBoardTokens((prev) =>
        prev.map((t) =>
          t.id === defenderId
            ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - finalDamage) }
            : t
        )
      );

      if(pendingAttack.usedMana > 0)
      {
        grantFreeActionNoReaction(attackerId, defenderId, "paralisia_rapida",1);
      }
    }

    // Limpeza do ataque corrente
    setPendingAttack(null);
    setPendingEsquivaRoll(null);
    setIsInDefenseResolution(false);

    // Avança turno do atacante se sem ações
    const attackerActions = battleState.accumulatedActions[attackerId] ?? 1;
    const isDefensesEqualAtack = pendingAttack.rawDamage === reduction; 
    if (attackerActions <= 0 && (remainingExtraActions.current?.extraActions ?? 0) <= 0 &&(isDefensesEqualAtack || pendingAttack.usedMana === 0))
    {
      setShouldAdvanceTurn(true);
    }

    return;
  }
};

const handleExecuteResponseAction = (attackerId: string, forcedTargetId: string, choice: ExecuteChoice) => {
  const token = boardTokens.find((t) => t.id === attackerId);
  const target = boardTokens.find((t) => t.id === forcedTargetId);
  if (!token || !target) return;

  
  const coercedChoice = { ...choice, targetId: forcedTargetId };

  
  const isPhysicalAttack = ["forca", "destreza"].includes(coercedChoice.attribute);
  const attackType = isPhysicalAttack ? "fisico" : "magico";
  if (!isInAttackRange(token, target, attackType)) return;

  // 2) Saneamento
  const usedMana = Math.min(coercedChoice.usedMana ?? 0, token.currentMana ?? 0);
  const usedActions = Math.max(1, Math.min(coercedChoice.usedActions ?? 1, battleState.accumulatedActions[attackerId] ?? 1));
  const wasCertainty = !!coercedChoice.usedCertaintyDie;

  // 3) Proficiência
  const proficiencyBonus = token.proficiencies[coercedChoice.attribute]
    ? Math.ceil((token.attributes.level - 10) / 4 + 4)
    : 0;

  
  const elementalPos = (choice.attribute === "forca" && target.tokenPrimaryDisvantege === token.tokenPrimaryElement && usedMana > 0) ? 2 * (prevReaction[attackerId] === "destreza" ? 2 : 1) : prevReaction[attackerId] === "destreza" ? 2 : 1;
  const attrPos = searchTokenPosition(token.id, choice.attribute)
  const finalPos = (a:number , b: number) => {
    if(a + b === 3)
    {
      return 2;
    }
    else if (a + b === 1)
    {
      return 0.5;
    }
    else if(a + b === 1.5)
    {
      return 0.5;
    }
    else if(a + b === 2)
    {
      return 1;
    }
    else if(a + b === 4)
    {
      return 2;
    }
    else if(a + b === 2.5)
    {
      return 1;
    }
    else if(a + b > 4)
    {
      return 2;
    }
    else
    {
      return 1;
    }
  }
  const params = {
    tokenId: attackerId,
    Q: usedActions,
    P: finalPos(elementalPos, attrPos),
    A: token.attributes[coercedChoice.attribute],
    PF: proficiencyBonus,
    O: token.ocassionalAddition[choice.attribute],
    N:
      coercedChoice.attribute === "forca" || coercedChoice.attribute === "sabedoria"
        ? 0
        : token.proficiencies[coercedChoice.attribute]
        ? 1
        : 0,
    L: token.attributes.level,
    M: usedMana,
    certainty: wasCertainty,
    attribute: coercedChoice.attribute,
  };

  const baseRoll = calculateActionRoll(params) as RollResult;

  const currentActions = battleState.accumulatedActions[attackerId] ?? 1;
  const remainingActions = Math.max(0, (currentActions) - usedActions);

  setBattleState((prev) => ({
    ...prev,
    accumulatedActions: { ...prev.accumulatedActions, [attackerId]: remainingActions },
  }));

  
  const otherCurrentActions = (battleState.accumulatedActions[attackerId] ?? 0) - usedActions;
  console.log("AÇÕES ACUMULADAS: ", (battleState.accumulatedActions[attackerId] ?? 0) - usedActions);
  remainingExtraActions.current = {attackerId: attackerId, extraActions: Math.max(0, otherCurrentActions > 0 ? (remainingExtraActions.current?.extraActions ?? 1) - 1: 0)};
  console.log("REMAINING EXTRA ACTIONS: ", (remainingExtraActions.current?.extraActions));

  // 6) Dado Certo: mesmo tratamento do handleExecuteAction
  const raw = Array.isArray((baseRoll as any).rawRolls) ? ((baseRoll as any).rawRolls as number[]) : [];
  const somaD20sBase = raw.length >= usedActions
    ? raw.slice(0, usedActions).reduce((a, b) => a + b, 0)
    : raw.length > 0 ? raw.reduce((a, b) => a + b, 0) : usedActions * 10;
  const totalBase = baseRoll.total;
  const modsTotaisAproximados = totalBase - somaD20sBase;
  const modsPorDado = usedActions > 0 ? modsTotaisAproximados / usedActions : 0;

  let displayRoll: RollResult = baseRoll;
  let attackTotalForHistory = baseRoll.total;
  let rawDamage = baseRoll.total;

  if (wasCertainty) {
    const forcedRaw = Array.from({ length: usedActions }, () => 20);
    const MULT = 4;
    const critTotalPorDado = MULT * (20 + modsPorDado);
    const critTotal = Math.round(critTotalPorDado * usedActions);
    displayRoll = { ...baseRoll, rawRolls: forcedRaw, total: critTotal };
    attackTotalForHistory = critTotal;
    rawDamage = critTotal;

    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === attackerId ? { ...t, certaintyDiceRemaining: Math.max(0, (t.certaintyDiceRemaining ?? 0) - 1) } : t
      )
    );
  }

  // 7) Histórico
  setBattleState((prev) => ({
    ...prev,
    actionHistory: [
      ...prev.actionHistory,
      {
        attribute: coercedChoice.attribute,
        type: wasCertainty ? `${coercedChoice.type} (Dado Certo)` : coercedChoice.type,
        rollResult: displayRoll,
        attackerId,
        targetId: forcedTargetId,
        round: prev.round,
      } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
    ],
  }));

  // 8) Desconta mana do responder
  if (usedMana > 0) {
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === attackerId ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedMana) } : t
      )
    );
  }

  // 9) Consumir lock e bloquear reação
  const lockKey = `${attackerId}->${forcedTargetId}`;
  const hasLock = !!freeActionLock[lockKey];
  if (hasLock) {
    setFreeActionLock((prev) => {
      const cp = { ...prev };
      delete cp[lockKey];
      return cp;
    });
  }

  const defenderParalysis = getParalysis(forcedTargetId);
  const reactionPermittedByParalysis = canDefenderReact(usedMana, defenderParalysis);
  const isReactionAllowed = reactionPermittedByParalysis;

  // TIPAGEM EXPLÍCITA AQUI
  let reactions: PendingReaction[] = [];
  if (isReactionAllowed) {
    reactions = [
      { type: "destreza" as const,     targetToken: target },
      { type: "consistencia" as const, targetToken: target },
    ];
  }

  const elementUsed = usedMana > 0 ? token.tokenPrimaryElement ?? "neutro" : "neutro";
  setPendingAttack({
    attackerId,
    targetId: forcedTargetId,
    rawDamage,
    attackRoll: attackTotalForHistory,
    usedMana,
    attackAttribute: coercedChoice.attribute,
    pendingReactions: reactions,
    isReactionAllowed,
    isFreeAttack: hasLock || false,
    usedActions: usedActions,
    atackElement: elementUsed
  });




  const currentParalysis = getParalysis(forcedTargetId);
  const nextState = nextParalysisAfterHit(currentParalysis, usedMana, (remainingExtraActions.current.extraActions ?? 0));
  console.log("QUAL PRÓXIMO ESTADO DE PARALISIA?: ", nextState);
  console.log("CALCULANDO ESSE MALDITO REMAINING ACTIONS: ", remainingExtraActions.current.extraActions);
  console.log("QUANTO QUE TÁ O BENDITO ACCUMULATED ACTIONS HEIN?: ", battleState.accumulatedActions[attackerId]);

  if(nextState === "paralisia_rapida" && (remainingExtraActions.current.extraActions ?? 0) <= 0)
  {
    grantFreeActionNoReaction(attackerId, forcedTargetId, nextState, 1);
  }


  if (!isReactionAllowed) {
    // Aplica dano direto + progressão de paralisia
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === forcedTargetId ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - rawDamage) } : t
      )
    );

    if(rawDamage > 0)
    {

      const intesityCalculus = Math.ceil(((token?.attributes.level ?? 1) - 10)/4 + 4);      
      if(target && usedMana > 0) applyTokenEffect(target, token.tokenPrimaryElement ?? "neutro", elementToEffect[token.tokenPrimaryElement ?? "neutro"],8, intesityCalculus, "InTurn");

    }

    if (nextState !== currentParalysis) {
      setParalysis(forcedTargetId, nextState);
    }

    const allowedNextAtackFlag = nextState === "paralisia_rapida" || nextState === "paralisia";
    setPostParalyse({responderId: attackerId, forcedId: forcedTargetId, allowedPostAtack: allowedNextAtackFlag});

    setPendingAttack(null);
    setPendingEsquivaRoll(null);
    setIsInDefenseResolution(false);

    if(!allowedNextAtackFlag)
    {
      setPostParalyse(null);
      setParalysis(forcedTargetId, 'none');
    }
    else
    {
      setParalysis(forcedTargetId, nextState);
    }

    const lockKey = `${attackerId}->${forcedTargetId}`;
    const hasLock = !!freeActionLock[lockKey];
    if (hasLock) {
      setFreeActionLock((prev) => {
        const cp = { ...prev };
        delete cp[lockKey];
        return cp;
      });
    }

    if((remainingExtraActions.current.extraActions ?? 0) <= 0)
    {
      console.log("> ENTROU NA FORÇAGEM DE PASSAR O TURNO");
      setLastAllUsedResponse(prev => ({
        ...prev,
        [attackerId]:true
      }));
      setShouldAdvanceTurn(true);
      setPendingFreeResponse(null);
    }
    else if(battleState.accumulatedActions[forcedTargetId] === 0 && nextState === 'none')
    {
      console.error("NÂO ERA PARA ESTAR ENTRANDO AQUI, ESTÁ?");
      setShouldAdvanceTurn(true);
      setPendingFreeResponse(null);
    }

    return;
  }
  else
  { 
    console.warn("ENTROU AQUI!");
    remainingExtraActions.current = null;
    setPendingFreeResponse(null);
    setParalysis(forcedTargetId, "none");
  }



  // Se reação é permitida, o ReactionPrompt cuidará da sequência normal.
};


/// Resolução da defesa por Destreza (Esquiva) com TA-1 aplicado ao ATACANTE
const handleDefenseResolution = (
  usedActions: number,
  definicaoRoll: RollResult,
  usedMana: number
) => {
  // Precisa haver ataque e rolagem de esquiva armazenada
  if (!pendingAttack || pendingEsquivaRoll == null) return;

  const attackerId = pendingAttack.attackerId;
  const defenderId = pendingAttack.targetId;

  const attackerToken = boardTokens.find(t => t.id === attackerId);
  const defenderToken = boardTokens.find(t => t.id === defenderId);  

  // Leitura das rolagens
  const defenderEsquiva = pendingEsquivaRoll?.total ?? 0;
  const atacanteDefinicao = definicaoRoll.total;

  // TA-1 aplicado ao ATACANTE: consome (usedActions - 1), nunca negativo
  const totalActionsToDecrement = Math.max(0, (usedActions ?? 0) - 1);

  // Leia o saldo real
  const currentActionsAttacker = battleState.accumulatedActions[attackerId] ?? 0;
  const remainingActionsAttacker = Math.max(
    0,
    currentActionsAttacker - totalActionsToDecrement
  );

  // Marque o atacante como tendo agido
  setDidActThisTurn((prev) => ({ ...prev, [attackerId]: true }));

  // Desconta mana do atacante usada na definição (validada)
  const attackerMana = boardTokens.find((t) => t.id === attackerId)?.currentMana ?? 0;
  const validatedUsedMana = Math.min(usedMana ?? 0, attackerMana);
  if (validatedUsedMana > 0) {
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === attackerId
          ? {
              ...t,
              currentMana: Math.max(0, (t.currentMana ?? 0) - validatedUsedMana),
            }
          : t
      )
    );
  }

  // Atualize accumulatedActions do atacante apenas se mudou
  if (remainingActionsAttacker !== currentActionsAttacker) {
    setBattleState((prev) => ({
      ...prev,
      accumulatedActions: {
        ...prev.accumulatedActions,
        [attackerId]: remainingActionsAttacker,
      },
    }));
  }

  // Resultado binário: esquiva tem sucesso se a esquiva do defensor for >= definição do atacante
  const esquivaSuccessful = defenderEsquiva >= atacanteDefinicao;
  
  if (esquivaSuccessful) 
  {
    grantFreeActionNoReaction(defenderId, attackerId, "paralisia",1);
  }

  const finalDamage = esquivaSuccessful ? 0 : pendingAttack.rawDamage;

  // Aplica dano no defensor quando houver
  if (finalDamage > 0) 
  {


    const intesityCalculus = Math.ceil(((attackerToken?.attributes.level ?? 1) - 10)/4 + 4);

    if(defenderToken) applyTokenEffect(defenderToken, pendingAttack.atackElement,elementToEffect[pendingAttack.atackElement],8, intesityCalculus, "InTurn");

    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === defenderId
          ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - finalDamage) }
          : t
      )
    );
  }


  if (finalDamage > 0 && pendingAttack) 
  {
    const current = getParalysis(defenderId);
    const nextState = nextParalysisAfterHit(current, pendingAttack.usedMana, (remainingExtraActions.current?.extraActions ?? 0));
    if (nextState !== current) 
    {
      grantFreeActionNoReaction(attackerId, defenderId, nextState,1);
    }
  }

  // Registra histórico da resolução
  setBattleState((prev) => ({
    ...prev,
    actionHistory: [
      ...prev.actionHistory,
      {
        attribute: "destreza",
        type: "Resolução de Esquiva",
        rollResult: definicaoRoll,
        attackerId: pendingAttack.attackerId,
        targetId: pendingAttack.targetId,
        round: prev.round,
      } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
    ],
  }));

  // Limpeza do estado de resolução
  setPendingEsquivaRoll(null);
  setPendingAttack(null);
  setIsInDefenseResolution(false);

};

const treatTarget = (
  triggerToken: Token,
  triggerTokenId: string,
  target: Target,
  card: Card
) => {

  const tokenProficiency = Math.ceil((triggerToken.attributes.level - 10)/4 + 4)

  if(!target)
  {
    return 0;
  }

  const type              = target.type;
  const waitToApplyEffect = (card.causalityType === "Offensive") ? true : false;


  if (type === "Self" || type === "Target") {
    target.numbersTarget = 1;
  }

  if(type === "Self")
  {
    target.tokenTarget = [triggerToken];
  }

  if (!target.tokenTarget || target.tokenTarget.length === 0) return 0;

  const affectedTargets = target.tokenTarget.slice(
    0,
    target.numbersTarget ?? 1
  );

  const roll      = calculateCardRoll(1, triggerToken, card);
  const rollScore = (sum(roll.rawRolls) + roll.total) * roll.CRI;

  const classAtributeConjure: Record<TokenClass, keyof TokenAttributes> = 
  {
    Guerreiro: "consistencia",
    Mago:      "sabedoria",
    Ladino:    "destreza",
    Bárbaro:   "forca",
    Feitiçeiro:"inteligencia",
  }

  const searchAtributeConjureProficiency: Record<TokenClass, keyof TokenProficiencies> = 
  {
    Guerreiro: "consistencia",
    Mago:      "sabedoria",
    Ladino:    "destreza",
    Bárbaro:   "forca",
    Feitiçeiro:"inteligencia",
  }

  const thisTokenClass = triggerToken.class

  const testParams: Omit<ActionRollParams, "CRI"> =
  {
    tokenId: triggerTokenId,
    Q: card.actionsRequired ?? 1,
    P: 1,
    A: triggerToken.attributes[classAtributeConjure[thisTokenClass]],
    PF: triggerToken.proficiencies[searchAtributeConjureProficiency[thisTokenClass]] ? tokenProficiency : 0,
    O: 0,
    N: (card.manaRequired ?? 0) > 0 ? 1 : 0,
    L: triggerToken.attributes.level,
    M: (card.manaRequired ?? 0) * tokenProficiency,
  }

  const testCardRoll  = calculateActionRoll(testParams);
  const testCardScore = testCardRoll.total;
  
  if ((card.manaRequired ?? 0 ) * tokenProficiency > 0) 
  {
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === triggerToken.id
          ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - (card.manaRequired ?? 0 ) * tokenProficiency) }
          : t
      )
    );
  }  

  setBattleState(prev => {
    const prevActions = prev.accumulatedActions[triggerTokenId] ?? 0;
    const nextActions = Math.max(0, prevActions - (card.actionsRequired ?? 0));

    return {
      ...prev,
      accumulatedActions: {
        ...prev.accumulatedActions,
        [triggerTokenId]: nextActions
      }
    };
  });


  switch (card.causalityType) {
    case "Cure": {
      setBoardTokens((prev) =>
        prev.map((t) =>
          affectedTargets.some((tt) => tt.id === t.id)
            ? {
                ...t,
                currentLife: Math.min(t.maxLife ?? 0,(t.currentLife ?? 0) + rollScore),
              }
            : t
        )
      );
      break;
    }

    case "Offensive":
      setOffensivePendingCard(card);
      setTokensInOffensiveCard(affectedTargets);
      setOffensiveCardScore(rollScore);
      setOffensiveCardTestScore(testCardScore);
      break;
    case "Defensive":
    case "Direct-Damage":

      setBoardTokens(prev => {
        const next = [...prev];

        affectedTargets.forEach(t => {
          card.effectToApply.forEach(e => {
            applyTokenEffect(
              t,
              "neutro",
              e,
              card.duration,
              tokenProficiency,
              "InTurn"
            );
          })
        });

        return next;
      });

      setBoardTokens((prev) =>
        prev.map((t) =>
          affectedTargets.some((tt) => tt.id === t.id)
            ? {
                ...t,
                currentLife: Math.max(0, (t.currentLife ?? 0) - rollScore),
              }
            : t
        )
      );
      break;
    case "Only-Effect-Application": {
      setBoardTokens(prev => {
        const next = [...prev];

        affectedTargets.forEach(t => {
          card.effectToApply.forEach(e => {
            applyTokenEffect(
              t,
              "neutro",
              e,
              card.duration,
              tokenProficiency,
              "InTurn"
            );
          })
        });

        return next;
      });
      break;
    }
    default:
      break;
  }

if(!waitToApplyEffect)
{
  setBoardTokens(prev => {
    // 1) clonar o array
    const next = [...prev];

    // 2) obter tokens afetados A PARTIR DO ESTADO
    // const affectedTokens = getTokensInRadius(next, center, 1);

    // 3) aplicar efeito mutável (igual ao exemplo funcional)
    affectedTargets.forEach(t => {
      card.effectToApply.forEach(e => {
        applyTokenEffect(
          t,
          "neutro",
          e,
          card.duration,
          tokenProficiency,
          "InTurn"
        );
      })
    });

    // 4) retornar o array atualizado UMA VEZ
    return next;
  });
}


return;
};



const handleCardResolution = (currentId: string, target: Target, card: Card) =>
{

  const targetType           = card.target.type;
  const token                = boardTokens.find((t) => t.id === currentId);
  const tokenProficiency     = Math.ceil(((token?.attributes.level ?? 1) - 10)/4 + 4);

  /* Usar card selecionado e aplicar sua recarga. Não inclui gasto de ação nem de mana */
  if((card.recharge as number) > 0)
  {
    if(cardsNotRechargeds.current[currentId] === undefined)
    {
      cardsNotRechargeds.current[currentId] = []
      cardsNotRechargeds.current[currentId].push(card.id)
      formatRechargeCardRecord(currentId, card.id, card.recharge as number);
    }
    else if(!(cardsNotRechargeds.current[currentId].includes(card.id)))
    {
      cardsNotRechargeds.current[currentId].push(card.id)
      formatRechargeCardRecord(currentId, card.id, card.recharge as number);
    }    
  }
  /* * */

  if(pendingCardResolution)
  {
    if(targetType !== "Ambient")
    {
      treatTarget(pendingCardResolution, currentId,target,card);
      setCardAreUsed(true);
    }
    else if(targetType === "Ambient")
    {

      if ((card.manaRequired ?? 0 ) * tokenProficiency > 0) 
      {
        setBoardTokens((prev) =>
          prev.map((t) =>
            t.id === token?.id
              ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - (card.manaRequired ?? 0 ) * tokenProficiency) }
              : t
          )
        );
      }  

      setArmedCard(card);
      setTokenInAmbientPivotSelection(currentId);
      if(card.target.pivotSettings?.pivotType === "Trigger-Fix")
      {
        setIsAmbientPivotSelection(false);
      }
      else
      {
        maxSelectablePivots.current = card.entityQuantity;
        const remainingPivots = maxSelectablePivots.current - selectedPivots.length;
        setRemainingPivots(remainingPivots);
        setIsAmbientPivotSelection(true);
      }

    }

  // Marca que o token AGIU voluntariamente neste turno
  // (independente de gasto de ações)
    setDidActThisTurn((prev) => ({ ...prev, [currentId]: true }));
    setInCardSelection(false);
  }
}

type OffensiveCardResponse = {  
  usedCard: Card,
  rawCardResult: number,
  rawTestResult: number,
  usedMana: number;
  usedActions: number;
  usedCertainDie: boolean;
  defenseRollResult: RollResult;
  token: Token;
  previewAction: boolean;
};


const handleOffensiveCardResponse = ({
  usedCard,
  rawCardResult,
  rawTestResult,
  usedMana,
  usedActions,
  usedCertainDie,
  defenseRollResult,
  token,
  previewAction
}: OffensiveCardResponse, triggerOffensiveTokenId: Token | null) => {
  
  removeTokenFromOffensiveCard(token.id);
  // (sum(roll.rawRolls) + roll.total) * roll.CRI;

  
  const rawDefenseRollResult = (sum(defenseRollResult.rawRolls) + defenseRollResult.total) * defenseRollResult.CRI;
  const testSucess = rawDefenseRollResult >= rawTestResult;
  const triggerTokenProficiency = triggerOffensiveTokenId ? Math.ceil((triggerOffensiveTokenId.attributes.level - 10)/4 + 4) : 0;
  
  if(!usedCertainDie){
    if(usedMana > 0)
    {
      setBoardTokens((prev) =>
        prev.map((t) =>
          t.id === token.id
            ? { ...t, currentMana: Math.max(0, (t.currentMana ?? 0) - usedMana) }
            : t
        )
      );
    }

    const currentActions = battleState.accumulatedActions[token.id] ?? 1;
    const remainingActions = Math.max(0, (currentActions + 1) - usedActions);

    setBattleState((prev) => ({
      ...prev,
      accumulatedActions: { ...prev.accumulatedActions, [token.id]: remainingActions },
    }));

    if(!previewAction)
    {
      if(usedCard.partialOffensive !== undefined && usedCard.partialOffensive === false)
      {
        if(testSucess)
        {
          usedCard.effectToApply.forEach(e => {
            applyTokenEffect(
              token,
              "neutro",
              e,
              usedCard.duration,
              triggerTokenProficiency,
              "InTurn"
            );   
          })
   
            setBoardTokens((prev) =>
            prev.map((t) =>
              t.id === token.id
                ? {
                    ...t,
                    currentLife: Math.max(0, (t.currentLife ?? 0) - Math.floor(rawCardResult/2)),
                  }
                : t
            )
          );   
        }
        else
        {
          usedCard.effectToApply.forEach(e => {
              applyTokenEffect(
                token,
                "neutro",
                e,
                usedCard.duration,
                triggerTokenProficiency,
                "InTurn"
              );
          })
           
            setBoardTokens((prev) =>
            prev.map((t) =>
              t.id === token.id
                ? {
                    ...t,
                    currentLife: Math.max(0, (t.currentLife ?? 0) - rawCardResult),
                  }
                : t
            )
          );         
        }
    
      }
      else if(usedCard.partialOffensive !== undefined && usedCard.partialOffensive === true)
      {
        if(testSucess)
        {
            setBoardTokens((prev) =>
            prev.map((t) =>
              t.id === token.id
                ? {
                    ...t,
                    currentLife: Math.max(0, (t.currentLife ?? 0) - 0),
                  }
                : t
            )
          );   
        }
        else
        {
          usedCard.effectToApply.forEach((e) => {
              applyTokenEffect(
              token,
              "neutro",
              e,
              usedCard.duration,
              triggerTokenProficiency,
              "InTurn"
            ); 
          })
     
            setBoardTokens((prev) =>
            prev.map((t) =>
              t.id === token.id
                ? {
                    ...t,
                    currentLife: Math.max(0, (t.currentLife ?? 0) - rawCardResult),
                  }
                : t
            )
          );         
        }
    
      }
    }
    else
    {
      const formatedKey = formatedPrevisionAttackKey(token.id, triggerOffensiveTokenId?.id!);
      remainingPrevisionAttacks.current[formatedKey] -=  1
    }

  }
  else
  {
    setBoardTokens((prev) =>
      prev.map((t) =>
        t.id === token.id
          ? { ...t, certaintyDiceRemaining: Math.max(0, (t.certaintyDiceRemaining ?? 0) - 1) }
          : t
      )
    );    
  }

  /* REMOVER CARD DA RESOLUÇÃO DE TOKENS OFFENSIVOS */
  if(tokensInOffensiveCard.length <= 0)
  {
    setOffensivePendingCard(undefined);
    setPendingCardResolution(null);
  }
  /* * */

};
/* Handles para seleção de Pivot's */

type BoardClickPayload =
  | {
      type: "cell";
      position: Position;
    }
  | {
      type: "token";
      token: Token;
    };

function addPivot(pivot: PivotCandidate) {
  setSelectedPivots(prev => {
    const next = [...prev, pivot];
    console.info(next.length)
    return next;
  });
}

function registerCardEntities(instances: CardEntityInstance[]) {
  setCardEntities(prev => [...prev, ...instances]);
}


function resolvePivotPosition(pivot: PivotCandidate): Position {
  if (pivot.type === "cell") {
    return pivot.position;
  }

  if (pivot.type === "token") {
    const token = boardTokens.find(t => t.id === pivot.tokenId);
    if (!token) throw new Error("Token pivot não encontrado");
    return token.position;
  }

  if (pivot.type === "trigger") {
    if (!pendingCardResolution) {
      throw new Error("Trigger-Fix sem token disparador");
    }
    return pendingCardResolution.position;
  }

  throw new Error("Pivot inválido");
}


function getCellsInRadius(
  center: Position,
  radius: number,
  gridCells: Position[]
): Position[] {
  return gridCells.filter(cell => {
    const dx = Math.abs(cell.col - center.col);
    const dy = Math.abs(cell.row - center.row);
    return dx <= radius && dy <= radius;
  });
}

/*

function getTokensInRadius(tokens: Token[], center: Token, radius: number) {
  return tokens.filter(t => {
    const dx = Math.abs(t.position.col - center.position.col);
    const dy = Math.abs(t.position.row - center.position.row);
    return dx <= radius && dy <= radius;
  });
}
* */

function getTokensInCardEntityRadius(tokens: Token[], position: Position, range: number, triggerId: string)
{
  return tokens.filter(t => {
    const dx = Math.abs(t.position.col - position.col);
    const dy = Math.abs(t.position.row - position.row);
    return dx <= range && dy <= range && t.id !== triggerId;
  });
}

function calculateAffectedArea(
  pivot: PivotCandidate,
  pivotSettings: Pivot
): Position[] {
  const center = resolvePivotPosition(pivot);

  return getCellsInRadius(center, pivotSettings.range, gridCells);
}


function confirmAmbientPivots() {
  if (!armedCard?.target?.pivotSettings) {
    console.error("Entrou no confirm ambient vazio!")
    return;
  }
  
  if (!armedCard?.target?.pivotSettings) {
    throw new Error("Ambient card sem pivotSettings");
  }

  setBattleState(prev => {
    const prevActions = prev.accumulatedActions[tokenInAmbientPivotSelection] ?? 0;
    const nextActions = Math.max(0, prevActions - (armedCard.actionsRequired ?? 0));

    return {
      ...prev,
      accumulatedActions: {
        ...prev.accumulatedActions,
        [tokenInAmbientPivotSelection]: nextActions
      }
    };
  });

  setCardAreUsed(true);

  const triggerToken = boardTokens.find((t) => t.id === tokenInAmbientPivotSelection);
  const pivotType    = armedCard.target.pivotSettings?.pivotType;

  if (pivotType === "Trigger-Fix") {
    resolveTriggerFixPivot(triggerToken!);
    return;
  }

  const pivotSettings = armedCard.target.pivotSettings;

  const instances: CardEntityInstance[] = selectedPivots.map(pivot => ({
    id: crypto.randomUUID(),
    pivotSettings,
    effectToApply: armedCard.effectToApply,
    triggerId: tokenInAmbientPivotSelection,
    anchorTokenId: pivot.type === "token" ? pivot.tokenId : undefined,
    duration: armedCard.duration ?? Infinity,
    position: resolvePivotPosition(pivot),
    friendlyTeam: triggerToken?.team,
  }));  

  instances.forEach(c => {
    const affectedTokens = getTokensInCardEntityRadius(
      boardTokens,
      c.position,
      c.pivotSettings.range,
      c.triggerId
    );

    affectedTokens.forEach(t => {
      applyCardEntityEffectToToken(c, t);
    });
  });

  registerCardEntities(instances);

  setPreviewCells(new Set());
  setAmbientPivotPhase("confirm");
  setSelectedPivots([]);
  setIsAmbientPivotSelection(false);
  setTokenInAmbientPivotSelection("");
}



const handleAmbientPivotSelection = (
  payload: BoardClickPayload,
  letter: string,
  number: number
) => {
  const pivotType = armedCard!.target.pivotSettings!.pivotType;

  // 🔢 controle de pivots
  const rPivots = Math.max(remainingPivots - 1, 0);
  setRemainingPivots(rPivots);
  setAmbientPivotPhase("preview");

  if(rPivots >= 0 && selectedPivots.length < maxSelectablePivots.current)
  {
    if (pivotType === "Cell-Fix") {
      if (payload.type !== "cell") return;

      const pivot = {
        col: letters.indexOf(letter) + 1,
        row: number,
      };

      const range = armedCard!.target.pivotSettings!.range;
      const cells = getCellsInRadius(pivot, range, gridCells);

      addPreviewCells(cells);

      addPivot({
        type: "cell",
        position: pivot,
      });

      return;
    }

    // =========================
    // 🧲 TOKEN-FIX
    // =========================
    if (pivotType === "Token-Fix") {
      if (payload.type !== "token") return;

      const token = payload.token;

      const range = armedCard!.target.pivotSettings!.range;
      const cells = getCellsInRadius(token.position, range, gridCells);

      addPreviewCells(cells);
      setSelectedCell(null); // não há célula selecionada aqui

      addPivot({
        type: "token",
        tokenId: token.id,
      });

      return;
    }

    if (pivotType === "Trigger-Fix") {
      addPivot({ type: "trigger" });
      return;
    }
  }
};


const previewArea = useMemo(() => {
  if (ambientPivotPhase !== "preview") return [];

  return selectedPivots.map(pivot =>
    calculateAffectedArea(pivot, armedCard!.target.pivotSettings!)
  );
}, [ambientPivotPhase, selectedPivots]);

const maxSelectablePivots = useRef<number>(0);

/* * */
const currentData = battleState.turnOrder[battleState.currentTurnIndex];
const currentId = currentData?.tokenId;
const currentToken = currentId
  ? boardTokens.find((t) => t.id === currentId)
  : undefined;


const cellSize = 40 * zoom;


  return (
    <div className="relative flex w-full min-h-screen bg-gray-900 text-white overflow-x-hidden">
      <div className="relative flex-1 p-6" style={{ maxWidth: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw" }}>
        {/* Controls */}
        <div className="absolute flex items-center gap-4 bg-gray-900 z-20 rounded-md p-2" style={{ top: 6, left: 6 }}>
          <SettingsDropdown
            rows={rows}
            cols={cols}
            onChangeRows={(v) => setRows(Number(v))}
            onChangeCols={(v) => setCols(Number(v))}
            onChangeBackgroundImage={setBackgroundImage}
          />
          <div className="ml-4 font-semibold text-green-400 whitespace-nowrap">
            {selectedCell ? `Célula selecionada: ${selectedCell}` : "Nenhuma célula selecionada"}
          </div>
          <div className="ml-4 font-semibold text-blue-400 whitespace-nowrap">
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>


        {/* BattlePanel */}
        {battleState.status === "In Battle" && (
          <div className="absolute bg-gray-900 z-20 rounded-md" style={{ top: 6, right: 80, width: 250 }}>
            <BattlePanel
              battleState={battleState}
              tokens={boardTokens}
              onStartBattle={handleStartBattle}
              onEndBattle={handleEndBattle}
              onNextTurn={handleNextTurn}
            />
          </div>
        )}


        {/* Grid */}
        <div style={{ paddingTop: 48 }}>
          <div className="flex ml-10 relative" style={{ userSelect: "none" }}>
            {letters.map((l) => (
              <div key={l} style={{ width: cellSize, height: cellSize, position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontWeight: 700, fontSize: 14 * zoom }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
          <div className="flex">
            <div className="flex flex-col select-none">
              {Array.from({ length: rows }, (_, i) => (
                <div key={i} style={{ width: cellSize, height: cellSize, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 * zoom, fontWeight: 700 }}>
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="grid relative overflow-hidden" style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>

              {Array.from({ length: rows }, (_, row) =>
                letters.map((l) => {
                  const coord = `${l}${row + 1}`;
                  const isSel = coord === selectedCell;
                  const tok = boardTokens.find(
                    (t) =>
                      t.position.col === letters.indexOf(l) + 1 &&
                      t.position.row === row + 1
                  );

                  const cardInstances = cardEntities.find((c) =>
                    c.position.col === letters.indexOf(l) + 1 &&
                    c.position.row === row + 1);

                  const effectClasses = tok
                    ? getTokenVisualEffects(tok).classes
                    : [];

                  const effectOverlays = tok
                    ? getTokenVisualEffects(tok).overlays
                    : [];                  
                  const inB = battleState.status === "In Battle";
                  const isCurr = tok?.id === currentId;
                  const isTokSel = tok?.id === selectedTokenId;
                  return (
                    <div
                      key={coord}
                      onClick={() => handleCellClick(l, row + 1, tok)}
                      className={[
                        "border border-gray-700 flex items-center justify-center cursor-pointer transition-colors duration-150 relative",
                        isSel
                          ? "border-green-400 shadow-[0_0_10px_2px_rgba(34,197,94,0.7)]"
                          : "hover:bg-gray-800",
                        previewCells.has(`${letters.indexOf(l) + 1}-${row + 1}`)
                          ? "bg-red-500/30 border-red-400"
                          : "",
                      ].join(" ")}
                      style={{ width: cellSize, height: cellSize }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("tokenId");
                        const fromLib = e.dataTransfer.getData("fromLibrary") === "true";
                        if (fromLib) {
                          placeTokenOnBoard(id, letters.indexOf(l) + 1, row + 1);
                        } else if (id === currentId) {
                          moveTokenOnBoard(id, letters.indexOf(l) + 1, row + 1);
                        }
                      }}
                    >

                      {tok && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          
                          {inB &&
                            tok.currentLife !== undefined &&
                            tok.maxLife !== undefined &&
                            tok.currentMana !== undefined &&
                            tok.maxMana !== undefined && (
                              <StatusBars
                                currentLife={tok.currentLife}
                                maxLife={tok.maxLife}
                                currentMana={tok.currentMana}
                                maxMana={tok.maxMana}
                                teamColor={tok.team}
                              />
                            )}

                          {tok.visualOverlays?.map(o => {
                            console.log("Overlay GIF:", o.gifPath);
                            console.log("Overlay Size: ", o.size);
                            return(
                              <div
                                key={o.id}
                                className={o.type} // "overlay-explosao-area"
                                style={{
                                  position: "absolute",
                                  width: o.size,
                                  height: o.size,
                                  left: "50%",
                                  top: "50%",
                                  transform: "translate(-50%, -50%)",

                                  backgroundImage: `url(${o.gifPath})`,
                                  backgroundSize: "cover",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",

                                  zIndex: 30
                                }}
                              />
                            )
                            })}



                            {effectOverlays.map((ov) => (
                              <div key={ov.id} className={`${ov.className} absolute inset-0 z-20`}></div>
                            ))}                          
                            <img
                              src={tok.imageUrl} 
                              alt={tok.name}
                              className={[
                                "absolute rounded object-cover transition-filter duration-200",
                                ...effectClasses,
                                isCooling && tok.id === selectedTokenId ? "filter grayscale" : "",
                                getParalysis(tok.id) !== "none" ? "animate-white-blink" : "",
                              ].join(" ")}
                              draggable={tok?.id === currentId}
                              onDragStart={(e) => {
                                const isTokenArrested = boardTokens.some(
                                  (t) =>
                                    t.id === tok?.id &&
                                    Array.isArray(t.tokenEffects) &&
                                    t.tokenEffects.some((eff) => eff.effectType === "preso")
                                );

                                if (tok?.id !== currentId || isTokenArrested) return;
                                e.dataTransfer.setData("tokenId", tok.id);
                                e.dataTransfer.setData("fromLibrary", "false");
                              }}
                              style={{
                                width: cellSize * 0.95,
                                height: cellSize * 0.95,
                                zIndex: 2,
                                ...(inB
                                  ? {
                                      boxShadow: isCurr
                                        ? `0 0 15px 4px ${teamGlowColors[tok.team]}, 0 0 25px 6px rgba(255,255,255,0.8)`
                                        : `0 0 10px 3px ${teamGlowColors[tok.team]}`,
                                      border: isCurr ? "2px solid white" : "none",
                                    }
                                  : isTokSel
                                  ? {
                                      boxShadow: "0 0 10px 3px rgba(34,197,94,0.8)",
                                      border: "2px solid #22c55e",
                                    }
                                  : {}),
                              }}
                            />
                        </div>
                      )}

                      {cardInstances && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          width: (cardInstances.pivotSettings.range * 2 + 1) * cellSize,
                          height: (cardInstances.pivotSettings.range * 2 + 1) * cellSize,
                          zIndex: 1,
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <img
                          src={cardInstances.pivotSettings.areaImgUrl}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* OVERLAY DE PREVIEW */}

      </div>

      {/* Renderização do ActionForm de resposta imediata (modal central, sem pular) */}
      {pendingFreeResponse && (remainingExtraActions.current?.extraActions ?? 0) > 0 && (() => {
        const responder = boardTokens.find(t => t.id === pendingFreeResponse.responderId);
        const target = boardTokens.find(t => t.id === pendingFreeResponse.paralyzedId);
        if (!responder || !target) return null;

        // Segurança extra: se por algum motivo range mudou, não renderiza
        const hasPhys = isInAttackRange(responder, target, "fisico");
        const hasMag  = isInAttackRange(responder, target, "magico");
        if (!hasPhys && !hasMag) return null;

        return (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 w-full max-w-md">
              <ActionForm
                token={responder}
                availableActions={battleState.accumulatedActions[responder.id] ?? 1}
                onExecute={(choice) => {
                  handleExecuteResponseAction(responder.id, target.id, choice);
                  setControllEndResponse(false);
                  setControllEndResponse(true);
                }}
                onPass={() => {}}
                possibleTargets={[target]}
                hidePass
                isResponseAttack={(defenderId) => defenderId === target.id}
                restrictedMode={true}
              />
            </div>
          </div>
        );
      })()}

      {/* Sidebar toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          className={`
            fixed top-4 z-50
            p-2 rounded-full
            bg-gray-900 hover:bg-gray-800 text-white
            shadow-lg border border-gray-700
            focus:ring-2 focus:ring-green-400
            transition-[right,background-color,transform] duration-200
            active:scale-95
          `}
          // Colado na borda esquerda da Sidebar quando aberta; no canto direito quando fechada
          style={sidebarOpen ? { right: sidebarWidth + 8 } : { right: 8 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>


      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-gray-900 shadow-lg border-l border-gray-700 transition-transform duration-300 z-40 overflow-auto ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: sidebarWidth }}
      >

      <Sidebar
        tokens={createdTokens}
        tokenBeingEdited={tokenBeingEdited}
        cards={cards}
        addToken={addCreatedToken}
        updateToken={updateCreatedToken}
        onEditToken={handleEditToken}
        onSaveEditedToken={handleSaveEditedToken}
        onCloseEditedToken={setTokenBeingEdited}
        removeToken={removeCreatedToken}
        addCard={addCard}
        removeCard={removeCard}
        items={createdItems}
        addItem={addItem}
        removeItem={removeItem}
        battleHistory={battleState.actionHistory
          .filter((act) => act.round !== undefined)
          .map((act) => {
            const attacker = boardTokens.find((t) => t.id === act.attackerId);
            const target = boardTokens.find((t) => t.id === act.targetId);
            return {
              ...act,
              round: act.round || 1,
              attackerName: attacker?.name || "Desconhecido",
              targetName: target?.name || "Desconhecido",
            };
          }) as (ActionChoice & { round: number; attackerName: string; targetName: string })[]}
        // passe os controles de largura para o Sidebar
        widthPx={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />
      

      </div>


      {/* BattlePanel when not in battle */}
      {battleState.status === "Not in Battle" && (
        <div className="fixed bottom-4 left-4 z-30">
          <BattlePanel
            battleState={battleState}
            tokens={boardTokens}
            onStartBattle={handleStartBattle}
            onEndBattle={handleEndBattle}
            onNextTurn={handleNextTurn}
          />
        </div>
      )}


      {/* ActionForm during battle */}
      {battleState.status === "In Battle" && currentToken && !pendingAttack && !pendingFreeResponse && !inCardSelection && !((remainingExtraActions.current?.extraActions ?? 0) > 0) && tokensInOffensiveCard.length <= 0 && !isAmbientPivotSelection &&(
        <div className="fixed bottom-4 left-4 z-30">
        <ActionForm
          token={currentToken}
          availableActions={battleState.accumulatedActions[currentId] ?? 0}
          onExecute={handleExecuteAction}
          onPass={handleNextTurn}
          possibleTargets={boardTokens.filter((t) => t.id !== currentId)}
          isResponseAttack={(defenderId, usedMana) => {
            const lockKey = `${currentId}->${defenderId}`;
            const hasLock = !!freeActionLock[lockKey];
            const permittedByParalysis = canDefenderReact(usedMana, getParalysis(defenderId));
            return hasLock || !permittedByParalysis;
          }}
          restrictedMode={false}
        />
        </div>
      )}


      {/* ReactionPrompt */}
      {pendingAttack &&
        pendingAttack.isReactionAllowed &&
        pendingAttack.pendingReactions.length > 0 &&
        !pendingEsquivaRoll && (
          <ReactionPrompt
            actor={{
              ...(boardTokens.find((t) => t.id === pendingAttack.targetId) as Token),
              reactionType: pendingAttack.pendingReactions[0].type as "consistencia" | "destreza",
            }}
            availableActions={battleState.accumulatedActions[pendingAttack.targetId] ?? 1}
            availableMana={boardTokens.find((t) => t.id === pendingAttack.targetId)?.currentMana ?? 0}
            certaintyDieCharges={boardTokens.find((t) => t.id === pendingAttack.targetId)?.certaintyDiceRemaining ?? 0}
            diretionalActionType = {pendingAttack.attackAttribute}
            isReactionAllowed={pendingAttack.isReactionAllowed}

            disabledReason={!pendingAttack.isReactionAllowed ? "Reação bloqueada (Paralisia/ação livre)." : undefined}
            prevActions={remainingPrevisionAttacks.current[formatedPrevisionAttackKey(pendingAttack.targetId, pendingAttack.attackerId)]}
            onSkip={() => {
              if (!pendingAttack) return;

              setBoardTokens((prev) =>
                prev.map((t) =>
                  t.id === pendingAttack.targetId
                    ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - pendingAttack.rawDamage) }
                    : t
                )
              );

              // transição Paralisia → Paralisia Rápida (se ataque usou mana)
              const current = getParalysis(pendingAttack.targetId);
              
              const nextState = nextParalysisAfterHit(current, pendingAttack.usedMana, (remainingExtraActions.current?.extraActions ?? 0));
              if (nextState !== current) setParalysis(pendingAttack.targetId, nextState);

              // finalizar fluxo
              setPendingAttack(null);
              setPendingEsquivaRoll(null);
              setIsInDefenseResolution(false);
              setShouldAdvanceTurn(true);
            }}
            onPrev={() => {
              const formatedKey = formatedPrevisionAttackKey(pendingAttack.targetId, pendingAttack.attackerId);

              if(remainingPrevisionAttacks.current[formatedKey] > 0)
              {
                const currentActions = remainingPrevisionAttacks.current[formatedKey]
                remainingPrevisionAttacks.current[formatedKey] = currentActions - 1
                const emptyRoll: RollResult = {
                  rawRolls: [],
                  total: 0,
                  usedMana: 0,
                  CRI: 0,
                };
                setBattleState((prev) => ({
                  ...prev,
                  actionHistory: [
                    ...prev.actionHistory,
                    {
                      attribute: "inteligencia",
                      type: "Ação Prevista",
                      rollResult: emptyRoll,
                      attackerId: pendingAttack.targetId,
                      targetId: pendingAttack.attackerId,
                      round: prev.round,
                    } as ActionChoice & { round: number; attackerId?: string; targetId?: string },
                  ],
                }));   

                setPendingAttack(null);
                setPendingEsquivaRoll(null);
                setIsInDefenseResolution(false);
                setShouldAdvanceTurn(true);                
                return;
              }              
            }}
            onReact={(actorId, reactionType, usedMana, usedActions, usedCertaintyDie, roll) => {
              console.debug(actorId)
              const normalized: RollResult =
                typeof roll === "number"
                  ? { total: roll, rawRolls: [roll], usedMana: 0, CRI: 0 }
                  : (roll ?? { total: 0, rawRolls: [], usedMana: 0, CRI: 0 });

              console.log("🎲 ROLL RESULT:", roll);
              handleReaction(reactionType, usedMana, usedActions, normalized, !!usedCertaintyDie);
            }}
            onCancel={() => {
              if (!pendingAttack) return;
              
              const attackerToken = boardTokens.find(t => t.id === pendingAttack.attackerId);
              const defenderToken = boardTokens.find(t => t.id === pendingAttack.targetId);

              const intesityCalculus = Math.ceil(((attackerToken?.attributes.level ?? 1) - 10)/4 + 4);
           
              if(pendingAttack.attackAttribute === "forca")
              { 

                if(defenderToken) applyTokenEffect(defenderToken, pendingAttack.atackElement,elementToEffect[pendingAttack.atackElement],8, intesityCalculus, "InTurn");

                setBoardTokens((prev) =>
                  prev.map((t) =>
                    t.id === pendingAttack.targetId
                      ? { ...t, currentLife: Math.max(0, (t.currentLife ?? 0) - pendingAttack.rawDamage) }
                      : t
                  )
                );

              }

              if(pendingAttack.attackAttribute === "inteligencia")
              {
                defineRemainingPrevisionAttacks(pendingAttack.attackerId, pendingAttack.targetId, 1);
              }

              const current = getParalysis(pendingAttack.targetId);
              const nextState = nextParalysisAfterHit(current, pendingAttack.usedMana, (remainingExtraActions.current?.extraActions ?? 0));
              if (nextState !== current) setParalysis(pendingAttack.targetId, nextState);

              if(pendingAttack.attackAttribute === "sabedoria")
              {
                setBattleState((prev) => ({
                  ...prev,
                  accumulatedActions: { ...prev.accumulatedActions, [pendingAttack.attackerId]:  Math.min(5, battleState.accumulatedActions[pendingAttack.targetId] + battleState.accumulatedActions[pendingAttack.attackerId])},
                }));
                setBattleState((prev) => ({
                  ...prev,
                  accumulatedActions: { ...prev.accumulatedActions, [pendingAttack.targetId]:  1},
                }));
                grantFreeActionNoReaction(pendingAttack.attackerId, pendingAttack.targetId, "paralisia", 1);                
              }

              if(pendingAttack.attackAttribute === "destreza")
              {
                grantFreeActionNoReaction(pendingAttack.attackerId, pendingAttack.targetId, "paralisia", 3);
              }

              setPendingAttack(null);
              setPendingEsquivaRoll(null);
              setIsInDefenseResolution(false);
              setShouldAdvanceTurn(true);
            }}
          />
      )}

      {/* DefenseResolutionForm */}
      {pendingEsquivaRoll !== null && pendingAttack && (
        <div className="fixed bottom-4 left-4 z-40">
          <DefenseResolutionForm
            attacker={boardTokens.find((t) => t.id === pendingAttack?.attackerId)!}
            defenderName={
              boardTokens.find((t) => t.id === pendingAttack?.targetId)?.name ||
              "Desconhecido"
            }
            reactionResult={pendingEsquivaRoll?.total ?? null}
            availableActions={
              battleState.accumulatedActions[pendingAttack.attackerId] ?? 1
            }
            onResolve={(usedActions, rollResult, usedMana) => {  // ⬅️ receber usedMana
              handleDefenseResolution(usedActions, rollResult, usedMana);
            }}

            onCancel={() => {
              if (pendingAttack) {
                setBoardTokens((prev) =>
                  prev.map((t) =>
                    t.id === pendingAttack.targetId
                      ? {
                          ...t,
                          currentLife: Math.max(
                            0,
                            (t.currentLife ?? 0) - pendingAttack.rawDamage
                          ),
                        }
                      : t
                  )
                );
              }
              setPendingEsquivaRoll(null);
              setPendingAttack(null);
              setShouldAdvanceTurn(true);
            }}
          />
        </div>
      )}

      {/* Card Form */}
      {inCardSelection && (
        <>
          <CardForm
            tokenTrigger={pendingCardResolution as Token}
            target={boardTokens.filter(
              t => t.id !== (pendingCardResolution as Token).id
            )}
            availableActions={
              battleState.accumulatedActions[
                battleState.turnOrder[battleState.currentTurnIndex]?.tokenId
              ] ?? 1
            }
            availableMana={currentToken?.currentMana ?? 0}
            cardTimeToRecharge={(card) => formatRechargeCardRecordReturn((pendingCardResolution as Token).id, card.id)}
            availableCardsIds={cardsNotRechargeds.current[(pendingCardResolution as Token).id]}
            onClose={() => setInCardSelection(false)}
            onConfirm={(card, target) => handleCardResolution(currentId, target as Target, card)}
          />
        </>
      )}
      
      {tokensInOffensiveCard.length > 0 &&
        offensivePendingCard && offensiveCardScore &&
        offensiveCardTestScore &&
        tokensInOffensiveCard.map((defenderToken) => (
          <OffensiveCardResolution
            key={defenderToken.id}

            availableActions ={battleState.accumulatedActions[defenderToken.id] ?? 1}
            availableMana    ={boardTokens.find((t) => t.id === defenderToken.id)?.currentMana ?? 0}
            availableCertainyDie={boardTokens.find(t => t.id === defenderToken.id)?.certaintyDiceRemaining ?? 0}

            card={offensivePendingCard}
            cardResult={offensiveCardScore}
            testResult={offensiveCardTestScore}
            defenderToken={defenderToken}
            defenderTokenPrevActions={remainingPrevisionAttacks.current[formatedPrevisionAttackKey(defenderToken.id, pendingCardResolution!.id)]}
            tokenBattlePosition={(attr) => searchTokenPosition(defenderToken.id, attr)}
            onExecute={(choice) => {
              handleOffensiveCardResponse(choice, pendingCardResolution)
            }}
          />
        ))}

    {isAmbientPivotSelection && armedCard && (
      <div className="fixed inset-0 z-[90] pointer-events-none">
        {/* painel flutuante — ESTE sim recebe clique */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-orange-500 rounded p-3 shadow-lg pointer-events-auto">
          <h3 className="text-sm font-bold text-orange-400">
            Selecionar Pivots ({remainingPivots} restantes)
          </h3>

          <p className="text-xs text-gray-400">
            Clique em{" "}
            {armedCard.target.pivotSettings?.pivotType === "Cell-Fix"
              ? "células"
              : armedCard.target.pivotSettings?.pivotType === "Token-Fix"
              ? "tokens"
              : "si mesmo"}
          </p>

          {ambientPivotPhase === "preview" && (
            <button
              className="mt-2 w-full bg-orange-600 hover:bg-orange-700 text-sm font-semibold rounded p-1"
              onClick={confirmAmbientPivots}
            >
              Confirmar Área
            </button>
          )}
        </div>
      </div>
    )}


    {inventoryOpen && (() => {
      const token = boardTokens.find((t) => t.id === selectedTokenId)
      console.info("Here")
      return(
        <InventoryUI
          token={token!}
          onClose={(t) => setInventoryOpen(t)}
          swap={(i, n) => swapItemInInventory(i, n, token!, setCreatedTokens, setBoardTokens)}
        />
      )
    })()}

    </div>
  );
};
//            availableActions={battleState.accumulatedActions[pendingAttack.targetId] ?? 1}
//            availableMana={boardTokens.find((t) => t.id === pendingAttack.targetId)?.currentMana ?? 0}

export { BoardPage };
export default BoardPage;
