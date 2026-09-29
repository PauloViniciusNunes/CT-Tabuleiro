import React from "react";

interface StatusBarsProps {
  currentLife: number;
  maxLife: number;
  currentMana: number;
  maxMana: number;
  teamColor: string;
}

function resourceLabel(current: number, max: number): string {
  return `${Math.floor(current)}/${Math.floor(max)}`;
}

export const StatusBars: React.FC<StatusBarsProps> = ({
  currentLife,
  maxLife,
  currentMana,
  maxMana,
  teamColor,
}) => {
  const lifePct = maxLife > 0
    ? Math.max(0, Math.min(100, (currentLife / maxLife) * 100))
    : 0;
  const manaPct = maxMana > 0
    ? Math.max(0, Math.min(100, (currentMana / maxMana) * 100))
    : 0;
  const lifeLabel = resourceLabel(currentLife, maxLife);
  const manaLabel = resourceLabel(currentMana, maxMana);
  const widestLabel = lifeLabel.length >= manaLabel.length
    ? lifeLabel
    : manaLabel;

  if (teamColor) { ; }

  return (
    <div className="absolute bottom-full mb-1 flex w-full flex-col items-center pointer-events-none">
      <div
        className="relative mb-1 h-4 w-fit overflow-hidden rounded-sm border border-gray-700 bg-gray-900 px-0.5"
        aria-label={`Vida: ${lifeLabel}`}
      >
        <span className="invisible block whitespace-nowrap text-[9px] font-bold leading-none">
          {widestLabel}
        </span>
        <div
          className="absolute left-0 top-0 h-full rounded-sm bg-red-600 transition-all duration-300"
          style={{ width: `${lifePct}%` }}
        />
        <div className="absolute inset-0 z-10 flex items-center justify-center whitespace-nowrap px-0.5 text-[9px] font-bold leading-none text-white">
          {lifeLabel}
        </div>
      </div>

      <div
        className="relative h-4 w-fit overflow-hidden rounded-sm border border-gray-700 bg-gray-900 px-0.5"
        aria-label={`Mana: ${manaLabel}`}
      >
        <span className="invisible block whitespace-nowrap text-[9px] font-bold leading-none">
          {widestLabel}
        </span>
        <div
          className="absolute left-0 top-0 h-full rounded-sm bg-blue-500 transition-all duration-300"
          style={{ width: `${manaPct}%` }}
        />
        <div className="absolute inset-0 z-10 flex items-center justify-center whitespace-nowrap px-0.5 text-[9px] font-bold leading-none text-white">
          {manaLabel}
        </div>
      </div>
    </div>
  );
};

export default StatusBars;
