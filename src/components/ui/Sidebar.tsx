import React, { useState } from "react";
import TokenForm from "./TokenForm";
import type { Token } from "../../types/token";

interface SidebarProps {
  tokens: Token[];
  addToken: (token: Token) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ tokens, addToken }) => {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <div className="h-full bg-gray-900 p-4 flex flex-col">
        <h2 className="text-lg font-bold text-white select-none mb-2">Tokens Criados</h2>
        
        {/* Botão + reposicionado abaixo do título */}
        <button
          onClick={() => setFormOpen(true)}
          aria-label="Adicionar token"
          className="w-full mb-4 py-2 text-white text-xl font-bold bg-green-600 hover:bg-green-700 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          + Adicionar Token
        </button>

        <div className="flex-1 overflow-y-auto">
          {tokens.length === 0 ? (
            <p className="text-gray-400 text-sm select-none">Nenhum token criado.</p>
          ) : (
            <ul className="space-y-3" role="list">
              {tokens.map((token) => (
                <li
                  key={token.id}
                  className="flex items-center gap-3 p-2 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer select-none"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("tokenId", token.id);
                  }}
                  data-token-id={token.id}
                  tabIndex={0}
                  role="button"
                >
                  <img
                    src={token.imageUrl}
                    alt={token.name}
                    className="w-10 h-10 rounded object-cover"
                    draggable={false}
                  />
                  <div className="overflow-hidden">
                    <div className="font-semibold text-white truncate">{token.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      Status: {token.status} | Time: {token.team}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {formOpen && (
        <TokenForm
          onSave={(token) => {
            addToken(token);
            setFormOpen(false);
          }}
          onClose={() => setFormOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
