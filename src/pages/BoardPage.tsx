import React, { useState } from "react";
import SettingsDropdown from "../components/ui/SettingsDropdown";
import Sidebar from "../components/ui/Sidebar";
import type { Token } from "../types/token";

const getColumnName = (num: number): string => {
  let name = "";
  while (num > 0) {
    const remainder = (num - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    num = Math.floor((num - 1) / 26);
  }
  return name;
};

export const BoardPage: React.FC = () => {
  const [rows, setRows] = useState(25);
  const [cols, setCols] = useState(25);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const letters = Array.from({ length: cols }, (_, i) => getColumnName(i + 1));

  const handleCellClick = (letter: string, number: number) => {
    setSelectedCell(`${letter}${number}`);
  };

  const addToken = (token: Token) => {
    setTokens((prev) => [...prev, token]);
  };

  const moveToken = (id: string, col: number, row: number) => {
    setTokens((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, position: { col, row } } : t
      )
    );
  };

  return (
    <div className="relative flex w-full min-h-screen bg-gray-900 text-white overflow-auto">
      {/* Container principal do tabuleiro e controles */}
      <div
        className="relative flex-1 p-6"
        style={{ maxWidth: sidebarOpen ? "calc(100vw - 250px)" : "100vw" }}
      >
        {/* Botão de configuração posicionado absolute no topo esquerdo do container */}
        <div
          className="absolute flex items-center gap-4 bg-gray-900 z-20 rounded-md p-2"
          style={{ top: 6, left: 6 }}
        >
          <SettingsDropdown
            rows={rows}
            cols={cols}
            onChangeRows={setRows}
            onChangeCols={setCols}
            onChangeBackgroundImage={setBackgroundImage}
          />
          {/* Coordenada selecionada */}
          <div className="ml-4 font-semibold text-green-400 whitespace-nowrap select-none">
            {selectedCell ? `Célula selecionada: ${selectedCell}` : "Nenhuma célula selecionada"}
          </div>
        </div>

        {/* Espaço para evitar sobreposição do menu na grade */}
        <div style={{ paddingTop: 48 }}>
          {/* Cabeçalho de letras */}
          <div className="flex ml-10 relative" style={{ userSelect: "none" }}>
            {letters.map((letter) => (
              <div
                key={letter}
                style={{
                  width: 40,
                  height: 40,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    whiteSpace: "nowrap",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {letter}
                </div>
              </div>
            ))}
          </div>

          {/* Corpo do tabuleiro */}
          <div className="flex">
            {/* Números laterais */}
            <div className="flex flex-col select-none">
              {Array.from({ length: rows }, (_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 flex items-center justify-center text-sm font-bold"
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Grid principal com imagem de fundo distorcida */}
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: `repeat(${cols}, 2.5rem)`,
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
              }}
            >
              {Array.from({ length: rows }, (_, rowIndex) =>
                letters.map((letter) => {
                  const coord = `${letter}${rowIndex + 1}`;
                  const isSelected = coord === selectedCell;
                  const tokenInCell = tokens.find(
                    (t) =>
                      t.position.col === letters.indexOf(letter) + 1 &&
                      t.position.row === rowIndex + 1
                  );
                  return (
                    <div
                      key={coord}
                      onClick={() => handleCellClick(letter, rowIndex + 1)}
                      className={`w-10 h-10 border border-gray-700 flex items-center justify-center cursor-pointer transition-colors duration-150 relative ${
                        isSelected
                          ? "border-green-400 shadow-[0_0_10px_2px_rgba(34,197,94,0.7)]"
                          : "hover:bg-gray-800"
                      }`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("tokenId");
                        if (id) {
                          moveToken(id, letters.indexOf(letter) + 1, rowIndex + 1);
                        }
                      }}
                    >
                      {tokenInCell && (
                        <img
                          src={tokenInCell.imageUrl}
                          alt={tokenInCell.name}
                          className="absolute w-8 h-8 rounded object-cover cursor-grab"
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("tokenId", tokenInCell.id);
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botão hamburguer à direita */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          className="p-2 rounded-md bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar com controle de visibilidade */}
      <div
        className={`fixed top-0 right-0 h-full bg-gray-900 shadow-lg border-l border-gray-700 transition-transform duration-300 z-40 overflow-auto ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: 250 }}
      >
        <Sidebar tokens={tokens} addToken={addToken} />
      </div>
    </div>
  );
};

export default BoardPage;
