import { CampaignAPI } from "../api/modules/campaigns";
import { UserAPI } from "../api/modules/user";

import { getLoggedUserId } from "../utils/getLoggedUser";

import React, { useEffect, useState } from "react";

import type { Campaign, User } from "../types/campaign";

const CampaignsPage: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [inCreateCampaignForm, setInCreateCampaignForm] = useState<boolean>(false);

    // Estados para o formulário
    const [newCampaignName, setNewCampaignName] = useState("");
    const [newCampaignDescription, setNewCampaignDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Estados para Seleção e Persistência de Membros
    const [isSelectingUsers, setIsSelectingUsers] = useState(false);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // 🟢 1. Adiciona um usuário como membro da campanha no Banco de Dados
    // 🟢 Validação na inclusão de membro
    const handleSelectUser = async (user: User) => {
        // Garante que ambos os IDs existem antes de disparar a API
        if (!user?.id || !activeCampaignId) {
            console.warn("ID do usuário ou da campanha inválido:", { userId: user?.id, activeCampaignId });
            return;
        }

        try {
            await CampaignAPI.addAsMember(activeCampaignId, String(user.id));
            setSelectedUserIds((prev) => [...prev, String(user.id)]);
        } catch (err: any) {
            console.error("Erro ao adicionar membro:", err);
        }
    };

    // 🟢 Validação na abertura do modal
    const handleOpenUserSelection = async (campaignId: string) => {
        if (!campaignId) return;

        setActiveCampaignId(campaignId);
        setIsSelectingUsers(true);
        setIsLoadingMembers(true);

        try {
            const members = (await CampaignAPI.listByCampaign(campaignId)) as any[];

            // Mapeia os IDs retornados tratando possíveis estruturas do backend
            const existingUserIds = members
                .map((m) => m.userId || m.user?.id)
                .filter(Boolean);

            setSelectedUserIds(existingUserIds);
        } catch (err: any) {
            console.error("Erro ao carregar membros:", err);
            setSelectedUserIds([]);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        setIsCreating(true);

        try {
            await CampaignAPI.create({
                name: newCampaignName,
                description: newCampaignDescription,
            } as Campaign);

            setNewCampaignName("");
            setNewCampaignDescription("");
            setInCreateCampaignForm(false);
            const userId = getLoggedUserId()
            if(userId) fetchCampaigns(userId);
        } catch (err: any) {
            setCreateError(err?.message || "Ocorreu um erro ao criar a campanha.");
        } finally {
            setIsCreating(false);
        }
    };

    const fetchCampaigns = async (userId: string) => {
        try {
            setLoading(true);
            setError(null);

            // Chama a API passando o ID do usuário logado
            const data = await CampaignAPI.listByUser(userId);
            const newData = data.map((c: any) => c.campaign)
            setCampaigns(newData as Campaign[]);
        } catch (err: any) {
            setError(err?.message || "Erro ao carregar suas campanhas.");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const _users = await UserAPI.list();
            setUsers(_users as User[]);
        } catch (error: any) {
            setError(error?.message || "Erro ao carregar a lista de usuários.");
        }
    };

    useEffect(() => {
        // 🟢 Obtém o ID do usuário diretamente do localStorage
        const userId = getLoggedUserId();

        if (userId) {
            fetchCampaigns(userId);
        } else {
            // Caso não encontre o token, redireciona para a tela de login
            window.location.href = "/";
            return;
        }

        fetchUsers();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-100">Campanhas</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            Gerencie suas mesas de jogo ou entre em uma sala ativa.
                        </p>
                    </div>
                    <button
                        onClick={() => setInCreateCampaignForm(true)}
                        className="bg-gray-100 text-black px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-300 transition duration-200 self-start sm:self-auto"
                    >
                        + Nova Campanha
                    </button>
                </div>

                {/* State: Loading */}
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-100"></div>
                    </div>
                )}

                {/* State: Error */}
                {error && (
                    <div className="p-4 bg-red-950/50 border border-red-800/50 text-red-400 text-sm rounded-lg text-center">
                        <p>{error}</p>
                        <button
                            onClick={() => {
                                const userId = getLoggedUserId()
                                
                                if(userId){
                                    fetchCampaigns(userId)
                                } else {
                                    setError("Não encontrou userId")
                                }
                            }}
                            className="mt-2 text-xs text-gray-300 underline hover:text-white"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {/* State: Empty */}
                {!loading && !error && campaigns.length === 0 && (
                    <div className="text-center py-20 bg-black border border-gray-800 rounded-2xl p-8">
                        <p className="text-gray-400 text-base mb-2">
                            Nenhuma campanha encontrada.
                        </p>
                        <p className="text-sm text-gray-600">
                            Crie sua primeira campanha para começar a jogar.
                        </p>
                    </div>
                )}

                {/* State: List Grid */}
                {!loading && !error && campaigns.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((campaign, index) => {
                            const title = campaign.name || `Campanha #${index + 1}`;

                            return (
                                <div
                                    key={campaign.id || index}
                                    className="bg-black border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition duration-200 flex flex-col justify-between"
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-3">
                                            <h2 className="text-xl font-bold text-gray-100 line-clamp-1">
                                                {title}
                                            </h2>
                                        </div>
                                        <p className="text-sm text-gray-400 line-clamp-3">
                                            {campaign.description || "Sem descrição informada."}
                                        </p>
                                    </div>

                                    <div className="px-6 py-4 bg-gray-900/40 border-t border-gray-800 flex justify-between items-center">
                                        <span className="text-xs text-gray-600 font-mono">
                                            ID: {campaign.id ? `${campaign.id.substring(0, 8)}...` : "N/A"}
                                        </span>
                                        <button
                                            onClick={() => campaign.id && handleOpenUserSelection(campaign.id)}
                                            className="text-xs font-bold bg-gray-900 text-gray-200 px-3.5 py-2 rounded-lg hover:bg-gray-700 transition border border-gray-700"
                                            title="Adicionar Usuários"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => window.location.href = `/board?campaignId=${campaign.id}`}
                                            className="text-xs font-semibold bg-gray-800 text-gray-200 px-3.5 py-2 rounded-lg hover:bg-gray-700 transition border border-gray-700"
                                        >
                                            Entrar na Mesa
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Criar Campanha */}
            {inCreateCampaignForm && (
                <div className="bg-black border border-gray-800 rounded-xl p-6 mb-8 shadow-xl">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                        <h2 className="text-xl font-bold text-gray-100">Criar Nova Campanha</h2>
                        <button
                            type="button"
                            onClick={() => setInCreateCampaignForm(false)}
                            className="text-gray-400 hover:text-gray-200 text-sm font-semibold transition"
                        >
                            Fechar ✕
                        </button>
                    </div>

                    {createError && (
                        <div className="mb-4 p-3 bg-red-950/50 border border-red-800/50 text-red-400 text-sm rounded-lg text-center">
                            {createError}
                        </div>
                    )}

                    <form onSubmit={handleCreateCampaign} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Nome da Campanha *
                            </label>
                            <input
                                type="text"
                                value={newCampaignName}
                                onChange={(e) => setNewCampaignName(e.target.value)}
                                required
                                placeholder="Ex: A Mina Perdida de Phandelver"
                                className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Descrição
                            </label>
                            <textarea
                                value={newCampaignDescription}
                                onChange={(e) => setNewCampaignDescription(e.target.value)}
                                rows={3}
                                placeholder="Uma breve premissa sobre a história da campanha..."
                                className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600 transition resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setInCreateCampaignForm(false)}
                                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-gray-300 border border-gray-800 hover:bg-gray-800 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-black hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? "Criando..." : "Salvar Campanha"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal: Seleção de Usuários */}
            {isSelectingUsers && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="flex flex-col w-full max-w-xs max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Cabeçalho */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="text-base font-bold text-gray-900">Selecionar Usuários</h2>
                            <button
                                onClick={() => setIsSelectingUsers(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Lista com Rolagem */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-gray-50">
                            {isLoadingMembers ? (
                                <div className="flex justify-center py-6">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                </div>
                            ) : users.length > 0 ? (
                                users.map((user, index) => {
                                    const name = user.name || `Usuário ${index + 1}`;
                                    const userId = user.id || index;
                                    const isSelected = selectedUserIds.includes(String(user.id));

                                    return (
                                        <button
                                            key={userId}
                                            disabled={isSelected}
                                            onClick={() => handleSelectUser(user)}
                                            className={`flex items-center justify-between w-full p-2.5 text-left text-sm font-medium rounded-lg transition-colors ${isSelected
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                                                : "text-gray-700 hover:bg-gray-100 active:bg-gray-200 cursor-pointer"
                                                }`}
                                        >
                                            <span>{name}</span>
                                            {isSelected && (
                                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    ✓ Membro
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-gray-400 text-center py-6">
                                    Nenhum usuário disponível.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export { CampaignsPage };
export default CampaignsPage;