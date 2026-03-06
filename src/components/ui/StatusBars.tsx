import React from "react";

interface StatusBarsProps {
  currentLife: number;
  maxLife: number;
  currentMana: number;
  maxMana: number;
  teamColor: string;
}

export const StatusBars: React.FC<StatusBarsProps> = ({
  currentLife,
  maxLife,
  currentMana,
  maxMana,
  teamColor,
}) => {
  const lifePct = Math.max(0, Math.min(100, (currentLife / maxLife) * 100));
  const manaPct = Math.max(0, Math.min(100, (currentMana / maxMana) * 100));

  if(teamColor){;}

  return (
    <div className="absolute bottom-full mb-1 w-full flex flex-col items-center pointer-events-none">
      {/* Barra de Vida */}
      <div className="relative w-10 h-4 bg-gray-900 rounded-sm border border-gray-700 mb-1">
        <div
          className="absolute top-0 left-0 h-full bg-red-600 rounded-sm transition-all duration-300"
          style={{ width: `${lifePct}%`, zIndex: 3}}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white pointer-events-none" style={{zIndex: 3}}>
          {`${Math.floor(currentLife)}/${Math.floor(maxLife)}`}
        </div>
      </div>

      {/* Barra de Mana */}
      <div className="relative w-10 h-4 bg-gray-900 rounded-sm border border-gray-700">
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 rounded-sm transition-all duration-300"
          style={{ width: `${manaPct}%` , zIndex: 3}}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white pointer-events-none" style={{zIndex: 3}}>
          {`${Math.floor(currentMana)}/${Math.floor(maxMana)}`}
        </div>
      </div>
    </div>
  );
};

export default StatusBars;
