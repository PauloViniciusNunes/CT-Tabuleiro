/* REACT & CORE */
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";

/* COMPONENTS (UI) */
import SettingsDropdown from "../components/ui/SettingsDropdown";
import Sidebar from "../components/ui/Sidebar";
import StatusBars from "../components/ui/StatusBars";
import ActionForm from "../components/ui/ActionForm";
import ReactionPrompt from "../components/ui/ReactionPrompt";
import CinematicDisplayNameUI from "../components/ui/Introduction";
import MapSelect from "../components/ui/MapSelect";
import PresentItem from "../components/ui/PresentItem";
import GenerateMaze from "../components/ui/GenerateMaze";
import DefenseResolutionForm from "../components/ui/DefenseResolutionForm";
import CardForm from "../components/ui/CardForm";
import OffensiveCardResolution from "../components/ui/OffensiveCardResolution";
import InventoryUI from "../components/ui/Inventory";
import SkillPanel from "../components/ui/SkillPannel";
import CreateMapObject from "../components/ui/CreateMapObject";
import BoardToolbox from "../components/ui/BoardToolbox";
import ActiveMechanicsTooltip from "../components/ui/ActiveMechanicsTooltip";
import SpecialResponseForm from "../components/ui/SpecialResponseForm";

/* WEB API */
import { MapaAPI, useMaps } from "../api/modules/maps";
import { TokenAPI, useTokens } from "../api/modules/tokens";
import { ItemAPI, useItems } from "../api/modules/items";
import { CardAPI, useCards } from "../api/modules/cards";
import { TokenInstanceAPI } from "../api/modules/tokenInstances";
import { useBattleState } from "../api/modules/battleStates";
import { TokenInstaceMapper } from "../api/mappers/tokenInstanceMapper";

/* WEB SOCKET */
import { socket } from "../api/socket/socket";

/* SOCKET LISTENERS */
import { TokenInstanceSocketListener } from "../api/listeners/TokenInstanceSocketListener";
import { BattleSocketListener } from "../api/listeners/BattleSocketListener";
import { PendingSocketListener } from "../api/listeners/PendingSocketListener";
import { FrontendSocketListener } from "../api/listeners/FrontendSocketListener";

/* UTILS & BATTLE CALCULATIONS */
import {
  isInAttackRange,
  xpProgressionByLevel,
} from "../utils/battleCalculations";

/* COMBAT SYSTEMS */
import { formatRechargeCardRecordReturn } from "../combat/combatRecharge";
import { formatPrevisionAttackKey } from "../combat/combatPrevisions";

/* GEOMETRY */
import { cellToPosition } from "../geometry/position";

/* INVENTORY LOGIC */
import { haveSpaceInInventory, addItemToInventory } from "../inventory/inventoryCapacity";

/* ENTITIES */
import { generatePairDoor } from "../entities/entitiesPorts";

/* EFFECTS LOGIC */

/* TYPES */
import { type Mapa } from "../types/mapas";
import type { ExecuteChoice } from "../types/executeChoice";
import type { Target } from "../types/target";
import type { MapObject } from "../types/mapObject";
import type { Token } from "../types/token";
import type { Item } from "../types/item";
import { getTokenVisualEffects } from "../types/getTokenVisual";
import type {
  Card,
  OffensiveCardResponse,
  Position
} from "../types/card";
import type {
  BattleState,
  RollResult,
  ActionChoice,
  PendingAttack,
  AllocatedPoints,
  ActiveMechanic,
} from "../types/battle";
import {
  BattleEngineAPI,
  type EquippedInventorySlot,
} from "../api/modules/battleEngine";
import { CampaignAPI } from "../api/modules/campaigns";
import type { Campaign, CampaignMapRouting, User } from "../types/campaign";
import { getLoggedUserId } from "../utils/getLoggedUser";
import { BattleViewRules } from "../api/view/BattleViewRules";
import { generateUUID } from "../utils/generateUUID";
import { formatCellDistance, measureCells } from "../tools/ruler";
import type {
  BoardToolId,
  GridPoint,
  RulerMeasurement,
} from "../types/tools";
import type {
  PendingSpecialResponse,
  SpecialResponseValues,
} from "../types/specialResponse";
import { useFormSessionKey } from "../hooks/useFormSessionKey";


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

interface OnlineCampaignUser {
  id: string;
  name: string;
  color: string;
}

const BASE_CELL_SIZE = 40;
const MIN_BOARD_ZOOM = 0.5;
const MAX_BOARD_ZOOM = 3;
const KEYBOARD_ZOOM_STEP = 0.1;

/* BOARD PAGE MAIN OBJECT */
const BoardPage: React.FC = () => {

  const [introdutionAnimation, setIntroductionAnimation] = useState<boolean>(false);
  const [viewportTransform, setViewportTransform] = useState({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  const { zoom, pan } = viewportTransform;
  const cellSize = BASE_CELL_SIZE;
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const [activeBoardTool, setActiveBoardTool] = useState<BoardToolId | null>(null);
  const [rulerMeasurement, setRulerMeasurement] = useState<RulerMeasurement | null>(null);
  const [isRulerMeasuring, setIsRulerMeasuring] = useState(false);
  const draggedTokenRef = useRef<Token | null>(null);
  /* * */

  const [users, setUsers] = useState<User[]>([])
  const [onlineCampaignUsers, setOnlineCampaignUsers] = useState<OnlineCampaignUser[]>([]);

  const [userId, setUserId] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [mapRouting, setMapRouting] = useState<CampaignMapRouting | null>(null)
  const [pendingSpecialResponse, setPendingSpecialResponse] = useState<PendingSpecialResponse | null>(null);
  const selectedMapIdRef = useRef<string | undefined>(undefined);

  const [boardTokens, setBoardTokens] = useState<Token[]>([]);
  const boardTokensRef = useRef<Token[]>([]);
  useEffect(() => {
    boardTokensRef.current = boardTokens;
  }, [boardTokens]);
  const [hoveredTokenMechanics, setHoveredTokenMechanics] = useState<{
    token: Token;
    mechanics: ActiveMechanic[];
  } | null>(null);
  const [mechanicsTooltipPosition, setMechanicsTooltipPosition] = useState({ x: 0, y: 0 });
  const [pendingLevelUpTokens, setPendingLevelUpTokens] = useState<Token[]>([]);
  const [currentLevelUpToken, setCurrentLevelUpToken] = useState<Token | null>(null);

  /**
   * Mechanic overlays belong to a battle runtime. Token updates arrive through
   * the socket independently from the battle-state update, so clear the local
   * copies too when that runtime is no longer active.
   */
  const clearMechanicOverlays = useCallback(() => {
    setBoardTokens((currentTokens) => {
      let hasOverlay = false;

      const tokensWithoutOverlays = currentTokens.map((token) => {
        if (!token.visualOverlays?.length) {
          return token;
        }

        hasOverlay = true;
        return { ...token, visualOverlays: [] };
      });

      return hasOverlay ? tokensWithoutOverlays : currentTokens;
    });

    setHoveredTokenMechanics(null);
  }, []);

  function handleCloseSkillPanel() {
    setCurrentLevelUpToken(null);

    setPendingLevelUpTokens(prev =>
      prev.slice(1)
    );
  }

  function pointsPerLevel(level: number) //RETIRADA
  {
    return Math.ceil(
      Math.pow(level, 0.75)
    );
  }

  function getLevelUpResult(token: Token) //RETIRADA
  {
    let xp =
      (token.attributes.xp ?? 0) +
      (token.pendingXPAllocating ?? 0);

    let level =
      token.attributes.level;

    let points = 0;

    while (
      xp >= xpProgressionByLevel(level)
    ) {
      xp -= xpProgressionByLevel(level);

      level++;

      points += pointsPerLevel(level);
    }

    return {
      newLevel: level,
      remainingXP: xp,
      pointsToAllocate: points,
    };
  }

  function handleConfirmLevelUp(
    allocatedPoints: AllocatedPoints
  ) {
    if (!currentLevelUpToken)
      return;

    const result =
      getLevelUpResult(currentLevelUpToken);

    setCreatedTokens(prev =>
      prev.map(token => {

        if (
          token.createId !==
          currentLevelUpToken.createId
        )
          return token;

        return {
          ...token,

          attributes: {
            ...token.attributes,

            level: result.newLevel,

            forca:
              token.attributes.forca +
              allocatedPoints.forca,

            destreza:
              token.attributes.destreza +
              allocatedPoints.destreza,

            consistencia:
              token.attributes.consistencia +
              allocatedPoints.consistencia,

            inteligencia:
              token.attributes.inteligencia +
              allocatedPoints.inteligencia,

            sabedoria:
              token.attributes.sabedoria +
              allocatedPoints.sabedoria,

            carisma:
              token.attributes.carisma +
              allocatedPoints.carisma,
          },

          xp: result.remainingXP,

          pendingXPAllocating: 0,
        };
      })
    );

    setCurrentLevelUpToken(null);

    setPendingLevelUpTokens(prev =>
      prev.slice(1)
    );
  }


  const [rows, setRows] = useState(25);
  const [cols, setCols] = useState(25);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { // botão direito
      e.preventDefault();
      setIsPanning(true);
      panStart.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;

    setViewportTransform((current) => ({
      ...current,
      pan: {
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      },
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleBoardWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();

    const viewport = boardViewportRef.current;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - viewportRect.left;
    const cursorY = event.clientY - viewportRect.top;
    const deltaInPixels = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? event.deltaY * 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? event.deltaY * viewportRect.height
        : event.deltaY;

    setViewportTransform((current) => {
      const nextZoom = Math.min(
        MAX_BOARD_ZOOM,
        Math.max(MIN_BOARD_ZOOM, current.zoom * Math.exp(-deltaInPixels * 0.0015)),
      );

      if (nextZoom === current.zoom) return current;

      const zoomRatio = nextZoom / current.zoom;

      return {
        zoom: nextZoom,
        pan: {
          x: cursorX - (cursorX - current.pan.x) * zoomRatio,
          y: cursorY - (cursorY - current.pan.y) * zoomRatio,
        },
      };
    });
  }, []);

  useEffect(() => {
    const viewport = boardViewportRef.current;
    if (!viewport) return;

    viewport.addEventListener("wheel", handleBoardWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleBoardWheel);
  }, [handleBoardWheel]);

  const clearRulerMeasurement = useCallback(() => {
    setIsRulerMeasuring(false);
    setRulerMeasurement(null);
  }, []);

  const handleToolSelection = (toolId: BoardToolId) => {
    const nextTool = activeBoardTool === toolId ? null : toolId;

    setActiveBoardTool(nextTool);
    if (nextTool !== "ruler") {
      clearRulerMeasurement();
    }
  };

  const handleRulerMouseDown = (
    event: React.MouseEvent,
    point: GridPoint,
  ) => {
    if (activeBoardTool !== "ruler" || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    setRulerMeasurement(measureCells(point, point));
    setIsRulerMeasuring(true);
  };

  const handleRulerMouseMove = (point: GridPoint) => {
    if (activeBoardTool !== "ruler" || !isRulerMeasuring) return;

    setRulerMeasurement((currentMeasurement) =>
      currentMeasurement
        ? measureCells(currentMeasurement.start, point)
        : currentMeasurement,
    );
  };

  useEffect(() => {
    if (!isRulerMeasuring) return;

    window.addEventListener("mouseup", clearRulerMeasurement);

    return () => {
      window.removeEventListener("mouseup", clearRulerMeasurement);
    };
  }, [isRulerMeasuring, clearRulerMeasurement]);

  const crds = useCards()
  const items = useItems(crds)

  const [createdItems, setCreatedItems] = useState<Item[]>([]);

  useEffect(() => {
    setCreatedItems(items)
  }, [items])

  const cardsRef = useRef<Card[]>(crds);
  const itemsRef = useRef<Item[]>(items);

  useEffect(() => {
    cardsRef.current = crds;
  }, [crds]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);


  const [createdCards, setCreatedCards] = useState<Card[]>([]);

  useEffect(() => {
    setCreatedCards(crds)
  }, [crds])


  const maps = useMaps(createdCards, createdItems)
  const [mapas, setMapas] = useState<Mapa[]>([]);

  useEffect(() => {
    setMapas(maps)
  }, [maps])

  const fetchUsers = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const campaignId = urlParams.get("campaignId");

      if (!campaignId) {
        console.warn("Parâmetro 'campaignId' não encontrado na URL.");
        return;
      }

      // Retorno da API (Lista de CampaignMember)
      const response = (await CampaignAPI.listByCampaign(campaignId)) as any[];

      if (!Array.isArray(response)) {
        console.error("A API não retornou um array válido:", response);
        return;
      }

      // 🟢 Extrai a propriedade 'user' de dentro de cada registro do membro
      const extractedUsers: User[] = response
        .map((item) => item.user || item) // Pega item.user se existir, senão o próprio item
        .filter(Boolean); // Remove nulos/undefineds

      setUsers(extractedUsers);
    } catch (error: any) {
      console.error("Erro ao carregar usuários da campanha:", error);
    }
  };

  const fetchCampaign = async() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const campaignId = urlParams.get("campaignId");
      
      if(!campaignId) {
        throw new Error("O ID da campanha não pode ser encontrado.")
      }

      const campaign = (await CampaignAPI.getCampaign(campaignId)) as any
      
      if(!campaign) {
        throw new Error("Campanha não é um objeto válido.")
      }

      setCampaign(campaign)
    } catch (error: any) {
      console.error(error)
    }
  }

  const fetchUser = async() => {
    try {
      const userId = getLoggedUserId()

      if(!userId) {
        throw new Error("Não foi possível obter userId.")
      }

      setUserId(userId)

    } catch (error: any) {
      console.log(error)
    }
  }

  /* GENERAL LISTENER */
  useEffect(() => {

    const tokenInstanceListener = new TokenInstanceSocketListener(socket, boardTokensRef, setBoardTokens, setTokenInAmbientPivotSelection, cardsRef, itemsRef)
    const battleStateListener = new BattleSocketListener(socket, setBattleState)
    const pendingListener = new PendingSocketListener(
      socket,
      setPendingAttack,
      setPendingEsquivaRoll,
      setPendingFreeResponse,
      setPendingCardResolution,
      setOffensivePendingCard,
      setOffensiveCardAttackerId,
      setPendingSpecialResponse,
      () => selectedMapIdRef.current,
    )
    const frontendListener = new FrontendSocketListener(
      socket,
      setInCardSelection,
      setIsInDefenseResolution,
      setPreviewCells,
      setSelectedTarget,
      setOffensiveCardScore,
      setOffensiveCardTestScore,
      setInTargetSelection,
      setIsAmbientPivotSelection,
      setArmedCard,
      setSelectedCell,
      setAmbientPivotPhase
    )

    /* REGISTERS */
    tokenInstanceListener.register()
    battleStateListener.register()
    pendingListener.register()
    frontendListener.register()

    /* FETCHs */
    fetchUsers()
    fetchUser()
    fetchCampaign()

    return () => {
      tokenInstanceListener.unregister()
      battleStateListener.unregister()
      pendingListener.unregister()
      frontendListener.unregister()
    };

  }, []);

  const [selectedMapa, setSelectedMapa] = useState<Mapa | undefined>(undefined);
  const [isMapSelectOpen, setIsMapSelectOpen] = useState(false);
  const [generateMazeOpen, setGenerateMazeOpen] = useState(false);

  const handleSelectMapa = (mapa: Mapa) => {
    setSelectedMapa(mapa);

    setRows(mapa.rows);
    setCols(mapa.cols);
    setBackgroundImage(mapa.img);
    setBoardMapObjects(mapa.mapObjs);
    setBoardTokens(mapa.boardTokens);

    setIsMapSelectOpen(false);
  };

  useEffect(() => {
    if (!campaign?.id || !userId) return;

    CampaignAPI.getMapRouting(campaign.id)
      .then(setMapRouting)
      .catch((error) => console.error("Não foi possível carregar o direcionamento dos mapas:", error));
  }, [campaign?.id, userId]);

  useEffect(() => {
    if (selectedMapa || mapas.length !== 1) return;

    handleSelectMapa(mapas[0]);
  }, [mapas, selectedMapa]);

  const handleDirectMembersToMap = async (mapId: string, memberIds: string[]) => {
    if (!campaign?.id) return;

    const result = await CampaignAPI.directMembersToMap(campaign.id, mapId, memberIds);

    setMapRouting((current) => current && {
      ...current,
      members: current.members.map((member) =>
        result.userIds.includes(member.userId)
          ? { ...member, currentMapId: result.mapId }
          : member,
      ),
    });
  };

  useEffect(() => {
    const campaignId = campaign?.id;
    if (!campaignId) return;

    const joinCampaign = () => socket.emit("join-campaign", {
      campaignId,
      token: sessionStorage.getItem("@app:token"),
    });
    joinCampaign();
    socket.on("connect", joinCampaign);

    return () => {
      socket.off("connect", joinCampaign);
      socket.emit("leave-campaign", { campaignId });
    };
  }, [campaign?.id]);

  useEffect(() => {
    const campaignId = campaign?.id;
    if (!campaignId) {
      setOnlineCampaignUsers([]);
      return;
    }

    const handleCampaignPresence = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;

      const data = payload as {
        campaignId?: unknown;
        users?: unknown;
      };

      if (data.campaignId !== campaignId || !Array.isArray(data.users)) return;

      const normalizedUsers = data.users.flatMap((user): OnlineCampaignUser[] => {
        if (!user || typeof user !== "object") return [];

        const presence = user as Partial<OnlineCampaignUser>;
        if (
          typeof presence.id !== "string" ||
          typeof presence.name !== "string" ||
          typeof presence.color !== "string"
        ) {
          return [];
        }

        return [{
          id: presence.id,
          name: presence.name,
          color: presence.color,
        }];
      });

      setOnlineCampaignUsers(normalizedUsers);
    };

    socket.on("campaign.presence.updated", handleCampaignPresence);

    return () => {
      socket.off("campaign.presence.updated", handleCampaignPresence);
    };
  }, [campaign?.id]);

  useEffect(() => {
    if (!campaign?.id || !userId) return;

    const handleMapRoutingUpdate = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;

      const update = payload as { campaignId?: string; userIds?: string[] };
      if (update.campaignId !== campaign.id || !update.userIds?.includes(userId)) return;

      MapaAPI.getMaps(createdCards, createdItems)
        .then((updatedMaps) => {
          setMapas(updatedMaps);
          const directedMap = updatedMaps[0];

          if (directedMap) {
            handleSelectMapa(directedMap);
            return;
          }

          setSelectedMapa(undefined);
          setBoardTokens([]);
          setBoardMapObjects([]);
        })
        .catch((error) => console.error("Não foi possível sincronizar o mapa direcionado:", error));
    };

    socket.on("campaign.member.map.updated", handleMapRoutingUpdate);

    return () => {
      socket.off("campaign.member.map.updated", handleMapRoutingUpdate);
    };
  }, [campaign?.id, userId, createdCards, createdItems]);

  useEffect(() => {
    const mapId = selectedMapa?.id;
    setPendingSpecialResponse(null);
    selectedMapIdRef.current = mapId;
    if (!mapId) return;

    const joinCurrentMap = () => {
      socket.emit("join-map", {
        mapId,
        token: sessionStorage.getItem("@app:token"),
      });
    };

    joinCurrentMap();
    socket.on("connect", joinCurrentMap);

    return () => {
      socket.off("connect", joinCurrentMap);
      if (selectedMapIdRef.current === mapId) {
        selectedMapIdRef.current = undefined;
      }
    };
  }, [selectedMapa?.id]);

  const handleCreateMapa = (mapName: string) => {

    const newId = generateUUID();

    const newMapa: Mapa = {
      id: newId,
      name: mapName,
      rows: 25,
      cols: 25,
      img: "",
      mapObjs: [],
      boardTokens: [],
      campaignId: ""
    };

    setMapas(prev => [...prev, newMapa]);

    setSelectedMapa(newMapa);

    // reset configs
    setRows(25);
    setCols(25);

    setBackgroundImage("");

    setBoardMapObjects([]);

    setBoardTokens([]);

    setIsMapSelectOpen(false);
    MapaAPI.createMaps(newMapa)
  };

  useEffect(() => {
    if (!selectedMapa) return;

    setRows(selectedMapa.rows);
    setCols(selectedMapa.cols);
    setBackgroundImage(selectedMapa.img);
    setBoardMapObjects(selectedMapa.mapObjs);

    if (boardTokens.length > 0) console.debug("BOARD TOKENS CARD: ", boardTokens[0].cards)

  }, [selectedMapa]);

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

  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [boardMapObjects, setBoardMapObjects] = useState<MapObject[]>([]);

  useEffect(() => {
    if (!selectedMapa) return;

    setMapas(prev =>
      prev.map(m =>
        m.id === selectedMapa.id
          ? {
            ...m,
            rows,
            cols,
            img: (backgroundImage ?? ""),
            mapObjs: boardMapObjects,
            boardTokens: boardTokens,
          }
          : m
      )
    );

    const newMapa: Mapa = {
      id: selectedMapa.id,
      name: selectedMapa.name,
      rows: rows,
      cols: cols,
      img: backgroundImage ?? "",
      mapObjs: boardMapObjects,
      boardTokens: boardTokens,
      campaignId: ""
    }

    MapaAPI.updateMaps(newMapa)
  }, [rows, cols, backgroundImage, boardMapObjects, boardTokens]);

  const [sidebarWidth, setSidebarWidth] = useState<number>(320); // inicial

  const [pendingFreeResponse, setPendingFreeResponse] = useState<{
    responderId: string;  // quem ganhou a ação livre
    paralyzedId: string;  // quem ficou sem poder reagir a este próximo ataque
  } | null>(null);

  const [pendingCardResolution, setPendingCardResolution] = useState<Token | null>(null);

  const [tokensRefreshKey, setTokensRefreshKey] = useState(0);
  const tokens = useTokens(
    createdCards,
    createdItems,
    campaign?.id,
    tokensRefreshKey,
  )

  const [createdTokens, setCreatedTokens] = useState<Token[]>([]);

  useEffect(() => {
    setCreatedTokens(tokens)
  }, [tokens])


  const [tokenBeingEdited, setTokenBeingEdited] = useState<Token | null>(null);
  const [cardBeingEdited, setCardBeingEdited] = useState<Card | null>(null);
  const [itemBeingEdited, setItemBeingEdited] = useState<Item | null>(null);

  async function addItem(item: Item) {
    const persistedItem = await ItemAPI.createItem(item, createdCards);
    setCreatedItems(prev => [...prev, persistedItem]);
  }

  function removeItem(itemId: string) {
    setCreatedItems(prev => prev.filter((i) => i.id !== itemId))
    ItemAPI.deleteItem(itemId)
  }

  function handleEditToken(token: Token) {
    setTokenBeingEdited(token);
  }

  function handleEditCard(card: Card) {
    setCardBeingEdited(card);
  }

  function handleEditItem(item: Item) {
    setItemBeingEdited(item);
  }

  async function handleSaveEditedToken(editedToken: Token) {
    const persistedToken = await TokenAPI.updateToken(
      editedToken,
      createdCards,
      createdItems,
    );
    setCreatedTokens(prev =>
      prev.map(t => t.id === persistedToken.id ? persistedToken : t)
    );
    setTokenBeingEdited(null);
  }


  const [boardBoss, setBoardBoss] = useState<Token | null>(null);

  useEffect(() => {
    for (const t of boardTokens) {
      if (t.type === "boss") {
        setBoardBoss(t);
        return;
      }
    }
    setBoardBoss(null);
  }, [boardTokens])
  const [mapObjectCreateForm, setMapObjectCreateForm] = useState<boolean>(false);

  useEffect(() => {
    // Open Create Map Object Form
    const handleOpenCMOBJ = (e: KeyboardEvent) => {
      if (!selectedCell) return;

      if (e.key === "C" || e.key === "c") {
        setMapObjectCreateForm(true);
      }
    }
    window.addEventListener("keydown", handleOpenCMOBJ);
  }, [selectedCell]);

  const [sidebarOpen, setSidebarOpen] = useState(false);


  const addCard = async (card: Card) => {
    const persistedCard = await CardAPI.createCard(card);
    setCreatedCards((prev) => [...prev, persistedCard]);
  };

  const removeCard = (cardId: string) => {
    setCreatedCards((prev) => prev.filter((c) => c.id !== cardId));
    CardAPI.deleteCard(cardId)
  };

  async function handleSaveEditedCard(editedCard: Card) {
    const persistedCard = await CardAPI.updateCard(editedCard);
    setCreatedCards(prev =>
      prev.map(c => c.id === persistedCard.id ? persistedCard : c)
    );
    setCardBeingEdited(null)
  }

  async function handleSaveEditedItem(editedItem: Item) {
    const persistedItem = await ItemAPI.updateItem(editedItem, createdCards);
    setCreatedItems(prev =>
      prev.map(i => i.id === persistedItem.id ? persistedItem : i)
    );
    setItemBeingEdited(null);
  }


  const battle = useBattleState(selectedMapa?.id ?? "")

  const [battleState, setBattleState] = useState<BattleState>({
    id: "",
    status: "Not in Battle",
    round: 0,
    turnOrder: [],
    currentTurnIndex: 0,
    currentActorId: null,
    currentActorUserId: "",
    phase: "Initiative",
    locks: {
      reallocating: false,
      resolvingAction: false
    },
    accumulatedActions: {},
    activeEffects: {},
    actionHistory: [],
    isReallocatingTurns: false,
    turnVersion: 0,
    tokensBattlePosition: {},
    previsionActions: {},
    mapId: selectedMapa?.id ?? "",
    cardsNotRechargeds: {},
    timeToRechargeCard: {},
    tokensInOffensiveCard: [],
    maxSelectablePivots: 0,
    remainingPivots: 0,
    mechanicEntitiesInstances: []
  });

  useEffect(() => {
    console.log("[BATTLE MECHANICS]: ", battleState.mechanicEntitiesInstances)
  }, [battleState])

  useEffect(() => {
    console.log("BATALHA: ", battle)
    setBattleState(battle ?? {
      id: "",
      status: "Not in Battle",
      round: 0,
      turnOrder: [],
      currentTurnIndex: 0,
      currentActorId: null,
      currentActorUserId: "",
      phase: "Initiative",
      locks: {
        reallocating: false,
        resolvingAction: false
      },
      accumulatedActions: {},
      activeEffects: {},
      actionHistory: [],
      isReallocatingTurns: false,
      turnVersion: 0,
      tokensBattlePosition: {},
      previsionActions: {},
      mapId: selectedMapa?.id ?? "",
      cardsNotRechargeds: {},
      timeToRechargeCard: {},
      tokensInOffensiveCard: [],
      maxSelectablePivots: 0,
      remainingPivots: 0,
      mechanicEntitiesInstances: []
    })
  }, [battle])

  useEffect(() => {
    if (battleState.status !== "In Battle") {
      clearMechanicOverlays();
    }
  }, [battleState.status, clearMechanicOverlays]);

  function searchAccumulatedActions(tokenId: string): number {
    return battleState.accumulatedActions[tokenId];
  }

  function searchCurrentMana(token: Token): number {
    return token.currentMana ?? 0
  }

  const battleStateRef = useRef<BattleState>(battleState);

  useEffect(() => {
    battleStateRef.current = battleState;
  }, [battleState]);

  /* ESTADOS DE COMBATE DINÂMICO */

  function canLevelUp(token: Token) {
    return (
      (token.attributes.xp ?? 0) +
      (token.pendingXPAllocating ?? 0)
    ) >= xpProgressionByLevel(
      token.attributes.level
    );
  }

  function calculateLevelGain(token: Token) {
    let xp =
      token.attributes.xp +
      token.pendingXPAllocating;

    let level =
      token.attributes.level;

    let levelsGained = 0;

    while (
      xp >= xpProgressionByLevel(level)
    ) {
      xp -= xpProgressionByLevel(level);

      level++;
      levelsGained++;
    }

    return levelsGained;
  }

  function xpReward(token: Token): number {
    const total_xp = xpProgressionByLevel(token.attributes.level);
    const reward = Math.floor(total_xp / 5);
    return reward;
  }

  function awardXP(killer: Token, victim: Token) {
    if (killer.type !== "player") return;
    if (victim.type === "player") return;

    const xp = xpReward(victim);

    setCreatedTokens(prev =>
      prev.map(token => {

        if (token.createId !== killer.createId)
          return token;

        return {
          ...token,
          pendingXPAllocating:
            (token.pendingXPAllocating ?? 0) + xp,
        };
      })
    );

    console.log(
      `[XP] ${killer.name} ganhou ${xp}`
    );
  }

  function handleTokenDeath(deadToken: Token) {
    console.log("[TOKEN MORREU]", deadToken.name, deadToken.id);

    if (!deadToken.lastDamagerId) return;

    const killer = boardTokens.find(
      t => t.id === deadToken.lastDamagerId
    );

    if (!killer) return;

    awardXP(killer, deadToken);
  }

  useEffect(() => {

    // Usa a ref como fonte de verdade para o status: o useEffect depende apenas
    // de boardTokens, portanto battleState.status lido diretamente seria o valor
    // do render anterior (closure stale). A ref é sempre atual.
    if (battleStateRef.current.status !== "In Battle") return;

    const deadTokens =
      boardTokens.filter(
        token =>
          (token.currentLife ?? 0) <= 0
      );

    if (deadTokens.length <= 0) {
      return;
    }

    // Captura os IDs dos mortos agora, antes de qualquer setState assíncrono,
    // para que o setTimeout abaixo não use uma closure stale de deadTokens.
    const deadIds = deadTokens.map(token => token.id);

    const aliveTokenIds =
      boardTokens
        .filter(token => (token.currentLife ?? 0) > 0)
        .map(token => token.id);

    // Ativa isReallocatingTurns e recalcula a ordem de turno em um único
    // setBattleState atômico — dois setBattleStates separados causavam race
    // condition onde o segundo sobrescrevia o primeiro antes do React batchear.
    setBattleState(prev => {

      // Se a batalha já terminou entre o render e este setter, não realoca.
      if (prev.status !== "In Battle") return prev;

      const newTurnOrder =
        prev.turnOrder.filter(
          turn => aliveTokenIds.includes(turn.tokenId)
        );

      const currentTurn = prev.turnOrder[prev.currentTurnIndex];

      let newCurrentIndex =
        newTurnOrder.findIndex(
          turn => turn.tokenId === currentTurn?.tokenId
        );

      if (newCurrentIndex < 0) {
        newCurrentIndex = 0;
      }

      return {
        ...prev,
        isReallocatingTurns: true,
        turnOrder: newTurnOrder,
        currentTurnIndex: newCurrentIndex,
      };

    });

    const timeout = setTimeout(() => {

      setBoardTokens(prev =>
        prev.filter(token => !deadIds.includes(token.id))
      );

      // Só encerra realocação se ainda estivermos em batalha.
      setBattleState(prev => {
        if (prev.status !== "In Battle") return prev;
        return { ...prev, isReallocatingTurns: false };
      });

    }, 1000);

    return () => {
      clearTimeout(timeout);
      // Garante que isReallocatingTurns nunca fica preso em true caso o cleanup
      // seja chamado antes do timeout disparar (ex: nova morte chega antes dos 1s).
      setBattleState(prev => {
        if (!prev.isReallocatingTurns) return prev;
        if (prev.status !== "In Battle") return prev;
        return { ...prev, isReallocatingTurns: false };
      });
    };

  }, [boardTokens]);

  useEffect(() => {

    if (battleState.status !== "In Battle") return;

    const deadTokens = boardTokens.filter(
      t => (t.currentLife ?? 0) <= 0
    );

    deadTokens.forEach(handleTokenDeath);

  }, [boardTokens]);

  useEffect(() => {

    if (battleState.status !== "Not in Battle")
      return;

    const rewards =
      createdTokens.filter(
        token => canLevelUp(token)
      );

    if (rewards.length <= 0)
      return;

    console.log("[LEVEL UP]: Token que podem upar de nível: ", rewards);

    setPendingLevelUpTokens(
      rewards
    );

    rewards.forEach(token => {

      const result =
        calculateLevelGain(token);

      console.log(
        "[LEVEL RESULT]",
        token.name,
        result
      );

    });

  }, [
    battleState.status,
    createdTokens
  ]);

  useEffect(() => {

    if (currentLevelUpToken)
      return;

    if (pendingLevelUpTokens.length <= 0)
      return;

    setCurrentLevelUpToken(
      pendingLevelUpTokens[0]
    );

  }, [
    pendingLevelUpTokens,
    currentLevelUpToken
  ]);

  useEffect(() => {

    if (battleState.status !== "In Battle") {
      return;
    }

    console.log(
      boardTokens.map(t => ({
        id: t.id,
        team: t.team,
        life: t.currentLife
      }))
    );

    const aliveTeams = new Set(

      boardTokens
        .filter(
          token => (token.currentLife ?? 0) > 0
        )
        .map(
          token => token.team
        )

    );
    console.log("QUANTOS TIMES EXISTEM?: ", aliveTeams.size <= 1)
    if (aliveTeams.size <= 1) {
      handleEndBattle();
    }

  }, [
    boardTokens,
    battleState.status
  ]);
  /* * */


  const [pendingAttack, setPendingAttack] = useState<PendingAttack | null>(null);

  const [inCardSelection, setInCardSelection] = useState<boolean>(false);

  useEffect(() => {
    if (battleState.status !== "In Battle") return;

    const livingIds = new Set(
      boardTokens
        .filter(token => (token.currentLife ?? 1) > 0)
        .map(token => token.id)
    );

    if (
      pendingAttack &&
      (!livingIds.has(pendingAttack.attackerId) ||
        !livingIds.has(pendingAttack.targetId))
    ) {
      setPendingAttack(null);
      setPendingEsquivaRoll(null);
      setIsInDefenseResolution(false);
    }

    if (
      pendingFreeResponse &&
      (!livingIds.has(pendingFreeResponse.responderId) ||
        !livingIds.has(pendingFreeResponse.paralyzedId))
    ) {
      setPendingFreeResponse(null);
    }


    if (
      pendingCardResolution &&
      !livingIds.has(pendingCardResolution.id)
    ) {
      setInCardSelection(false);
      setPendingCardResolution(null);
    }
  }, [boardTokens, battleState.status]);

  const [pendingEsquivaRoll, setPendingEsquivaRoll] = useState<RollResult | null>(null);
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);
  const [isCooling, setIsCooling] = useState<boolean>(false);
  const movementPendingRef = useRef(false);

  const [isInDefenseResolution, setIsInDefenseResolution] = useState(false);
  ;
  const [offensivePendingCard, setOffensivePendingCard] = useState<Card>();
  const [offensiveCardAttackerId, setOffensiveCardAttackerId] = useState<string | null>(null);
  const [armedCard, setArmedCard] = useState<Card>()

  const freeResponseFormKey = useFormSessionKey("free-response", pendingFreeResponse);
  const reactionFormKey = useFormSessionKey("reaction", pendingAttack);
  const defenseFormKey = useFormSessionKey("defense", pendingEsquivaRoll);
  const cardFormKey = useFormSessionKey("card", pendingCardResolution);
  const offensiveCardFormKey = useFormSessionKey("offensive-card", offensivePendingCard);

  useEffect(() => {
    setArmedCard(offensivePendingCard)
  },
    [offensivePendingCard]);

  useEffect(() => {
    if (armedCard) {

      if (armedCard.target.pivotSettings?.pivotType === "Trigger-Fix") {
        void confirmAmbientPivots();
      }
    }
  }, [armedCard]);


  const [offensiveCardScore, setOffensiveCardScore] = useState<number | null>(null);
  const [offensiveCardTestScore, setOffensiveCardTestScore] = useState<number | null>(null);

  function searchTokenPosition(tokenId: string, attr: string) {
    const key = `${tokenId}->${attr}`;
    return battleState.tokensBattlePosition[key] ?? 1;
  }

  useEffect(() => {
    if (battleState.tokensInOffensiveCard.length <= 0) {
      setOffensivePendingCard(undefined);
      setOffensiveCardAttackerId(null);
      setOffensiveCardScore(null);
      setOffensiveCardTestScore(null);
    }
  }, [battleState.tokensInOffensiveCard])

  const [previewCells, setPreviewCells] = useState<Set<string>>(new Set());

  const [isAmbientPivotSelection, setIsAmbientPivotSelection] = useState(false);
  const [tokenInAmbientPivotSelection, setTokenInAmbientPivotSelection] = useState<string>("");
  const [isConfirmingAmbientPivots, setIsConfirmingAmbientPivots] = useState(false);
  const ambientPivotConfirmationPendingRef = useRef(false);

  useEffect(() => {

    console.debug("AMBIENT PIVOT SELECTION: ", isAmbientPivotSelection)
    console.debug("ARMED CARD: ", armedCard?.name)

    if (!isAmbientPivotSelection) return;

    setAmbientPivotPhase("awaiting-pivot");
  }, [isAmbientPivotSelection]);

  const [ambientPivotPhase, setAmbientPivotPhase] =
    useState<"awaiting-pivot" | "preview" | "confirm">("awaiting-pivot");

  /* * */

  // Zoom & delete
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setSelectedCell(null);
        setSelectedTokenId(null);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setViewportTransform((current) => ({
          ...current,
          zoom: Math.min(current.zoom + KEYBOARD_ZOOM_STEP, MAX_BOARD_ZOOM),
        }));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setViewportTransform((current) => ({
          ...current,
          zoom: Math.max(current.zoom - KEYBOARD_ZOOM_STEP, MIN_BOARD_ZOOM),
        }));
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedTokenId
      ) {
        e.preventDefault();
        TokenInstanceAPI.deleteTokenInstance(selectedTokenId)
        setSelectedTokenId(null);
        setSelectedCell(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedTokenId]);

  // Movement keys when Not in Battle

  const [presentedItem, setPresentedItem] = useState<Item | null>(null);


  useEffect(() => {
    console.log("SELECTED:", selectedTokenId);
    console.log("TOKENS:", boardTokens.map(t => t.id));
  }, [selectedTokenId])

  function replaceTokenInAnotherMap( //RETIRADA
    tokenId: string,
    door: MapObject,
    mapas: Mapa[]
  ) {
    const token = boardTokens.find((t) => t.id === tokenId);

    if (!token) return;
    if (!selectedMapa) return;
    if (!door.linkedMapId) return;
    if (!door.linkedDoorId) return;

    // 🔥 encontra mapa destino
    const targetMap = mapas.find(
      (m) => m.id === door.linkedMapId
    );

    if (!targetMap) return;

    // 🔥 encontra a porta correspondente
    const targetDoor = targetMap.mapObjs.find(
      (obj) =>
        obj.type === "door" &&
        obj.id === door.linkedDoorId
    );

    if (!targetDoor) return;

    // 🔥 remove token do mapa atual
    TokenInstanceAPI.deleteTokenInstance(tokenId)

    // 🔥 cria token movido
    const movedToken = {
      ...token,
      position: {
        col: targetDoor.position.col,
        row: targetDoor.position.row,
      },
    };

    // 🔥 adiciona no mapa destino
    setMapas((prev) =>
      prev.map((m) => {
        if (m.id !== door.linkedMapId) return m;

        return {
          ...m,
          boardTokens: [...m.boardTokens, movedToken],
        };
      })
    );
  }

  useEffect(() => {
    console.debug("TOKEN AMBIENT: ", tokenInAmbientPivotSelection)
  }, [tokenInAmbientPivotSelection])

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

      // Limite do mapa
      if (newCol < 1 || newCol > cols || newRow < 1 || newRow > rows) return;

      // 🚫 BLOQUEIO POR WALL
      const hasWall = boardMapObjects.some(
        (obj) =>
          obj.type === "wall" &&
          obj.position.col === newCol &&
          obj.position.row === newRow
      );

      const chest = boardMapObjects.find(
        (obj) =>
          obj.type === "chest" &&
          obj.position.col === newCol &&
          obj.position.row === newRow
      );

      const door = boardMapObjects.find(
        (obj) =>
          obj.type === "door" &&
          obj.position.col === newCol &&
          obj.position.row === newRow
      )

      if (hasWall) return;

      if (chest && haveSpaceInInventory(boardTokens, selectedTokenId)) {
        const item = chest.itemRelative;


        if (item) {
          setPresentedItem(item);

          addItemToInventory(
            setBoardTokens,
            selectedTokenId,
            item,
          );

          setBoardMapObjects(prev =>
            prev.filter(obj => obj !== chest)
          );
        }
      }

      moveTokenOnBoard(selectedTokenId, newCol, newRow);

      if (door) {
        replaceTokenInAnotherMap(selectedTokenId, door, mapas);
      }

      setLastMoveTime(now);
      setIsCooling(true);
      setTimeout(() => setIsCooling(false), 500);
    };

    window.addEventListener("keydown", handleMoveKey);
    return () => window.removeEventListener("keydown", handleMoveKey);
  }, [
    battleState.status,
    selectedTokenId,
    lastMoveTime,
    boardTokens,
    boardMapObjects,
    cols,
    rows
  ]);

  const [inventoryOpen, setInventoryOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleCaptureOpen = (e: KeyboardEvent) => {

      if (!selectedTokenId) return;
      switch (e.key) {
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


  useEffect(() => {

    console.info("IN CARD SELECTION: ", inCardSelection)
    console.info("PENDING CARD RESOLUTION: ", !!pendingCardResolution)

  }, [inCardSelection, pendingCardResolution])


  const letters = Array.from({ length: cols }, (_, i) => getColumnName(i + 1));


  // Token library ops
  const addCreatedToken = async (token: Token) => {
    const persistedToken = await TokenAPI.createToken(
      token,
      createdCards,
      createdItems,
    );

    setCreatedTokens((previousTokens) => {
      const alreadyExists = previousTokens.some(
        (currentToken) => currentToken.id === persistedToken.id,
      );

      return alreadyExists
        ? previousTokens.map((currentToken) =>
            currentToken.id === persistedToken.id
              ? persistedToken
              : currentToken,
          )
        : [...previousTokens, persistedToken];
    });
    setTokensRefreshKey((current) => current + 1);
  }
  const updateCreatedToken = (token: Token) =>
    setCreatedTokens((prev) =>
      prev.map((t) => (t.id === token.id ? token : t))
    );
  const removeCreatedToken = (tokenId: string) => {
    setCreatedTokens((prev) => prev.filter((t) => t.id !== tokenId));
    TokenAPI.deleteToken(tokenId)
  }

  // Place & move
  const placeTokenOnBoard = (tokenId: string, col: number, row: number) => {
    const template = createdTokens.find((t) => t.id === tokenId);
    if (!template) return;

    const instance: Token = {
      ...template,

      createId: template.createId,
      // NOVO ID
      id: `board_${Date.now()}_${Math.random().toString(36).slice(2)}`,

      position: { col, row },

      // CLONE PROFUNDO DO INVENTÁRIO
      inventory: {
        ...template.inventory,
        commonSlot: [...(template.inventory.commonSlot ?? [])],
      },

      // (RECOMENDADO) CLONAR ARRAYS IMPORTANTES
      cards: [...template.cards],
      tokenCards: [...template.tokenCards],
      visualOverlays: template.visualOverlays
        ? template.visualOverlays.map(v => ({ ...v }))
        : [],
    };
    TokenInstanceAPI.createTokenInstances(instance, selectedMapa?.id ?? "")
  };

  const [inTargetSelection, setInTargetSelection] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Token | null>(null)


  async function moveTokenOnBoard(id: string, col: number, row: number) {
    const movingToken = boardTokens.find((token) => token.id === id);
    if (!movingToken || movementPendingRef.current) return;
    const isInBattle = battleState.status === "In Battle";
    const distance = measureCells(movingToken.position, { col, row }).distance;
    if (distance === 0) return;
    if (isInBattle &&
        (id !== battleState.currentActorId || battleState.movedThisTurn?.[id] ||
         distance > (movingToken.naturalMovement ?? 6))) {
      return;
    }

    if (!isInBattle && !selectedMapa) return;
    movementPendingRef.current = true;
    let resolvedPosition = { col, row };
    try {
      if (isInBattle) {
        const movement = await BattleEngineAPI.moveToken({
          battleId: battleState.id,
          tokenId: id,
          to: { col, row },
        });

        if (movement.cancelled) return;
        resolvedPosition = movement.to;
      } else {
        await TokenInstanceAPI.updateTokenInstance(
          { ...movingToken, position: resolvedPosition },
          selectedMapa!.id,
        );
      }
    } catch (error) {
      console.error("Movimento recusado:", error);
      return;
    } finally {
      movementPendingRef.current = false;
    }

    setBoardTokens(prev => prev.map(token => token.id === id
      ? { ...token, position: resolvedPosition }
      : token));
    if (isInBattle) {
      setBattleState(prev => ({
        ...prev,
        movedThisTurn: { ...prev.movedThisTurn, [id]: true },
      }));
    }

  }

  const handleCellClick = (
    letter: string,
    number: number,
    tokenInCell?: Token
  ) => {
    const position = { col: columnToNumber(letter), row: number };
    setSelectedTokenId(tokenInCell?.id || null);
    setSelectedCell(`${letter}${number}`);

    const tokInCell = boardTokens.find((t) => t.position.col === position.col && t.position.row === position.row)


    if (inTargetSelection) {
      if (tokInCell) {
        setSelectedTarget(tokInCell);
      }
      return;
    }

    if (isAmbientPivotSelection && armedCard) {
      const pivotType = armedCard.target.pivotSettings?.pivotType;

      // So aceita tokens, se for Token-Fix.
      if (pivotType === "Token-Fix" && !tokenInCell) {
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

  const handleStartBattle = async () => {
    if (campaign?.ownerId !== userId) {
      return;
    }

    try {
      await BattleEngineAPI.startBattle(selectedMapa?.id ?? "");
    } catch (error) {
      console.error("Não foi possível iniciar a batalha:", error);
    }
  }

  useEffect(() => {
    console.log("USER ID guardado em BATTLE STATE: ", battleState.currentActorUserId)
    console.log("USER ID real: ", userId)    
  }, [battleState.currentActorUserId])

  const mouseStyle = inTargetSelection ? `crosshair` : "auto";

  const handleNextTurn = () => BattleEngineAPI.next(battleState.id)

  const handleEndBattle = async () => {
    if (!battleState.id) {
      return;
    }

    try {
      await BattleEngineAPI.end({ battleId: battleState.id });

      // The socket update is the source of truth for every connected client.
      // Clearing here also keeps the user who ended the battle visually in sync
      // if its socket event arrives a moment later.
      clearMechanicOverlays();
    } catch (error) {
      console.error("Não foi possível encerrar a batalha:", error);
    }
  }

  const handleExecuteAction = (choice: ExecuteChoice) => {

    const newChoice = {
      ...choice,
      battleId: battleState.id
    }

    return BattleEngineAPI.executeAction(newChoice)
  }

  // Reação do defensor: Defesa (consistência) ou Esquiva (destreza)
  // Observações:
  // - Se usedCertaintyDie = true: imunidade total imediata (encerra o ataque), apenas exibindo rolagem "travada" no histórico.
  // - Se destreza (esquiva) sem Dado Certo: inicia fluxo de resolução binária (handleDefenseResolution).
  // - Se consistência sem Dado Certo: reduz dano conforme rolagem e aplica dano restante.
  useEffect(() => {
    console.debug(pendingFreeResponse)
  }, [pendingFreeResponse])

  const handleReaction = (choice: any) => {
    const newChoice = {
      ...choice,
      type: choice.reactionType,
      battleId: battleState.id
    }

    console.log(battleState.id)

    return BattleEngineAPI.reaction(newChoice)
  }

  const handleCancelReaction = () => BattleEngineAPI.cancelReaction(battleState.id)

  const handlePrevAction = () => BattleEngineAPI.prev(battleState.id)

  const handleExecuteResponseAction = (attackerId: string, forcedTargetId: string, choice: ExecuteChoice) => {
    const modChoiced = {
      ...choice,
      targetId: forcedTargetId,
      attackerId: attackerId,
      battleId: battleState.id
    }


    return BattleEngineAPI.response(modChoiced)
  }

  const handleDefenseResolution = (choice: any) => {

    const newChoice = {
      ...choice,
      battleId: battleState.id,
      type: "destreza"
    }

    return BattleEngineAPI.defense(newChoice)
  }

  function closeCardForm() {
    console.debug("[DEBUG] Pending Attack: ", pendingAttack);
    console.debug("[DEBUG] Pending Esquiva Roll: ", pendingEsquivaRoll);
    setInCardSelection(false);
  }

  useEffect(() => {
    console.warn("IN CARD SELECTION: ", inCardSelection)
    console.warn("PENDING CARD RESOLUTION: ", pendingCardResolution)
    console.warn("PENDING ATTACK: ", pendingAttack)
  }, [
    inCardSelection,
    pendingCardResolution,
    pendingAttack
  ])

  const handleCardResolution = (currentId: string, target: Target, card: Card, isArtifice: boolean) => {

    const choice = {
      battleId: battleState.id,
      currentId: currentId,
      card: card,
      target: target,
      isArtifice: isArtifice
    }

    return BattleEngineAPI.card(choice)
  }

  const handleOffensiveCardResponse = async (choice: OffensiveCardResponse) => {
    await BattleEngineAPI.offensiveCardResponse({
      battleId: battleState.id,
      ...choice,
    });

  };


  type BoardClickPayload =
    | {
      type: "cell";
      position: Position;
    }
    | {
      type: "token";
      token: Token;
    };


  async function confirmAmbientPivots() {
    if (!battleState.id || ambientPivotConfirmationPendingRef.current) return;

    ambientPivotConfirmationPendingRef.current = true;
    setIsConfirmingAmbientPivots(true);
    try {
      await BattleEngineAPI.confirmPivot({ battleId: battleState.id });
    } catch (error) {
      console.error("Não foi possível confirmar os pivots de ambiente:", error);
    } finally {
      ambientPivotConfirmationPendingRef.current = false;
      setIsConfirmingAmbientPivots(false);
    }
  }
  const handleAmbientPivotSelection = (
    payload: BoardClickPayload,
    letter: string,
    number: number
  ) => {

    const pack = {
      battleId: battleState.id,
      payload: payload,
      letters: letters,
      letter: letter,
      number: number,
      gridCells: gridCells
    }

    BattleEngineAPI.pivot(pack)
  }

  const currentData = battleState.turnOrder[battleState.currentTurnIndex];
  const currentId = currentData?.tokenId;
  const currentToken = currentId ? boardTokens.find((t) => t.id === currentId) : undefined;
  const isPlayerTurn = battleState.status === "In Battle" && currentToken?.type === "player";
  const isGameMaster = campaign?.ownerId === userId;
  const canAnswerSpecialResponse = Boolean(
    pendingSpecialResponse &&
    (isGameMaster || pendingSpecialResponse.responderUserId === userId),
  );
  const handleSubmitSpecialResponse = async (values: SpecialResponseValues) => {
    if (!pendingSpecialResponse || !battleState.id) return;
    await BattleEngineAPI.resolveSpecialResponse(
      battleState.id,
      pendingSpecialResponse.requestId,
      "submit",
      values,
    );
    setPendingSpecialResponse(null);
  };
  const handleCancelSpecialResponse = async () => {
    if (!pendingSpecialResponse || !battleState.id) return;
    await BattleEngineAPI.resolveSpecialResponse(
      battleState.id,
      pendingSpecialResponse.requestId,
      "cancel",
    );
    setPendingSpecialResponse(null);
  };
  const activeMechanicsForToken = (tokenId: string): ActiveMechanic[] =>
    (battleState.activeMechanics ?? []).filter((mechanic) => {
      const targetId = mechanic.metadata?.targetId;
      return typeof targetId === "string"
        ? targetId === tokenId
        : mechanic.sourceTokenId === tokenId;
    });
  const rulerLine = rulerMeasurement && isRulerMeasuring
    ? {
      startX: (rulerMeasurement.start.col - 0.5) * cellSize,
      startY: (rulerMeasurement.start.row - 0.5) * cellSize,
      endX: (rulerMeasurement.end.col - 0.5) * cellSize,
      endY: (rulerMeasurement.end.row - 0.5) * cellSize,
      labelOnLeft: rulerMeasurement.end.col === cols,
    }
    : null;

  return (
    <div className="relative flex w-full min-h-screen bg-gray-900 text-white overflow-x-hidden">
      <div className="relative flex-1" style={{ maxWidth: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw" }}>
        <BoardToolbox
          activeTool={activeBoardTool}
          isGameMaster={isGameMaster}
          onSelectTool={handleToolSelection}
        />
        {/* Controls */}
        {isGameMaster && battleState.status !== "In Battle" && (
          <div className="absolute flex items-center gap-4  z-20 rounded-md p-2" style={{ top: 6, left: 6 }}>
            <SettingsDropdown
              rows={rows}
              cols={cols}
              backgroundImage={backgroundImage}
              onChangeRows={(v) => setRows(Number(v))}
              onChangeCols={(v) => setCols(Number(v))}
              onChangeBackgroundImage={setBackgroundImage}
              onGenerateMazeOpen={(v) => setGenerateMazeOpen(v)}
              onMapSelect={(b) => setIsMapSelectOpen(b)}
            />

            <div className="ml-4 font-semibold text-blue-400 whitespace-nowrap">
              Zoom: {Math.round(zoom * 100)}%
            </div>
          </div>
        )}
        {!isGameMaster && campaign && !selectedMapa && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950/80 p-6 text-center">
            <div className="max-w-md rounded-xl border border-cyan-900 bg-gray-900 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-cyan-300">Aguardando direcionamento</h2>
              <p className="mt-2 text-sm text-gray-300">
                O mestre ainda não definiu o mapa que você deve visualizar nesta campanha.
              </p>
            </div>
          </div>
        )}
        {/* VIEWPORT */}
        <div
          ref={boardViewportRef}
          className="w-full h-full overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{ position: "relative" }}
        >
          {/* WORLD */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "top left",
              position: "absolute",
              left: 0,
              top: 0,
              cursor: mouseStyle,
            }}
          >
            <div style={{ paddingTop: 48 }}>
              {/* Header letras */}
              <div className="flex ml-10 relative" style={{ userSelect: "none" }}>
                {letters.map((l) => (
                  <div
                    key={l}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {l}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex">
                {/* Coluna números */}
                <div className="flex flex-col select-none">
                  {Array.from({ length: rows }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* GRID */}
                <div
                  className="grid relative overflow-hidden"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                    backgroundImage: backgroundImage
                      ? `url(${backgroundImage})`
                      : undefined,
                    backgroundSize: "100% 100%",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",

                  }}
                >
                  {Array.from({ length: rows }, (_, row) =>
                    letters.map((l) => {
                      const coord = `${l}${row + 1}`;
                      const colIndex = letters.indexOf(l) + 1;

                      const isSel = coord === selectedCell;

                      const tok = boardTokens.find(
                        (t) =>
                          t.position.col === colIndex &&
                          t.position.row === row + 1
                      );

                      const mapObj = boardMapObjects.find(
                        (m) => m.position.col === colIndex && m.position.row === row + 1
                      )

                      const inB = battleState.status === "In Battle";

                      const cardInstances = inB ? battleState.mechanicEntitiesInstances.find(
                        (c) =>
                          c.position.col === colIndex &&
                          c.position.row === row + 1
                      ) : undefined;

                      const effectClasses = tok
                        ? getTokenVisualEffects(tok).classes
                        : [];

                      const effectOverlays = tok
                        ? getTokenVisualEffects(tok).overlays
                        : [];

                      const isCurr = tok?.id === currentId;
                      const isTokSel = tok?.id === selectedTokenId;

                      const isDead = (tok?.currentLife ?? 1) <= 0;

                      return (
                        <div
                          key={coord}
                          onClick={(event) => {
                            if (activeBoardTool === "ruler") {
                              event.preventDefault();
                              return;
                            }

                            handleCellClick(l, row + 1, tok);
                          }}
                          onMouseDown={(event) =>
                            handleRulerMouseDown(event, {
                              col: colIndex,
                              row: row + 1,
                            })
                          }
                          onMouseMove={() =>
                            handleRulerMouseMove({
                              col: colIndex,
                              row: row + 1,
                            })
                          }

                          className={[
                            "border border-gray-700 flex items-center justify-center transition-colors duration-150 relative",
                            isSel
                              ? "border-green-400 shadow-[0_0_10px_2px_rgba(34,197,94,0.7)]"
                              : "hover:bg-gray-800",
                            previewCells.has(`${colIndex}-${row + 1}`)
                              ? "bg-red-500/30 border-red-400"
                              : "",
                          ].join(" ")}
                          style={{
                            width: cellSize,
                            height: cellSize,

                          }}
                          onDragOver={(e) => {
                            const dragged = draggedTokenRef.current;
                            if (inB && dragged) {
                              const measurement = measureCells(dragged.position, { col: colIndex, row: row + 1 });
                              if ((battleState.movedThisTurn?.[dragged.id] && measurement.distance > 0) ||
                                  measurement.distance > (dragged.naturalMovement ?? 6)) {
                                e.dataTransfer.dropEffect = "none";
                                return;
                              }
                              setRulerMeasurement(measurement);
                            }
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            draggedTokenRef.current = null;
                            clearRulerMeasurement();
                            const id = e.dataTransfer.getData("tokenId");
                            const fromLib =
                              e.dataTransfer.getData("fromLibrary") === "true";

                            if (fromLib) {
                              placeTokenOnBoard(id, colIndex, row + 1);
                            } else if (id === currentId) {
                              moveTokenOnBoard(id, colIndex, row + 1);
                            }
                          }}
                        >
                          {tok && (
                            <div
                              className="relative w-full h-full flex items-center justify-center"
                              onMouseEnter={(event) => {
                                if (!inB) return;
                                const mechanics = activeMechanicsForToken(tok.id);
                                if (mechanics.length === 0) return;

                                setHoveredTokenMechanics({ token: tok, mechanics });
                                setMechanicsTooltipPosition({ x: event.clientX, y: event.clientY });
                              }}
                              onMouseMove={(event) => {
                                if (!inB || !hoveredTokenMechanics) return;
                                setMechanicsTooltipPosition({ x: event.clientX, y: event.clientY });
                              }}
                              onMouseLeave={() => setHoveredTokenMechanics(null)}
                            >
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

                              {inB && tok.visualOverlays?.map((o) => (
                                <div
                                  key={o.id}
                                  className={o.type}
                                  style={{
                                    // Overlays are purely visual. Let pointer and drag events
                                    // reach the token image underneath them.
                                    pointerEvents: "none",
                                    position: "absolute",
                                    width: o.size * cellSize,
                                    height: o.size * cellSize,
                                    left: "50%",
                                    top: "50%",
                                    transform: "translate(-50%, -50%)",
                                    backgroundImage: `url(${o.gifPath})`,
                                    backgroundSize: "cover",
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "center",
                                    zIndex: 30,
                                  }}
                                />
                              ))}

                              {effectOverlays.map((ov) => (
                                <div
                                  key={ov.id}
                                  className={`${ov.className} pointer-events-none absolute inset-0 z-20`}
                                />
                              ))}

                              <img
                                src={tok.imageUrl}
                                alt={tok.name}
                                className={[
                                  "absolute rounded object-cover transition-all duration-300",

                                  ...effectClasses,

                                  isCooling && tok.id === selectedTokenId
                                    ? "filter grayscale"
                                    : "",

                                  isDead
                                    ? "grayscale brightness-50 opacity-70"
                                    : "",



                                ].join(" ")}
                                draggable={tok?.id === currentId}
                                onDragStart={(e) => {
                                  const isTokenArrested = boardTokens.some(
                                    (t) =>
                                      t.id === tok?.id &&
                                      Array.isArray(t.tokenEffects) &&
                                      t.tokenEffects.some(
                                        (eff) => eff.effectType === "preso"
                                      )
                                  );

                                  if (
                                    tok?.id !== currentId ||
                                    isTokenArrested
                                  )
                                    { e.preventDefault(); return; }

                                  e.dataTransfer.setData("tokenId", tok.id);
                                  draggedTokenRef.current = tok;
                                  if (inB) {
                                    setRulerMeasurement(measureCells(tok.position, tok.position));
                                    setIsRulerMeasuring(true);
                                    setHoveredTokenMechanics(null);
                                  }
                                  e.dataTransfer.setData(
                                    "fromLibrary",
                                    "false"
                                  );
                                }}
                                onDragEnd={() => {
                                  draggedTokenRef.current = null;
                                  clearRulerMeasurement();
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
                                      border: isCurr
                                        ? "2px solid white"
                                        : "none",
                                    }
                                    : isTokSel
                                      ? {
                                        boxShadow:
                                          "0 0 10px 3px rgba(34,197,94,0.8)",
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
                                width:
                                  (cardInstances.pivotSettings.range * 2 + 1) *
                                  cellSize,
                                height:
                                  (cardInstances.pivotSettings.range * 2 + 1) *
                                  cellSize,
                                zIndex: 1,
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                              }}
                            >
                              <img
                                src={cardInstances.pivotSettings.areaImgUrl}
                                className="w-full h-full object-cover rounded overflow-hidden"
                              />
                            </div>
                          )}

                          {mapObj && (
                            <div className="absolute w-full h-full flex items-center justify-center">
                              <img src={mapObj.imgUrl} alt="Map Object" className="absolute rounded object-cover transition-filter duration-200" />
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}

                  {rulerLine && rulerMeasurement && (
                    <>
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 z-[60] overflow-visible"
                        style={{
                          width: cols * cellSize,
                          height: rows * cellSize,
                        }}
                      >
                        <line
                          x1={rulerLine.startX}
                          y1={rulerLine.startY}
                          x2={rulerLine.endX}
                          y2={rulerLine.endY}
                          stroke="#60a5fa"
                          strokeWidth="2"
                        />
                        <circle
                          cx={rulerLine.startX}
                          cy={rulerLine.startY}
                          r="4"
                          fill="#93c5fd"
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={rulerLine.endX}
                          cy={rulerLine.endY}
                          r="4"
                          fill="#93c5fd"
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                      </svg>

                      <div
                        className="pointer-events-none absolute z-[70] whitespace-nowrap rounded border border-black bg-black/70 px-2 py-1 text-xs font-semibold text-white shadow-lg"
                        style={{
                          left: rulerLine.endX,
                          top: rulerLine.endY,
                          transform: rulerLine.labelOnLeft
                            ? "translate(calc(-100% - 10px), -50%)"
                            : "translate(10px, -50%)",
                        }}
                      >
                        {formatCellDistance(rulerMeasurement.distance)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* OVERLAY DE PREVIEW */}

      </div>

      {battleState.status === "In Battle" && hoveredTokenMechanics && (
        <ActiveMechanicsTooltip
          token={hoveredTokenMechanics.token}
          mechanics={hoveredTokenMechanics.mechanics}
          position={mechanicsTooltipPosition}
        />
      )}

      {pendingSpecialResponse && canAnswerSpecialResponse && (
        <SpecialResponseForm
          key={`special-response:${pendingSpecialResponse.requestId}`}
          pending={pendingSpecialResponse}
          onSubmit={handleSubmitSpecialResponse}
          onCancel={handleCancelSpecialResponse}
        />
      )}

      {/* Renderização do ActionForm de resposta imediata (modal central, sem pular) */}
      {!pendingSpecialResponse && pendingFreeResponse && BattleViewRules.showForm(campaign, battleState, userId) && (() => {
        const responder = boardTokens.find(t => t.id === pendingFreeResponse.responderId);
        const target = boardTokens.find(t => t.id === pendingFreeResponse.paralyzedId);
        if (!responder || !target) return null;
        if (responder.type !== "player") return null;

        // Segurança extra: se por algum motivo range mudou, não renderiza
        if (!isInAttackRange(responder, target, "fisico")) return null;

        return (
          <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
            <div className="absolute inset-0" />
            <div className="relative z-10 w-full max-w-md">
              <ActionForm
                key={freeResponseFormKey}
                token={responder}
                findedTarget={selectedTarget}
                availableActions={battleState.accumulatedActions[responder.id] ?? 1}
                onExecute={(choice) => handleExecuteResponseAction(responder.id, target.id, choice)}
                onSelectionTarget={(b) => { setInTargetSelection(b); setSelectedTarget(null) }}
                onPass={() => Promise.resolve()}
                possibleTargets={[target]}
                hidePass
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
        className={`fixed top-0 right-0 h-full bg-gray-900 shadow-lg border-l border-gray-700 transition-transform duration-300 z-40 overflow-auto ${sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        style={{ width: sidebarWidth }}
      >
        <Sidebar
          tokens={createdTokens}
          tokenBeingEdited={tokenBeingEdited}
          cards={createdCards}
          cardBeingEdited={cardBeingEdited}
          addToken={addCreatedToken}
          updateToken={updateCreatedToken}
          onEditToken={handleEditToken}
          onEditCard={handleEditCard}
          onEditItem={handleEditItem}
          onSaveEditedToken={handleSaveEditedToken}
          onSaveEditedCard={handleSaveEditedCard}
          onSaveEditedItem={handleSaveEditedItem}
          onCloseEditedToken={setTokenBeingEdited}
          onCloseEditedCard={setCardBeingEdited}
          onCloseEditedItem={setItemBeingEdited}
          removeToken={removeCreatedToken}
          addCard={addCard}
          removeCard={removeCard}
          items={createdItems}
          itemBeingEdited={itemBeingEdited}
          addItem={addItem}
          removeItem={removeItem}
          setIntroduction={setIntroductionAnimation}
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
          battleState={battleState}
          onEndBattle={handleEndBattle}
          onNextTurn={handleNextTurn}
          onStartBattle={handleStartBattle}
          boardBoss={boardBoss}
          boardTokens={boardTokens}
          campaign={campaign}
          userId={userId}
          users={users}
        />


      </div>
      {onlineCampaignUsers.length > 0 && (
        <div
          className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap gap-2 pointer-events-none"
          aria-label="Usuários online na campanha"
        >
          {onlineCampaignUsers.map((onlineUser) => (
            <div
              key={onlineUser.id}
              className="flex items-center gap-2 border border-slate-600/80 bg-slate-950/85 px-2.5 py-1.5 text-xs font-medium text-slate-100 shadow-lg backdrop-blur-sm"
              title={`${onlineUser.name} está online`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm shadow-[0_0_7px_currentColor]"
                style={{ backgroundColor: onlineUser.color, color: onlineUser.color }}
                aria-hidden="true"
              />
              <span className="max-w-36 truncate">{onlineUser.name}</span>
            </div>
          ))}
        </div>
      )}
      {/* ActionForm during battle */}
      {!pendingSpecialResponse && isPlayerTurn && currentToken && !pendingAttack && !pendingFreeResponse && !inCardSelection && battleState.tokensInOffensiveCard.length <= 0 && !isAmbientPivotSelection && BattleViewRules.showForm(campaign, battleState, userId) && (
        <div className="fixed bottom-4 left-4 z-30">
          <ActionForm
            key={`turn-action:${battleState.id}:${currentId}:${battleState.turnVersion}:${battleState.phase}:${battleState.accumulatedActions[currentId] ?? 0}`}
            token={currentToken}
            findedTarget={selectedTarget}
            availableActions={battleState.accumulatedActions[currentId] ?? 0}
            onExecute={handleExecuteAction}
            onSelectionTarget={(b) => setInTargetSelection(b)}
            onPass={handleNextTurn}
            possibleTargets={boardTokens.filter((t) => t.id !== currentId)}
            restrictedMode={false}
          />
        </div>
      )}

      {/* ReactionPrompt */}
      {!pendingSpecialResponse && pendingAttack &&
        boardTokens.find((t) => t.id === pendingAttack.targetId)?.type === "player" &&
        pendingAttack.isReactionAllowed &&
        pendingAttack.pendingReactions.length > 0 &&
        !pendingEsquivaRoll && BattleViewRules.showForm(campaign, battleState, userId) && (
          <ReactionPrompt
            key={reactionFormKey}
            actor={{
              ...(boardTokens.find((t) => t.id === pendingAttack.targetId) as Token),
              reactionType: pendingAttack.pendingReactions[0].type as "consistencia" | "destreza",
            }}
            tokenCards={(boardTokens.find((t) => t.id === pendingAttack.targetId))?.cards}
            availableActions={battleState.accumulatedActions[pendingAttack.targetId] ?? 1}
            availableMana={boardTokens.find((t) => t.id === pendingAttack.targetId)?.currentMana ?? 0}
            certaintyDieCharges={boardTokens.find((t) => t.id === pendingAttack.targetId)?.certaintyDiceRemaining ?? 0}
            diretionalActionType={pendingAttack.attackAttribute}
            diretionalActionValue={pendingAttack.attackRoll}
            isReactionAllowed={pendingAttack.isReactionAllowed}

            disabledReason={!pendingAttack.isReactionAllowed ? "Reação bloqueada (Paralisia/ação livre)." : undefined}
            prevActions={battleState?.previsionActions?.[formatPrevisionAttackKey(pendingAttack.targetId, pendingAttack.attackerId)] ?? {}}
            onSkip={handleCancelReaction}
            onPrev={handlePrevAction}
            onReact={(actorId, reactionType, usedMana, usedActions, usedCertaintyDie, usedItem) => {
              void actorId;
              return handleReaction({
                reactionType,
                usedMana,
                usedActions,
                usedCertaintyDie,
                usedItem,
              });
            }}
            onCancel={handleCancelReaction}
          />
        )}

      {/* DefenseResolutionForm */}
      {!pendingSpecialResponse && isInDefenseResolution && pendingEsquivaRoll !== null &&
        pendingAttack &&
        boardTokens.find((t) => t.id === pendingAttack.attackerId)?.type === "player" &&
        BattleViewRules.showForm(campaign, battleState, userId) && (
          <div className="fixed bottom-4 left-4 z-40">
            <DefenseResolutionForm
              key={defenseFormKey}
              attacker={boardTokens.find((t) => t.id === pendingAttack?.attackerId)!}
              defenderName={
                boardTokens.find((t) => t.id === pendingAttack?.targetId)?.name ||
                "Desconhecido"
              }
              reactionResult={pendingEsquivaRoll?.total ?? null}
              availableActions={
                battleState.accumulatedActions[pendingAttack.attackerId] ?? 1
              }
              onResolve={(usedActions, usedMana) =>
                handleDefenseResolution({ usedActions, usedMana })}

              onCancel={handleCancelReaction}
            />
          </div>
        )}

      {/* Card Form */}
      {!pendingSpecialResponse && inCardSelection && pendingCardResolution && pendingCardResolution?.type === "player" && !pendingAttack &&
        BattleViewRules.showForm(campaign, battleState, userId) && (
        <>
          <CardForm
            key={cardFormKey}
            tokenTrigger={pendingCardResolution as Token}
            target={boardTokens.filter(t => t.id !== (pendingCardResolution as Token).id)}
            defensiveCards={false}
            availableActions={searchAccumulatedActions(pendingCardResolution.id) ?? 1}
            availableMana={searchCurrentMana(pendingCardResolution)}
            cardTimeToRecharge={(card) => formatRechargeCardRecordReturn(battleState.timeToRechargeCard, (pendingCardResolution as Token).id, card.id)}
            availableCardsIds={battleState.cardsNotRechargeds[(pendingCardResolution as Token).id] ?? []}
            onClose={() => closeCardForm()}
            onConfirm={(card, target) => handleCardResolution(pendingCardResolution.id, target as Target, card, false)}
          />
        </>
      )}

      {!pendingSpecialResponse && battleState.tokensInOffensiveCard.length > 0 &&
        offensivePendingCard && offensiveCardAttackerId &&
        offensiveCardScore !== null &&
        offensiveCardTestScore !== null &&
        BattleViewRules.showForm(campaign, battleState, userId) &&
        battleState.tokensInOffensiveCard.slice(0, 1).map((queuedDefender) => {
          const defenderToken = boardTokens.find((token) => token.id === queuedDefender.id);
          if (!defenderToken) return null;

          return (
            <OffensiveCardResolution
              key={`${offensiveCardFormKey}:${defenderToken.id}:${offensiveCardScore}:${offensiveCardTestScore}`}
              availableActions={battleState.accumulatedActions[defenderToken.id] ?? 1}
              availableMana={defenderToken.currentMana ?? 0}
              availableCertainyDie={defenderToken.certaintyDiceRemaining ?? 0}
              card={offensivePendingCard}
              cardResult={offensiveCardScore}
              testResult={offensiveCardTestScore}
              defenderToken={defenderToken}
              defenderTokenPrevActions={battleState.previsionActions?.[formatPrevisionAttackKey(defenderToken.id, offensiveCardAttackerId)] ?? 0}
              tokenBattlePosition={(attr) => searchTokenPosition(defenderToken.id, attr)}
              onExecute={handleOffensiveCardResponse}
            />
          );
        })}

      {!pendingSpecialResponse && isAmbientPivotSelection && armedCard && (
        <div className="fixed inset-0 z-[90] pointer-events-none">
          {/* painel flutuante — ESTE sim recebe clique */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-orange-500 rounded p-3 shadow-lg pointer-events-auto">
            <h3 className="text-sm font-bold text-orange-400">
              Selecionar Pivots ({battleState.remainingPivots} restantes)
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
                className="mt-2 w-full bg-orange-600 hover:bg-orange-700 text-sm font-semibold rounded p-1 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void confirmAmbientPivots()}
                disabled={isConfirmingAmbientPivots}
              >
                {isConfirmingAmbientPivots ? "Confirmando..." : "Confirmar Área"}
              </button>
            )}
          </div>
        </div>
      )}


      {inventoryOpen && (() => {
        const token = boardTokens.find(t => t.id === selectedTokenId);
        if (!token) return null;

        return (
          <InventoryUI
            key={token.id + "-" + (token.inventory.commonSlot?.length ?? 0)}
            token={token}
            boardTokens={boardTokens}
            battleState={battleState}
            onClose={setInventoryOpen}
            swap={async (item, index) => {
              try {
                const updatedToken = await BattleEngineAPI.swapItem(
                  {
                    operation: "equip",
                    tokenId: token.id,
                    itemId: item.id,
                    itemIndex: index,
                  },
                );

                const hydratedToken = TokenInstaceMapper(
                  updatedToken,
                  cardsRef.current,
                  itemsRef.current,
                );

                setBoardTokens((previousTokens) =>
                  previousTokens.map((boardToken) =>
                    boardToken.id === hydratedToken.id
                      ? hydratedToken
                      : boardToken,
                  ),
                );
              } catch (error) {
                console.error("Não foi possível equipar o item:", error);
              }
            }}
            unequip={async (equippedSlot: EquippedInventorySlot) => {
              try {
                const updatedToken = await BattleEngineAPI.swapItem({
                  operation: "unequip",
                  tokenId: token.id,
                  equippedSlot,
                });

                const hydratedToken = TokenInstaceMapper(
                  updatedToken,
                  cardsRef.current,
                  itemsRef.current,
                );

                setBoardTokens((previousTokens) =>
                  previousTokens.map((boardToken) =>
                    boardToken.id === hydratedToken.id
                      ? hydratedToken
                      : boardToken,
                  ),
                );
              } catch (error) {
                console.error("Não foi possível remover o item equipado:", error);
              }
            }}
            consumeArtifice={async (item, index, target) => {
              const updatedToken = await BattleEngineAPI.consumeArtifice({
                battleId: battleState.id,
                tokenId: token.id,
                itemId: item.id,
                itemIndex: index,
                target,
              });
              const hydratedToken = TokenInstaceMapper(
                updatedToken,
                cardsRef.current,
                itemsRef.current,
              );
              setBoardTokens((previousTokens) =>
                previousTokens.map((boardToken) =>
                  boardToken.id === hydratedToken.id
                    ? hydratedToken
                    : boardToken,
                ),
              );
            }}
          />
        );
      })()}

      {introdutionAnimation && boardBoss && (
        <CinematicDisplayNameUI
          boardBoss={boardBoss}
          onEnd={(b) => setIntroductionAnimation(!b)}
        />
      )}

      {isGameMaster && isMapSelectOpen && (
        <MapSelect
          mapas={mapas}
          selectedMapa={selectedMapa}
          onChoice={handleSelectMapa}
          onCreateNew={handleCreateMapa}
          onClose={() => setIsMapSelectOpen(false)}
          members={mapRouting?.members}
          onDirectMembers={mapRouting ? handleDirectMembersToMap : undefined}
        />
      )}

      {mapObjectCreateForm && (
        <CreateMapObject
          position={cellToPosition(selectedCell ?? "A1")}
          createdMapas={mapas}
          selectedMapa={selectedMapa}
          createdItems={createdItems}
          onClose={() => setMapObjectCreateForm(false)}
          generatePairDoor={(door) => {
            setMapas((currentMaps) =>
              generatePairDoor(currentMaps, selectedMapa?.id, door),
            );
          }}
          setBoardMapObjects={setBoardMapObjects}
        />
      )
      }

      {generateMazeOpen && (
        <GenerateMaze
          rows={rows}
          cols={cols}
          setBoardMapObjects={setBoardMapObjects}
          onClose={() => setGenerateMazeOpen(false)}
        />
      )}

      {presentedItem && (
        <PresentItem
          item={presentedItem}
          onClose={() => setPresentedItem(null)}
        />
      )}

      {currentLevelUpToken && (
        <SkillPanel
          token={currentLevelUpToken}
          availablePoints={getLevelUpResult(currentLevelUpToken).pointsToAllocate}
          onClose={handleCloseSkillPanel}
          onConfirm={handleConfirmLevelUp}
        />
      )}

    </div>
  );
};

export { BoardPage };
export default BoardPage;
