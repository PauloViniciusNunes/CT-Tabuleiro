# Contexto da Arquitetura MBOI — CT-Tabuleiro

O CT-Tabuleiro utiliza uma arquitetura interna de regras chamada **MBOI**:

- **M = Mechanic**
- **B = Behavior**
- **O = Operator**
- **I = Interceptor**

MBOI não é um Design Pattern isolado. É uma **arquitetura de domínio para composição e execução de regras complexas de combate**, construída sobre ideias como Event-Driven Architecture, Command, Strategy, Observer e Chain of Responsibility.

O objetivo central é permitir regras extremamente complexas sem transformar o `BattleEngine` em um conjunto crescente de `if`s específicos para itens, poderes, personagens ou habilidades.

---

# 1. Modelo mental principal

O fluxo conceitual é:

```text
BattleEngine / Behavior
        │
        │ intenção
        ▼
     Operator
        │
        │ antes da execução oficial
        ▼
MechanicEngine.intercept(...)
        │
        ▼
 Interceptors ativos
        │
        │ transformam ou cancelam
        ▼
     Operator
        │
        │ executa/commita a operação
        ▼
      Event
        │
        ▼
MechanicEngine.process(...)
        │
        ▼
   Behaviors ativos
        │
        │ reagem ao que aconteceu
        ▼
novas Operations / mudanças de estado
```

Regra fundamental:

```text
Interceptor = antes da operação
Operator    = operação oficial
Event       = resultado/fato ocorrido
Behavior    = depois da operação
```

---

# 2. Mechanic

Uma `Mechanic` representa uma **regra funcional individual**.

Não confundir Mechanic com:

- item;
- personagem;
- poder temático;
- pacote inteiro de habilidades.

Um item ou poder pode ser composto por várias Mechanics.

Exemplo:

```text
Quantum Gaze
    ↓
World Vision
Super Perception
Zero Opportunity
Night Vision
Power Tracking
Inherent Point
...
```

Não criar uma `QuantumGazeMechanic` monolítica só porque todas as habilidades pertencem ao mesmo poder.

A preferência arquitetural é:

```text
poder/item
= composição de várias Mechanics reutilizáveis
```

---

# 3. MechanicDefinition

A Definition descreve a parte estática da regra.

Responsabilidades típicas:

```text
id da mechanic
configuração inicial
Behaviors
Interceptors
eventos escutados
```

Ela define o que aquela regra sabe fazer.

Não deve conter o estado runtime específico de uma batalha.

---

# 4. MechanicInstance

`MechanicInstance` representa uma Mechanic ativa dentro de uma batalha.

Ela pode conter:

```text
id
mechanicId
sourceTokenId
duração
intensidade
metadata
```

O `metadata` existe para armazenar estado runtime específico da Mechanic.

Exemplo:

```ts
metadata: {
    accumulatedStrengthBonus: 50
}
```

Esse estado não deve ser jogado automaticamente dentro do Token persistente.

Pergunta obrigatória:

```text
Esse valor pertence permanentemente ao personagem?
ou
Existe apenas durante essa Mechanic/batalha?
```

Se for temporário, preferir `MechanicInstance.metadata`.

---

# 5. Operator

Um `Operator` representa uma **operação semântica oficial da engine**.

Exemplos:

```text
DamageOperator
RollOperator
MovementOperator
EnvironmentOperator
ManaDecreaseOperator
MechanicApplicationOperator
ActionDispatchOperator
ResourceOperator
```

Operators devem ser genéricos.

Nunca criar:

```text
ImaculadaDamageOperator
QuantumGazeOperator
InfernalGazeRollOperator
```

O nome e a responsabilidade devem continuar fazendo sentido se outra Mechanic reutilizar a mesma operação.

Exemplo:

```ts
await context.operations.damage({
    sourceTokenId,
    targetTokenId,
    amount,
});
```

O chamador diz:

> quero causar dano.

Quem decide como essa operação atravessa a engine é o `DamageOperator`.

---

# 6. Interceptor

Um `Interceptor` atua **antes da operação ser efetivada**.

Pode:

```text
modificar valores
reduzir valores
aumentar valores
alterar propriedades
alterar origem/alvo
bloquear/cancelar
```

Exemplo:

```text
Damage 100
   ↓
HalfDamageInterceptor
   ↓
Damage 50
```

Outro exemplo:

```text
Movement
   ↓
TimeStopInterceptor
   ↓
cancelled = true
```

Base atual:

```ts
export interface InterceptableData {
    readonly cancelled?: boolean;
}
```

Interceptors recebem dados imutáveis e retornam um novo objeto.

A cadeia funciona sequencialmente:

```text
input
 ↓
Interceptor A
 ↓
Interceptor B
 ↓
Interceptor C
 ↓
resultado
```

Se:

```ts
cancelled === true
```

a cadeia pode encerrar.

---

# 7. Implementação genérica atual dos Interceptors

A infraestrutura segue aproximadamente:

```ts
export interface InterceptableData {
    readonly cancelled?: boolean;
}

export interface ActiveInterceptor<T extends InterceptableData> {
    readonly interceptor: Interceptor<T>;
    readonly mechanic: MechanicInstance;
}

export abstract class Interceptor<
    T extends InterceptableData = InterceptableData,
> {
    abstract readonly type: InterceptorType;

    abstract intercept(
        data: Readonly<T>,
        mechanic: Readonly<MechanicInstance>,
    ): T | Promise<T>;

    static async executeAll<T extends InterceptableData>(
        initialData: T,
        activeInterceptors: readonly ActiveInterceptor<T>[],
    ): Promise<T> {
        let data = Object.freeze({ ...initialData }) as T;

        for (const { interceptor, mechanic } of activeInterceptors) {
            if (data.cancelled) break;

            const immutableMechanic = Object.freeze({
                ...mechanic,
                metadata: Object.freeze({ ...mechanic.metadata }),
            });

            data = Object.freeze({
                ...await interceptor.intercept(data, immutableMechanic),
            }) as T;
        }

        return data;
    }
}
```

Objetivo:

```text
mesma infraestrutura
→ DamageData
→ RollData
→ MovementData
→ EnvironmentData
→ etc.
```

---

# 8. Behavior

Um `Behavior` reage **depois de algo já ter acontecido**.

Exemplos:

```text
DAMAGE_RECEIVED
       ↓
Behavior
       ↓
aumenta contador
```

```text
TOKEN_MOVED
    ↓
Behavior
    ↓
causa dano em área
```

Um Behavior não deve realizar mutações arbitrárias diretamente se existir uma operação semântica apropriada.

Preferir:

```ts
context.operations.damage(...)
```

em vez de:

```ts
battleSetter.decreaseLife(...)
```

quando a intenção semântica é causar dano.

Motivo:

```text
Behavior
→ solicita nova operação
→ Operator
→ Interceptors
→ Event
→ outros Behaviors
```

Assim toda a engine continua participando.

---

# 9. Event

`Event` representa um fato ocorrido ou uma operação resolvida.

Exemplos:

```text
TOKEN_MOVED
DAMAGE_RECEIVED
ROLL_RESOLVED
TURN_STARTED
TURN_ENDED
ACTION_DISPATCH_REQUESTED
```

Behaviors declaram os eventos que escutam:

```ts
lister(): MechanicEventType[] {
    return [
        MechanicEventType.TOKEN_MOVED
    ];
}
```

O `MechanicEngine` utiliza essa informação para encontrar Behaviors relevantes.

---

# 10. MechanicEngine

`MechanicEngine` é o orquestrador da MBOI.

Ele NÃO deve implementar poderes específicos.

Responsabilidades:

```text
descobrir Mechanics ativas
buscar Interceptors relevantes
executar Interceptors
despachar Events
buscar Behaviors relevantes
executar Behaviors
construir EngineContext
expor Operators
```

Modelo mental:

```text
MechanicEngine
=
roteador/executor da arquitetura
```

Nunca:

```text
MechanicEngine
=
lugar onde cada poder é hardcoded
```

---

# 11. Operator base

A base atual segue aproximadamente:

```ts
export type InterceptOperation = <T extends InterceptableData>(
    type: InterceptorType,
    data: T,
    battleId: string,
) => Promise<T>;

export type DispatchMechanicEvent = (
    battleId: string,
    event: MechanicEvent,
) => Promise<void>;

export interface OperatorRuntime {
    readonly intercept: InterceptOperation;
    readonly dispatchEvent: DispatchMechanicEvent;
}

export abstract class Operator<Input, Output = Input> {
    constructor(protected readonly runtime: OperatorRuntime) {}

    abstract execute(input: Input): Promise<Output>;
}
```

O Operator:

```text
recebe intenção
→ cria dados operacionais
→ intercepta
→ verifica cancelamento
→ executa
→ emite Event
→ retorna resultado
```

Importante:

Depois da interceptação, sempre usar o **resultado interceptado**, nunca continuar usando o input original.

---

# 12. Operation provenance

Operations possuem contexto causal.

Estrutura conceitual:

```ts
export interface OperationIntent {
    readonly battleId: string;
    readonly parentOperationId?: string;
    readonly cause?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface OperationContext extends OperationIntent {
    readonly operationId: string;
}
```

Isso serve para saber:

```text
qual operação originou outra
qual Mechanic gerou determinado efeito
se uma operação é derivada
se uma ação está sendo retomada
```

Isso é essencial para prevenir recursões.

Exemplo de loop perigoso:

```text
Damage
→ Behavior reage
→ causa Damage
→ Event
→ Behavior reage
→ causa Damage
→ infinito
```

`operationId`, `parentOperationId`, `cause` e `metadata` podem marcar e impedir isso.

---

# 13. EngineContext

Behaviors não devem depender diretamente de repositories/services concretos.

Eles recebem um `EngineContext` com capacidades.

Forma atual aproximada:

```ts
export interface EngineContext {
    mapId: string;
    battleId: string;
    currentTokenId: string;

    boardTokens: unknown[];
    mapObjs: unknown[];

    operations: {
        damage(
            intent: Omit<DamageInput, "battleId">
        ): Promise<DamageData>;

        roll(
            intent: Omit<RollInput, "battleId">
        ): Promise<RollData>;

        move(
            intent: Omit<MovementInput, "battleId">
        ): Promise<MovementData>;

        changeEnvironment(
            intent: Omit<EnvironmentInput, "battleId" | "mapId">
        ): Promise<EnvironmentData>;

        applyMechanic(
            intent: Omit<MechanicApplicationInput, "battleId">
        ): Promise<MechanicApplicationData>;

        setResources(
            intent: Omit<TokenResourceInput, "battleId">
        ): Promise<TokenResourceData>;
    };

    specialResponses: {
        request(
            input: Omit<RequestSpecialResponseInput, "battleId">
        ): Promise<PendingSpecialResponse>;
    };
}
```

Então um Behavior faz:

```ts
context.operations.damage(...)
context.operations.roll(...)
context.specialResponses.request(...)
```

e não conhece a infraestrutura concreta.

---

# 14. BattleSetter x Repository

Repositories devem permanecer genéricos:

```text
find
create
update
delete
```

`BattleSetter` entende a semântica estrutural do `BattleState`.

Exemplo:

```text
updateMechanicInstance(...)
```

deve ficar no `BattleSetter`.

Motivo:

```text
Repository
→ sabe persistir JSON

BattleSetter
→ sabe que activeMechanics é uma coleção
→ encontra a MechanicInstance correta
→ substitui
→ chama Repository
```

---

# 15. updateMechanicInstance

Implementação conceitual atual:

```ts
async updateMechanicInstance(
    battleId: string,
    mechanic: MechanicInstance,
) {
    const battleState = await this.battleStateRepository.findById(battleId);

    if (!battleState) {
        throw new Error(
            `Batalha com ID ${battleId} não foi encontrada.`
        );
    }

    const activeMechanics: MechanicInstance[] =
        Array.isArray(battleState.activeMechanics)
            ? battleState.activeMechanics as unknown as MechanicInstance[]
            : [];

    const mechanicExists = activeMechanics.some(
        activeMechanic => activeMechanic.id === mechanic.id
    );

    if (!mechanicExists) {
        throw new Error(
            `MechanicInstance ${mechanic.id} não encontrada.`
        );
    }

    const updatedMechanics = activeMechanics.map(
        activeMechanic =>
            activeMechanic.id === mechanic.id
                ? mechanic
                : activeMechanic
    );

    return this.battleStateRepository.update(
        battleId,
        {
            activeMechanics:
                updatedMechanics as unknown as Prisma.InputJsonValue,
        }
    );
}
```

Existe risco futuro de concorrência por ser read-modify-write, mas isso é aceitável no estágio atual.

---

# 16. Philosophy de naming

Nomes devem refletir **função reutilizável**, não tema.

Bom:

```text
AccumulatedStrengthBonusInterceptor
TemporaryRollBonusInterceptor
HalfDamageInterceptor
CardRechargeModifierInterceptor
```

Ruim:

```text
ImaculadaInterceptor
QuantumGazeInterceptor
InfernalGazeDamageInterceptor
```

Teste obrigatório:

> Se outra Mechanic usar essa classe amanhã, o nome ainda faz sentido?

Se não, o nome está específico demais.

---

# 17. Composição em vez de Mechanics gigantes

Nunca implementar um poder grande como uma única classe monolítica.

Exemplo ruim:

```ts
class InfernalGazeMechanic {
    // dezenas de regras diferentes
}
```

Preferir decompor em capacidades:

```text
EnvironmentChangeCancellation
BurningOnCancelledSpell
HealthEqualization
ManaEqualization
TemporaryDomination
FireDamageInjection
SelfMaxLifeDamage
MagicalDamageReplication
DamageBasedBonusGrowth
```

Essas peças podem aparecer depois em outros poderes.

---

# 18. Card x Mechanic

Regras próprias de uma Card continuam sendo responsabilidade da Card.

Exemplos:

```text
quantidade de alvos
alcance da Card
seleção de alvo
custos da Card
```

Não transformar isso em Mechanic só porque a Card possui um efeito complexo.

Mechanic deve representar regras funcionais que precisam participar da engine.

---

# 19. Exemplo — Imaculada

Regra:

```text
começa cada batalha com +50 de Strength temporário

cada dano efetivamente causado
aumenta esse bônus pelo mesmo valor
```

Estado:

```ts
metadata: {
    accumulatedStrengthBonus: 50
}
```

Interceptor:

```text
AccumulatedStrengthBonusInterceptor
```

Intercepta Roll quando:

```text
tokenId === mechanic.sourceTokenId
attribute === "forca"
```

e faz:

```text
params.O += accumulatedStrengthBonus
```

Behavior:

```text
escuta dano causado
```

e atualiza:

```text
accumulatedStrengthBonus += actualDamage
```

Esse bônus NÃO deve ser salvo diretamente no Token persistente.

---

# 20. Special Response subsystem

MBOI pode precisar de decisões humanas durante uma ação.

Exemplo:

```text
Super Perception
→ usuário decide quantos pontos de Mana gastar
```

Não fazer:

```ts
await waitUntilHumanResponds()
```

A requisição HTTP não deve ficar pendurada esperando.

Fluxo correto:

```text
Request A

Action
→ Behavior detecta necessidade
→ specialResponses.request(...)
→ pendingSpecialResponse salvo no DB
→ Socket envia formulário
→ Request A termina

[humano pode levar quanto tempo quiser]

Request B

usuário envia resposta
→ endpoint special-response
→ lê pending
→ handlerKey
→ Registry
→ handler
→ retoma ação original
```

O estado de espera é:

```text
PendingQueue.pendingSpecialResponse != null
```

Não uma Promise esperando usuário.

---

# 21. SpecialResponseHandlerRegistry

Callbacks não são serializadas no banco.

O banco guarda apenas:

```text
handlerKey
```

Exemplo:

```text
"roll.proficiency-reduction.v1"
```

Runtime:

```ts
Map<string, SpecialResponseHandler>
```

Exemplo:

```ts
SpecialResponseHandlerRegistry.register(
    "roll.proficiency-reduction.v1",
    handleProficiencyRollReduction
);
```

Quando a resposta chega:

```text
handlerKey
→ Registry
→ função correta
```

Se o processo Node reiniciar, o Map desaparece.

Por isso handlers precisam ser registrados novamente no bootstrap ou por uma estratégia equivalente.

---

# 22. Continuação de ação após Special Response

Quando uma ação é interrompida por formulário:

```text
ACTION_DISPATCH
→ Behavior abre formulário
→ resposta humana
→ handler
→ ACTION_DISPATCH novamente
```

Isso pode disparar o mesmo Behavior outra vez.

Por isso a ação retomada recebe metadata de continuação:

```ts
metadata: {
    specialResponseContinuation: {
        requestId,
        mechanicInstanceId
    }
}
```

O Behavior deve detectar:

```text
essa ação já é continuação dessa Mechanic?
```

Se sim:

```text
não abrir formulário novamente
```

Isso previne recursão infinita.

---

# 23. Super Perception como exemplo atual

Fluxo conceitual:

```text
ACTION_DISPATCH_REQUESTED
        ↓
SuperPerceptionFormularyBehavior
        ↓
valida:
- tipo da ação
- alvo
- dono da Mechanic
- mana
- continuação
        ↓
specialResponses.request(...)
        ↓
formulário
        ↓
jogador informa spentMana
        ↓
handlerKey
        ↓
handleProficiencyRollReduction
        ↓
MANA_DECREASE Operator
        ↓
calcula penalidade
        ↓
resumeAction(...)
        ↓
ACTION_DISPATCH novamente
com continuation metadata
        ↓
Behavior não abre formulário de novo
```

Importante:

O primeiro Behavior NÃO espera o jogador responder.

---

# 24. metadata

`metadata` é:

```ts
Readonly<Record<string, unknown>>
```

Pode conter objetos tipados aninhados.

Exemplo:

```ts
metadata: {
    choice
}
```

É preferível validar quando recuperar:

```ts
const choice = ChoiceValidator.parse(
    input.metadata.choice
);
```

em vez de simplesmente:

```ts
input.metadata.choice as Choice
```

principalmente quando houve persistência/entrada externa.

---

# 25. MBOI e manipulação de tempo/realidade

A arquitetura foi pensada para chegar a regras extremamente complexas.

Exemplos de manipulação temporal:

```text
ganhar turno extra
→ TurnOrderOperator

bloquear ações durante Time Stop
→ Interceptors

alterar duração/recarga
→ Operators ou Behaviors apropriados

rewind
→ Snapshot + RestoreStateOperator
```

Exemplos de manipulação da realidade:

```text
dano virar Mana
→ interceptar Damage
→ cancelar/reduzir
→ solicitar Mana operation

fogo virar cura
→ interceptar Damage
→ cancelar
→ Heal operation

forçar resultado de Roll
→ RollInterceptor

alterar elemento efetivo
→ property override/resolution

reescrever sourceTokenId
→ causalidade alterada antes da operação
```

Para regras ainda mais avançadas, podem surgir infraestruturas novas:

```text
BattleSnapshot
RestoreStateOperator
TurnOrderOperator
PropertyResolver
```

Mas devem continuar respeitando a filosofia MBOI.

---

# 26. Regra contra hardcode temático

Nunca espalhar:

```ts
if (mechanic === "imaculada") {
    ...
}

if (power === "quantum-gaze") {
    ...
}
```

em:

```text
BattleEngine
Operators
Repositories
Controllers
Services genéricos
```

O objetivo de MBOI é exatamente impedir isso.

---

# 27. Como classificar uma nova regra

Antes de criar código, perguntar:

```text
Acontece antes de uma operação?
→ Interceptor

Representa uma operação oficial do domínio?
→ Operator

Reage a algo que já aconteceu?
→ Behavior

É apenas a representação de um fato ocorrido?
→ Event

Precisa manter estado runtime?
→ MechanicInstance.metadata

Precisa de decisão humana assíncrona?
→ SpecialResponse
```

---

# 28. Processo para implementar novas habilidades

Não começar criando classes.

Primeiro:

```text
1. remover flavor text
2. extrair regras objetivas
3. separar regras independentes
4. identificar estado runtime
5. identificar eventos
6. identificar operações
7. identificar interceptações
8. identificar risco de recursão
9. só então definir classes
```

Exemplo:

```text
"Enquanto ativo:
reduz dano de fogo em 50%;
perde 1 carga ao receber fogo;
começa com 3 cargas;
termina ao chegar em 0."
```

Classificação:

```text
reduzir dano
→ Interceptor

perder carga após dano
→ Behavior

charges
→ MechanicInstance.metadata

remover ao chegar em 0
→ Behavior + operation apropriada
```

---

# 29. Litmus test para abstrações

Antes de adicionar nova abstração:

```text
Isso representa uma operação genérica?

Pode ser reutilizado?

Estou criando isso porque a engine precisa
ou apenas porque uma habilidade precisa?

Já cabe em:
Mechanic
Behavior
Operator
Interceptor
Event
SpecialResponse?
```

Evitar abstrações novas sem necessidade.

---

# 30. Resumo operacional

MBOI pode ser resumida assim:

```text
Mechanic
= regra funcional/composição

MechanicInstance
= estado runtime da regra

Interceptor
= modifica/cancela antes do commit

Operator
= executa operação oficial

Event
= descreve fato ocorrido

Behavior
= reage ao fato ocorrido

MechanicEngine
= orquestra tudo

EngineContext
= fornece capacidades desacopladas

SpecialResponse
= pausa lógica persistente para decisão humana
```

Objetivo final:

```text
regras complexas
sem acoplamento temático
sem ifs especiais espalhados
sem BattleEngine monolítico
sem quebrar fluxo de eventos/operações
```

Ao implementar qualquer nova Mechanic, preservar essa filosofia tem prioridade sobre conveniências locais de implementação.