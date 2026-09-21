import React from "react";
import { useMusicPlayer } from "../context/MusicContext";
import { Play, Pause, Music2 } from "lucide-react";
import { useMusicLibrary } from "../../hooks/useMusicLibrary";
import type { Track } from "../../types/music";

import { MusicDJPanel } from "./MusicDJPanel";

const rowBase =
  "w-full flex items-center justify-between gap-3 rounded bg-gray-800 hover:bg-gray-700 transition-colors px-3 py-2";

const titleBase =
  "flex items-center gap-2 text-sm text-white truncate";

const badgeBase =
  "ml-auto text-[10px] uppercase tracking-wide bg-gray-700 text-gray-200 rounded px-2 py-0.5";

interface MusicListProps {
  searchQuery?: string;
}

const normalizeSearch = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase();

export const MusicList: React.FC<MusicListProps> = ({ searchQuery = "" }) => {
  const { tracks } = useMusicLibrary();
  const { playTrack, stop, currentTrack, isPlaying } = useMusicPlayer();
  const filteredTracks = tracks.filter((track) =>
    normalizeSearch(track.name).includes(normalizeSearch(searchQuery)),
  );

  const handleClick = async (track: Track) => {
    const isSameTrack = currentTrack?.id === track.id;

    if (isSameTrack && isPlaying) {
      stop();
      return;
    }

    await playTrack(track);
  };

  return (
    <div className="flex flex-col gap-2">
      <MusicDJPanel />

      {filteredTracks.length === 0 ? (
        <p className="py-2 text-center text-sm text-gray-400">
          {tracks.length === 0 ? "Nenhuma música disponível." : "Nenhuma música encontrada."}
        </p>
      ) : filteredTracks.map((track) => {
        const active =
          currentTrack?.id === track.id && isPlaying;

        return (
          <div key={track.id} className={rowBase}>
            <div className={titleBase}>
              <Music2 className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="truncate">{track.name}</span>
              <span className={badgeBase}>{track.ext}</span>
            </div>

            <button
              onClick={() => handleClick(track)}
              className={`h-8 w-8 flex items-center justify-center rounded transition
                ${
                  active
                    ? "bg-purple-700 hover:bg-purple-800"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
            >
              {active ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default MusicList;
