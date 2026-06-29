import React, { useState } from "react";
import type { Token } from "../../types/token";
import type { AllocatedPoints } from "../../types/battle";

interface SkillPanelProps {
    token: Token | null;
    availablePoints: number;
    onClose: () => void;
    onConfirm: (
        allocatedPoints: AllocatedPoints
    ) => void;
}

const SkillPanel: React.FC<SkillPanelProps> = ({
    token,
    availablePoints,
    onClose,
    onConfirm,
}) => {

    const [allocatedPoints, setAllocatedPoints] =
        useState<AllocatedPoints>({
            forca: 0,
            destreza: 0,
            consistencia: 0,
            inteligencia: 0,
            sabedoria: 0,
            carisma: 0,
        });

    if (!token) return null;

    const usedPoints =
        Object.values(allocatedPoints)
            .reduce((sum, value) => sum + value, 0);

    const remainingPoints =
        availablePoints - usedPoints;

    type AttributeName =
        | "forca"
        | "destreza"
        | "consistencia"
        | "inteligencia"
        | "sabedoria"
        | "carisma";

    function plusButton(
        attribute: AttributeName
    ) {
        if (remainingPoints <= 0)
            return;

        setAllocatedPoints(prev => ({
            ...prev,
            [attribute]: prev[attribute] + 1,
        }));
    }

    function minusButton(
        attribute: AttributeName
    ) {
        if (allocatedPoints[attribute] <= 0)
            return;

        setAllocatedPoints(prev => ({
            ...prev,
            [attribute]: prev[attribute] - 1,
        }));
    }

    function confirm() {
        onConfirm(allocatedPoints);
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">

            {/* Blur / Overlay */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-blue-600 rounded-xl shadow-2xl w-full max-w-2xl text-white animate-fade-in">

                {/* Header */}
                <div className="border-b border-gray-700 p-4">
                    <h2 className="text-2xl font-bold text-blue-400 text-center">
                        ⭐ Evolução de Personagem
                    </h2>

                    <p className="text-center text-gray-400 text-sm mt-1">
                        Distribua seus pontos de atributo
                    </p>
                </div>

                {/* Conteúdo */}
                <div className="p-6">

                    {/* Informações do Token */}
                    <div className="flex items-center gap-4 mb-6">

                        {token.imageUrl && (
                            <img
                                src={token.imageUrl}
                                alt={token.name}
                                className="w-20 h-20 rounded-lg object-cover border border-blue-500"
                            />
                        )}

                        <div>
                            <h3 className="text-xl font-semibold">
                                {token.name}
                            </h3>

                            <p className="text-gray-400 text-sm">
                                Classe: {token.class}
                            </p>

                            <p className="text-yellow-400 text-sm font-semibold">
                                Pontos restantes: {remainingPoints} / {availablePoints}
                            </p>
                        </div>

                    </div>

                    {/* Atributos */}
                    <div className="space-y-3">

                        {/* FORÇA */}
                        <div className="flex items-center justify-between bg-gray-800 p-3 rounded">
                            <span>💪 Força</span>

                            <div className="flex items-center gap-3">

                                <button
                                    className="bg-gray-700 px-2 rounded"
                                    onClick={() => minusButton("forca")}
                                >
                                    -
                                </button>

                                <span className="font-semibold">
                                    {token.attributes.forca}

                                    {allocatedPoints.forca > 0 && (
                                        <span className="text-green-400 ml-2">
                                            → {token.attributes.forca + allocatedPoints.forca}
                                        </span>
                                    )}
                                </span>

                                <button
                                    className="bg-blue-600 hover:bg-blue-500 px-2 rounded"
                                    onClick={() => plusButton("forca")}
                                >
                                    +
                                </button>

                            </div>
                        </div>

                        {/* DESTREZA */}
                        <div className="flex items-center justify-between bg-gray-800 p-3 rounded">
                            <span>🏃 Destreza</span>

                            <div className="flex items-center gap-3">

                                <button
                                    className="bg-gray-700 px-2 rounded"
                                    onClick={() => minusButton("destreza")}
                                >
                                    -
                                </button>

                                <span className="font-semibold">
                                    {token.attributes.destreza}

                                    {allocatedPoints.destreza > 0 && (
                                        <span className="text-green-400 ml-2">
                                            → {token.attributes.destreza + allocatedPoints.destreza}
                                        </span>
                                    )}
                                </span>

                                <button
                                    className="bg-blue-600 hover:bg-blue-500 px-2 rounded"
                                    onClick={() => plusButton("destreza")}
                                >
                                    +
                                </button>

                            </div>
                        </div>

                        {/* CONSISTÊNCIA */}
                        <div className="flex items-center justify-between bg-gray-800 p-3 rounded">
                            <span>🛡️ Consistência</span>

                            <div className="flex items-center gap-3">

                                <button
                                    className="bg-gray-700 px-2 rounded"
                                    onClick={() => minusButton("consistencia")}
                                >
                                    -
                                </button>

                                <span className="font-semibold">
                                    {token.attributes.consistencia}

                                    {allocatedPoints.consistencia > 0 && (
                                        <span className="text-green-400 ml-2">
                                            → {token.attributes.consistencia + allocatedPoints.consistencia}
                                        </span>
                                    )}
                                </span>

                                <button
                                    className="bg-blue-600 hover:bg-blue-500 px-2 rounded"
                                    onClick={() => plusButton("consistencia")}
                                >
                                    +
                                </button>

                            </div>
                        </div>

                        {/* INTELIGÊNCIA */}
                        <div className="flex items-center justify-between bg-gray-800 p-3 rounded">
                            <span>🧠 Inteligência</span>

                            <div className="flex items-center gap-3">

                                <button
                                    className="bg-gray-700 px-2 rounded"
                                    onClick={() => minusButton("inteligencia")}
                                >
                                    -
                                </button>

                                <span className="font-semibold">
                                    {token.attributes.inteligencia}

                                    {allocatedPoints.inteligencia > 0 && (
                                        <span className="text-green-400 ml-2">
                                            → {token.attributes.inteligencia + allocatedPoints.inteligencia}
                                        </span>
                                    )}
                                </span>

                                <button
                                    className="bg-blue-600 hover:bg-blue-500 px-2 rounded"
                                    onClick={() => plusButton("inteligencia")}
                                >
                                    +
                                </button>

                            </div>
                        </div>

                        {/* SABEDORIA */}
                        <div className="flex items-center justify-between bg-gray-800 p-3 rounded">
                            <span>✨ Sabedoria</span>

                            <div className="flex items-center gap-3">

                                <button
                                    className="bg-gray-700 px-2 rounded"
                                    onClick={() => minusButton("sabedoria")}
                                >
                                    -
                                </button>

                                <span className="font-semibold">
                                    {token.attributes.sabedoria}

                                    {allocatedPoints.sabedoria > 0 && (
                                        <span className="text-green-400 ml-2">
                                            → {token.attributes.sabedoria + allocatedPoints.sabedoria}
                                        </span>
                                    )}
                                </span>

                                <button
                                    className="bg-blue-600 hover:bg-blue-500 px-2 rounded"
                                    onClick={() => plusButton("sabedoria")}
                                >
                                    +
                                </button>

                            </div>
                        </div>

                        {/* CARISMA */}
                        <div className="flex items-center justify-between bg-gray-800 p-3 rounded">
                            <span>❤️ Carisma</span>

                            <div className="flex items-center gap-3">

                                <button
                                    className="bg-gray-700 px-2 rounded"
                                    onClick={() => minusButton("carisma")}
                                >
                                    -
                                </button>

                                <span className="font-semibold">
                                    {token.attributes.carisma}

                                    {allocatedPoints.carisma > 0 && (
                                        <span className="text-green-400 ml-2">
                                            → {token.attributes.carisma + allocatedPoints.carisma}
                                        </span>
                                    )}
                                </span>

                                <button
                                    className="bg-blue-600 hover:bg-blue-500 px-2 rounded"
                                    onClick={() => plusButton("carisma")}
                                >
                                    +
                                </button>

                            </div>
                        </div>

                    </div>

                </div>

                {/* Footer */}
                <div className="border-t border-gray-700 p-4 flex justify-end gap-3">

                    <button
                        onClick={onClose}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={confirm}
                        disabled={usedPoints !== availablePoints}
                        className={
                            usedPoints === availablePoints
                                ? "bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-semibold"
                                : "bg-gray-700 cursor-not-allowed px-4 py-2 rounded font-semibold"
                        }
                    >
                        Confirmar
                    </button>

                </div>

            </div>
        </div>
    );
};

export default SkillPanel;