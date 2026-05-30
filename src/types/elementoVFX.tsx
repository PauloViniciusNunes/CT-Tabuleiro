import type { Position } from "./card";
import type { Token } from "./token";
import type { Item } from "./item";

export type ElementoVFX = {
  id: string;
  position: Position;

  frames: string[];
  frameIndex: number;

  frameDuration: number; // ms por frame
  lastFrameTime: number;

  imgRotate: number;
};

function vectorModule(v: number[]) {
    let count = 0;

    for (const element of v) {
        count += (element ** 2);
    }

    const sqrt = Math.sqrt(count);
    return sqrt;
}

function scalarProduct(v1: number[], v2: number[]) {
    if (v1.length !== v2.length) return NaN;

    let count = 0;
    for (let i = 0; i < v1.length; i++) {
        count += v1[i] * v2[i];
    }
    return count;
}

function firstOrSecondQuadrant(v: number[]) {
    if (v.length !== 2) return false;

    const x = v[0];
    const y = v[1];

    if ((x >= 0 && y >= 0) || (x < 0 && y >= 0)) {
        return true;
    }

    return false;
}

export function calculateVfxRotate(
    triggerTokenId: string,
    targetTokenId: string,
    boardTokens: Token[]
) {
    const triggerToken = boardTokens.find((t) => t.id === triggerTokenId);
    const targetToken = boardTokens.find((t) => t.id == targetTokenId);

    if (!triggerToken || !targetToken) return 0;

    const twoPiRad = 2 * Math.PI;

    const v1 = [1, 0]; // Vetor unitário aponta para direita no eixo x. Imagens devem estar sempre a direita
    const v2 = [
        targetToken.position.col - triggerToken.position.col,
        targetToken.position.row - triggerToken.position.row
    ];

    const rad = Math.acos(
        scalarProduct(v1, v2) / (vectorModule(v1) * vectorModule(v2))
    );

    const finalRad = firstOrSecondQuadrant(v2)
        ? rad
        : (twoPiRad - rad) % twoPiRad;

    return finalRad * (180 / Math.PI); // 🔥 já retorna em graus
}

export function composeElementoVFX(
  triggerTokenId: string,
  targetTokenId: string,
  frames: string[],
  boardTokens: Token[]
): ElementoVFX | null {
  const trigger = boardTokens.find(t => t.id === triggerTokenId);
  const target = boardTokens.find(t => t.id === targetTokenId);

  if (!trigger || !target || frames.length === 0) return null;

  return {
    id: `${Date.now()}_${Math.random()}`,
    position: target.position,

    frames,
    frameIndex: 0,

    frameDuration: 60, // 🔥 controle fino (ajuste depois)
    lastFrameTime: Date.now(),

    imgRotate: calculateVfxRotate(triggerTokenId, targetTokenId, boardTokens),
  };
}

export function spawnItemVFX(
  tokenId: string,
  targetId: string,
  item: Item | undefined,
  boardTokens: Token[],
  setBoardVfxElements: React.Dispatch<React.SetStateAction<ElementoVFX[]>>,
  playSomeSFX: (s: string) => void,
) {
  if (!item?.vfxUrl || item.vfxUrl.length === 0) return;

  const token = boardTokens.find(t => t.id === tokenId);
  const target = boardTokens.find(t => t.id === targetId);

  if (!token || !target) return;

  const vfx = composeElementoVFX(
    token.id,
    target.id,
    item.vfxUrl,
    boardTokens
  );

  if (!vfx) return;

  setBoardVfxElements(prev => [...prev, vfx]);
  playSomeSFX(item.sfxUrl ?? "");
}