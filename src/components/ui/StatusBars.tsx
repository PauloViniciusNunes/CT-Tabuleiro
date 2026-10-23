import React from "react";
import type { MechanicResourceBar } from "../../utils/mechanicResourceBars";

interface StatusBarsProps {
  currentLife: number;
  maxLife: number;
  currentMana: number;
  maxMana: number;
  teamColor: string;
  additionalBars?: readonly MechanicResourceBar[];
}

function resourceLabel(current: number, max: number): string {
  return `${Math.floor(current)}/${Math.floor(max)}`;
}

interface ResourceBarProps {
  ariaLabel: string;
  current: number;
  max: number;
  widestLabel: string;
  fillClassName?: string;
  fillColor?: string;
}

function ResourceBar({
  ariaLabel,
  current,
  max,
  widestLabel,
  fillClassName = "",
  fillColor,
}: ResourceBarProps) {
  const percentage = max > 0
    ? Math.max(0, Math.min(100, (current / max) * 100))
    : 0;
  const label = resourceLabel(current, max);

  return (
    <div
      className="relative h-4 w-fit overflow-hidden rounded-sm border border-gray-700 bg-gray-900 px-0.5"
      aria-label={`${ariaLabel}: ${label}`}
    >
      <span className="invisible block whitespace-nowrap text-[9px] font-bold leading-none">
        {widestLabel}
      </span>
      <div
        className={`absolute left-0 top-0 h-full rounded-sm transition-all duration-300 ${fillClassName}`}
        style={{ width: `${percentage}%`, backgroundColor: fillColor }}
      />
      <div className="absolute inset-0 z-10 flex items-center justify-center whitespace-nowrap px-0.5 text-[9px] font-bold leading-none text-white [text-shadow:0_1px_2px_rgb(0_0_0_/_0.95)]">
        {label}
      </div>
    </div>
  );
}

export const StatusBars: React.FC<StatusBarsProps> = ({
  currentLife,
  maxLife,
  currentMana,
  maxMana,
  teamColor,
  additionalBars = [],
}) => {
  const lifeLabel = resourceLabel(currentLife, maxLife);
  const manaLabel = resourceLabel(currentMana, maxMana);
  const widestLabel = [
    lifeLabel,
    manaLabel,
    ...additionalBars.map((bar) => resourceLabel(bar.current, bar.max)),
  ].reduce((widest, label) => label.length > widest.length ? label : widest);

  if (teamColor) { ; }

  return (
    <div className="absolute bottom-full mb-1 flex w-full flex-col items-center gap-1 pointer-events-none">
      {additionalBars.map((bar) => (
        <ResourceBar
          key={bar.id}
          ariaLabel={`${bar.resourceName} virtual ${bar.colorName}`}
          current={bar.current}
          max={bar.max}
          widestLabel={widestLabel}
          fillColor={bar.color}
        />
      ))}

      <ResourceBar
        ariaLabel="Vida"
        current={currentLife}
        max={maxLife}
        widestLabel={widestLabel}
        fillClassName="bg-green-400"
      />

      <ResourceBar
        ariaLabel="Mana"
        current={currentMana}
        max={maxMana}
        widestLabel={widestLabel}
        fillClassName="bg-blue-500"
      />
    </div>
  );
};

export default StatusBars;
