import React, { useState } from "react";
import { AuthAPI } from "../api/modules/auth";

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            if (isLogin) {
                // 1. Recebe a resposta da API contendo o token
                const response = await AuthAPI.login({ email, password });

                // 2. Salva o token retornado no localStorage
                if (response?.token) {
                    sessionStorage.setItem("@app:token", response.token);
                }

                // 3. Redireciona para a página do Board
                window.location.href = "/campaigns";
                
            } else {
                await AuthAPI.register({ name, email, password });
                // Ao registrar, alterna para a tela de login
                setIsLogin(true);
                setName("");
                alert("Conta criada com sucesso! Faça login para continuar.");
            }
        } catch (err: any) {
            setError(err?.message || "Ocorreu um erro ao processar sua requisição.");
        } finally {
            setLoading(false);
        }
    }

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setSuccess(null);
    };

    return (
        <div className="min-h-screen w-full bg-gray-900 text-gray-200 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-black border border-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-100 mb-2">
                        {isLogin ? "Entrar na Conta" : "Criar Nova Conta"}
                    </h1>
                    <p className="text-sm text-gray-400">
                        {isLogin
                            ? "Digite suas credenciais para continuar"
                            : "Preencha os campos abaixo para se cadastrar"}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-950/50 border border-red-800/50 text-red-400 text-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-3 bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-sm rounded-lg text-center">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                Nome
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Seu nome"
                                className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600 transition"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                            E-mail
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="seuemail@exemplo.com"
                            className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-100 text-black font-semibold rounded-lg p-3 text-sm hover:bg-gray-300 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-800 text-center">
                    <p className="text-sm text-gray-500">
                        {isLogin ? "Não possui uma conta?" : "Já possui uma conta?"}{" "}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-gray-300 font-medium hover:underline focus:outline-none ml-1"
                        >
                            {isLogin ? "Cadastre-se" : "Entrar"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export { AuthPage };
export default AuthPage;