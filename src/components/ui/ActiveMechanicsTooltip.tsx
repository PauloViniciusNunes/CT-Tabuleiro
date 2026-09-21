import type { ActiveMechanic } from "../../types/battle";
import type { Token } from "../../types/token";

type ActiveMechanicsTooltipProps = {
  token: Token;
  mechanics: ActiveMechanic[];
  position: { x: number; y: number };
};

function mechanicName(mechanic: ActiveMechanic): string {
  const metadataName = mechanic.metadata?.mechanicName;
  const rawName = mechanic.name
    ?? (typeof metadataName === "string" ? metadataName : mechanic.definitionId);

  return rawName.replaceAll("-", " ").replaceAll("_", " ");
}

export default function ActiveMechanicsTooltip({
  token,
  mechanics,
  position,
}: ActiveMechanicsTooltipProps) {
  return (
    <div
      className="fixed z-[200] pointer-events-none max-w-[220px] rounded border border-black bg-blue-900/90 p-3 text-xs text-gray-100 shadow-xl"
      style={{
        left: position.x + 12,
        top: position.y + 12,
      }}
    >
      <p className="font-semibold text-blue-200">{token.name}</p>
      <p className="mt-1 font-semibold text-gray-100">Mecânicas ativas:</p>

      <ul className="mt-1 space-y-1">
        {mechanics.map((mechanic) => (
          <li key={mechanic.id} className="border-l-2 border-blue-400 pl-2">
            <span className="capitalize">{mechanicName(mechanic)}</span>
            <span className="ml-1 text-gray-300">
              · Intensidade {mechanic.intensity}
              {mechanic.duration === undefined ? " · Persistente" : ` · ${mechanic.duration} turno(s)`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
