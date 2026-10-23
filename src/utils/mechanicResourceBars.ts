import type { ActiveMechanic } from "../types/battle";

const RESOURCE_COLOR_NAMES = [
  "Yellow",
  "Red",
  "Purple",
  "Darkgreen",
  "Green",
  "Pink",
  "Black",
] as const;

export type ResourceColorName = (typeof RESOURCE_COLOR_NAMES)[number];

/** Natural-language mechanic colors translated to their board RGB value. */
export const RESOURCE_COLOR_RGB: Readonly<Record<ResourceColorName, string>> = {
  Yellow: "rgb(255, 255, 0)",
  Red: "rgb(255, 0, 0)",
  Purple: "rgb(128, 0, 128)",
  Darkgreen: "rgb(0, 100, 0)",
  Green: "rgb(0, 128, 0)",
  Pink: "rgb(255, 192, 203)",
  Black: "rgb(0, 0, 0)",
};

export interface MechanicResourceBar {
  id: string;
  current: number;
  max: number;
  colorName: ResourceColorName;
  color: string;
  resourceName: string;
}

interface ResourceKeyParts {
  colorName: ResourceColorName;
  resourceName: string;
}

const CURRENT_RESOURCE_KEY_PATTERN = new RegExp(
  `^current(${RESOURCE_COLOR_NAMES.join("|")})([A-Z][A-Za-z0-9]*)$`,
);

function parseCurrentResourceKey(key: string): ResourceKeyParts | null {
  const match = CURRENT_RESOURCE_KEY_PATTERN.exec(key);
  if (!match) return null;

  return {
    colorName: match[1] as ResourceColorName,
    resourceName: match[2],
  };
}

function readResourceBar(
  mechanic: ActiveMechanic,
  currentKey: string,
  maxKey: string,
): MechanicResourceBar | null {
  const keyParts = parseCurrentResourceKey(currentKey);
  const metadata = mechanic.metadata;
  if (!keyParts || !metadata) return null;

  const current = metadata[currentKey];
  const max = metadata[maxKey];
  if (
    typeof current !== "number" ||
    !Number.isFinite(current) ||
    typeof max !== "number" ||
    !Number.isFinite(max) ||
    max <= 0
  ) return null;

  return {
    id: `${mechanic.id}:${currentKey}:${maxKey}`,
    current,
    max,
    colorName: keyParts.colorName,
    color: RESOURCE_COLOR_RGB[keyParts.colorName],
    resourceName: keyParts.resourceName,
  };
}

/**
 * Resolves bars from direct current<Color><Resource>/max<Color><Resource>
 * metadata and from the virtual-resource metadata-key declarations.
 */
export function resolveMechanicResourceBars(
  mechanics: readonly ActiveMechanic[],
): MechanicResourceBar[] {
  return mechanics.flatMap((mechanic) => {
    const metadata = mechanic.metadata;
    if (!metadata) return [];

    const bars: MechanicResourceBar[] = [];
    const visitedPairs = new Set<string>();

    const addPair = (currentKey: string, maxKey: string) => {
      const pairKey = `${currentKey}:${maxKey}`;
      if (visitedPairs.has(pairKey)) return;
      visitedPairs.add(pairKey);

      const bar = readResourceBar(mechanic, currentKey, maxKey);
      if (bar) bars.push(bar);
    };

    const virtualCurrentKey = metadata.virtualResourceCurrentMetadataKey;
    const virtualMaxKey = metadata.virtualResourceMaxMetadataKey;
    if (typeof virtualCurrentKey === "string" && typeof virtualMaxKey === "string") {
      addPair(virtualCurrentKey, virtualMaxKey);
    }

    Object.keys(metadata).forEach((currentKey) => {
      const keyParts = parseCurrentResourceKey(currentKey);
      if (!keyParts) return;

      addPair(currentKey, `max${keyParts.colorName}${keyParts.resourceName}`);
    });

    return bars;
  });
}
