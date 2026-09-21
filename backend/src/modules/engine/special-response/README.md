# Respostas especiais

Este módulo é uma fronteira independente da MBOI. Ele persiste uma pergunta
declarativa, envia sua versão pública ao frontend e entrega a resposta validada a
um handler de continuação registrado pelo backend.

## Ciclo de uso

1. Registre, durante o bootstrap da aplicação, um handler com uma chave estável.
2. Um Service, Behavior ou Interceptor solicita o formulário.
3. Se for uma interceptação, a operação atual deve ser marcada como cancelada ou
   adiada; não mantenha uma requisição HTTP aberta esperando o jogador.
4. O jogador respondente ou o mestre envia/cancela o formulário.
5. O handler usa `pending.context` e `resolution.values` para continuar a regra.

```ts
import {
    SpecialResponseHandlerRegistry,
    SpecialResponseRequestService,
} from "@/modules/engine/special-response";

SpecialResponseHandlerRegistry.register(
    "roll.temporary-modifier.v1",
    async ({ pending, resolution }) => {
        if (resolution.action === "cancel") return;

        const spentMana = resolution.values.spentMana;
        // Retome a regra usando apenas valores já validados e o contexto
        // persistido em pending.context.
        void spentMana;
        void pending.context;
    },
);

await new SpecialResponseRequestService().execute({
    battleId,
    responderTokenId,
    requestedByTokenId,
    title: "Modificar rolagem",
    description: "Escolha quanto recurso deseja consumir.",
    fields: [
        {
            id: "spentMana",
            label: "Pontos de mana",
            type: "number",
            min: 1,
            max: availableMana,
            integer: true,
            defaultValue: 1,
        },
        {
            id: "mode",
            label: "Aplicação",
            type: "select",
            options: [
                { label: "Reduzir", value: "reduce" },
                { label: "Manter", value: "keep" },
            ],
        },
    ],
    handlerKey: "roll.temporary-modifier.v1",
    context: { operationId, targetTokenId },
});
```

Behaviors recebem a mesma entrada por
`context.specialResponses.request(...)`, sem precisar instanciar o serviço.
Uma `MechanicDefinition` deve apenas compor o Behavior/Interceptor reutilizável
que solicita a resposta; a identidade temática não deve entrar no nome do handler.

O `handlerKey` e o `context` nunca são enviados ao navegador. O registro do
handler precisa ser carregado também depois de um restart, pois a pendência fica
armazenada no banco e será sincronizada novamente quando o usuário entrar na room.
Como recursos e alvos podem mudar enquanto o formulário está aberto, o handler
também deve revalidar as invariantes mutáveis do domínio antes de aplicar efeitos.
