// src/utils/auth.ts

export const getLoggedUserId = (): string | null => {
    const token = sessionStorage.getItem("@app:token");
    if (!token) return null;

    try {
        // O JWT tem a estrutura: Header.Payload.Signature
        const payloadBase64 = token.split(".")[1];
        if (!payloadBase64) return null;

        // Decodifica a string Base64 do payload
        const decodedPayload = JSON.parse(atob(payloadBase64));

        // Retorna o ID do usuário (userId) do payload
        return decodedPayload.userId || null;
    } catch (error) {
        console.error("Erro ao decodificar o token do usuário:", error);
        return null;
    }
};