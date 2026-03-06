/// <reference types="vite/client" />

import { useEffect, useMemo, useState } from "react";
import type { Track } from "../types/music";

const AUDIO_EXT_REGEX = /\.(mp3|wav|aac|ogg)$/i;
const PRETTY_NAME = (fileName: string) =>
  fileName
    .replace(AUDIO_EXT_REGEX, "")
    .replace(/[_-]+/g, " ")
    .trim();

export function useMusicLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);

  // Eager + as: 'url' para obter a URL pública do asset
  const modules = useMemo(() => {
    const globbed = import.meta.glob("/src/musics/**/*.{mp3,wav,aac,ogg}", {
      eager: true,
      as: "url",
    }) as Record<string, string>;
    return globbed;
  }, []);

  useEffect(() => {
    const items: Track[] = Object.entries(modules).map(([path, url]) => {
      const file = path.split("/").pop() || "";
      const ext = (file.match(AUDIO_EXT_REGEX)?.[0] || "").replace(".", "").toLowerCase();
      return {
        id: path,
        url,
        name: PRETTY_NAME(file),
        ext,
      };
    });
    items.sort((a, b) => a.name.localeCompare(b.name));
    setTracks(items);
  }, [modules]);

  return { tracks };
}
