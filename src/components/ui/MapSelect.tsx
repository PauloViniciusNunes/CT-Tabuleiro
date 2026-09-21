import React, { useState } from "react";
import type { Mapa } from "../../types/mapas";
import type { CampaignMapRoutingMember } from "../../types/campaign";

interface MapSelectProps {
  mapas: Mapa[];
  selectedMapa?: Mapa;
  onChoice: (mapa: Mapa) => void;
  onCreateNew: (mapName: string) => void;
  onClose: () => void;
  members?: CampaignMapRoutingMember[];
  onDirectMembers?: (mapId: string, userIds: string[]) => Promise<void>;
}

const MapSelect: React.FC<MapSelectProps> = ({
  mapas,
  selectedMapa,
  onChoice,
  onCreateNew,
  onClose,
  members = [],
  onDirectMembers,
}) => {

  const [creatingNewMap, setCreatingNewMap] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [routingMapId, setRoutingMapId] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newMapName.trim()) return;

    onCreateNew(newMapName);

    setNewMapName("");
    setCreatingNewMap(false);
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const directMembers = async (mapId: string, userIds: string[]) => {
    if (!onDirectMembers || userIds.length === 0) return;

    setRoutingMapId(mapId);
    setRoutingError(null);
    try {
      await onDirectMembers(mapId, userIds);
      setSelectedMemberIds([]);
    } catch (error) {
      setRoutingError(error instanceof Error ? error.message : "Não foi possível direcionar os jogadores.");
    } finally {
      setRoutingMapId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">

      <div className="bg-gray-800 p-4 rounded-lg w-[720px] max-h-[80vh] overflow-y-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Selecionar Mapa
          </h2>

          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>

        {onDirectMembers && (
          <section className="mb-5 rounded border border-gray-700 bg-gray-900/60 p-3">
            <h3 className="mb-2 text-sm font-semibold text-cyan-300">
              Jogadores selecionados para direcionamento
            </h3>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const selected = selectedMemberIds.includes(member.userId);

                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => toggleMember(member.userId)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selected
                        ? "border-cyan-300 bg-cyan-500/20 text-cyan-100"
                        : "border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {member.user.name}
                  </button>
                );
              })}
            </div>
            {members.length === 0 && (
              <p className="text-xs text-gray-400">Esta campanha ainda não possui jogadores.</p>
            )}
            {routingError && (
              <p className="mt-2 text-xs text-red-300">{routingError}</p>
            )}
          </section>
        )}

        {/* GRID */}
        <div className="grid grid-cols-3 gap-3">
          {mapas.map((mapa) => {

            const isSelected = selectedMapa?.id === mapa.id;

            return (
              <div
                key={mapa.id}
                onClick={() => onChoice(mapa)}
                className={`
                  cursor-pointer rounded overflow-hidden border-2
                  transition-all duration-150
                  ${isSelected
                    ? "border-cyan-400 scale-[1.02]"
                    : "border-gray-600 hover:border-cyan-700"
                  }
                `}
              >
                <img
                  src={mapa.img}
                  alt={mapa.name}
                  className="w-full h-24 object-cover"
                />

                <div className="text-center text-sm text-white p-2 bg-gray-900">
                  {mapa.name}
                </div>

                {onDirectMembers && (
                  <div className="space-y-2 border-t border-gray-700 bg-gray-900 p-2">
                    <div className="flex flex-wrap gap-1">
                      {members
                        .filter((member) => member.currentMapId === mapa.id)
                        .map((member) => (
                          <span
                            key={member.userId}
                            className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-100"
                          >
                            {member.user.name}
                          </span>
                        ))}
                      {members.every((member) => member.currentMapId !== mapa.id) && (
                        <span className="text-xs text-gray-500">Nenhum jogador</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={selectedMemberIds.length === 0 || routingMapId !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        void directMembers(mapa.id, selectedMemberIds);
                      }}
                      className="w-full rounded bg-cyan-700 px-2 py-1 text-xs font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Enviar selecionados
                    </button>

                    <button
                      type="button"
                      disabled={members.length === 0 || routingMapId !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        void directMembers(mapa.id, members.map((member) => member.userId));
                      }}
                      className="w-full rounded border border-gray-600 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reagrupar todos aqui
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CREATE MAP */}
        <div className="mt-5 border-t border-gray-700 pt-4">

          {!creatingNewMap && (
            <button
              onClick={() => setCreatingNewMap(true)}
              className="w-full bg-purple-600 hover:bg-purple-500 p-2 rounded font-semibold transition-colors"
            >
              + Novo Mapa
            </button>
          )}

          {creatingNewMap && (
            <div className="space-y-3 animate-fade-in">

              <div>
                <label className="text-sm text-gray-300 font-semibold">
                  Nome do mapa
                </label>

                <input
                  type="text"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="Ex: Castelo Abandonado"
                  className="
                    mt-1 w-full p-2 rounded
                    bg-gray-700
                    border border-gray-600
                    text-white
                    outline-none
                    focus:border-purple-400
                  "
                />
              </div>

              <div className="flex gap-2">

                <button
                  onClick={() => {
                    setCreatingNewMap(false);
                    setNewMapName("");
                  }}
                  className="
                    flex-1
                    bg-gray-700
                    hover:bg-gray-600
                    p-2 rounded
                  "
                >
                  Cancelar
                </button>

                <button
                  onClick={handleCreate}
                  disabled={!newMapName.trim()}
                  className="
                    flex-1
                    bg-purple-600
                    hover:bg-purple-500
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    p-2 rounded
                    font-semibold
                  "
                >
                  Criar
                </button>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default MapSelect;
