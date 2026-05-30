# CT-Tabuleiro — Contexto de Projeto para Agentes de IA

## Visão Geral

CT-Tabuleiro é uma plataforma de RPG de mesa virtual desenvolvida para substituir o Roll20 e outras VTTs tradicionais em campanhas do sistema próprio Countdown / Combact-Sect.

O projeto nasceu da necessidade de eliminar gargalos que quebravam a imersão durante sessões longas, reduzindo tempo morto, cálculos manuais, consultas constantes a regras e tarefas repetitivas executadas pelo mestre.

O foco principal é automação pesada, combate altamente procedural e suporte a campanhas complexas com dezenas de entidades simultâneas.

---

# Problema que o projeto resolve

Durante campanhas extensas surgiam problemas recorrentes:

* excesso de tempo gasto em cálculos
* gerenciamento manual de turnos
* movimentação repetitiva de NPCs
* criação manual de encontros
* controle complexo de inventários
* gerenciamento de efeitos temporários
* necessidade constante de intervenção do mestre

Esses problemas causavam:

* quebra de imersão
* fadiga cognitiva
* burnout do mestre
* redução do tempo de roleplay

O CT-Tabuleiro busca automatizar essas responsabilidades.

---

# Filosofia do Projeto

O projeto segue os seguintes princípios:

## 1. Automação acima de tudo

Tudo que puder ser executado por código deve ser executado por código.

Exemplos:

* cálculo de dano
* resolução de combate
* IA de inimigos
* movimentação procedural
* progressão de personagem
* efeitos temporários
* ordem de turno

---

## 2. Imersão

O jogador deve sentir que está dentro de um sistema vivo.

Exemplos:

* VFX
* SFX
* animações
* movimentação procedural
* respostas automáticas
* IA de criaturas

---

## 3. Redução de trabalho manual

O mestre não deve precisar:

* controlar HP manualmente
* controlar mana manualmente
* mover NPCs manualmente
* recalcular turnos
* remover mortos

---

## 4. Arquitetura modular

O projeto deve ser composto por módulos independentes.

Mudanças em IA não devem quebrar:

* renderização
* combate
* inventário
* mapas

Arquitetura de Diretórios (tree)

<>
.
├── aux.txt
├── backend
│   ├── data
│   │   └── tokens
│   │       └── tokens.json
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
├── eslint.config.js
├── estrutura.txt
├── guide
│   └── plano.txt
├── index.html
├── package.json
├── package-lock.json
├── PROJECT_CONTEXT.md
├── public
├── README.md
├── src
│   ├── ai
│   │   ├── ai.ts
│   │   ├── constants
│   │   │   └── reactionMatrix.ts
│   │   ├── core
│   │   │   ├── chooseCard.ts
│   │   │   ├── chooseMovement.ts
│   │   │   ├── chooseReaction.ts
│   │   │   ├── chooseResourceSpend.ts
│   │   │   ├── chooseTarget.ts
│   │   │   ├── evaluateBoard.ts
│   │   │   ├── generateActionChoice.ts
│   │   │   ├── generateReactionRoll.ts
│   │   │   ├── getAvailableResponses.ts
│   │   │   └── scoreReaction.ts
│   │   ├── defense
│   │   │   ├── decideDefenseResolution.ts
│   │   │   └── generateDefenseRoll.ts
│   │   ├── executeAIDefenseResolution.ts
│   │   ├── executeAIMovement.ts
│   │   ├── executeAIReaction.ts
│   │   ├── executeAIResponseAction.ts
│   │   ├── executeAITurn.ts
│   │   ├── personalities
│   │   ├── response
│   │   │   └── decideResponseAction.ts
│   │   ├── types
│   │   │   ├── aiContext.ts
│   │   │   ├── aiDecision.ts
│   │   │   ├── aiReactionDecision.ts
│   │   │   ├── aiResponseOption.ts
│   │   │   └── reactionType.ts
│   │   └── weights
│   ├── App.css
│   ├── App.tsx
│   ├── assets
│   │   └── react.svg
│   ├── components
│   │   ├── context
│   │   │   └── MusicContext.tsx
│   │   ├── mechanisms
│   │   │   ├── doors.tsx
│   │   │   └── ia.tsx
│   │   ├── music
│   │   │   ├── MusicDJPanel.tsx
│   │   │   └── MusicList.tsx
│   │   └── ui
│   │       ├── ActionForm.tsx
│   │       ├── BattlePanel.tsx
│   │       ├── CardContinuityConditionForm.tsx
│   │       ├── CardCreateForm.tsx
│   │       ├── CardEditForm.tsx
│   │       ├── CardForm.tsx
│   │       ├── CreateMapObject.tsx
│   │       ├── DefenseResolutionForm.tsx
│   │       ├── GenerateMaze.tsx
│   │       ├── Introduction.tsx
│   │       ├── Inventory.tsx
│   │       ├── ItemCreateForm.tsx
│   │       ├── ItemEditForm.tsx
│   │       ├── MapSelect.tsx
│   │       ├── OffensiveCardResolution.tsx
│   │       ├── PresentItem.tsx
│   │       ├── ReactionPrompt.tsx
│   │       ├── SettingsDropdown.tsx
│   │       ├── Sidebar.tsx
│   │       ├── StageChain.tsx
│   │       ├── StatusBars.tsx
│   │       ├── TokenEditForm.tsx
│   │       └── TokenForm.tsx
│   ├── hooks
│   │   └── useMusicLibrary.ts
│   ├── index.css
│   ├── main.tsx
│   ├── musics
│   │   ├── Ancient Stones.mp3
│   │   ├── Apocalypse Fabrications.mp3
│   │   ├── At Doom's Gate.mp3
│   │   ├── BFG Division.mp3
│   │   ├── Breath of Life.mp3
│   │   ├── Catastrophic Fabrications.mp3
│   │   ├── Corre.mp3
│   │   ├── Disc 13.mp3
│   │   ├── Draedon Theme's.mp3
│   │   ├── Goodbye Brother.mp3
│   │   ├── Inferior Fabrications.mp3
│   │   ├── My Hero Academia OST - You Say Run.mp3
│   │   ├── Red Sex (Slowed).mp3
│   │   ├── Sangria - ODM.mp3
│   │   ├── Trinity.mp3
│   │   └── Untrust Us (Slowed).mp3
│   ├── pages
│   │   └── BoardPage.tsx
│   ├── routes
│   │   └── index.tsx
│   ├── saves
│   │   ├── cards
│   │   │   └── save-cards.json
│   │   ├── items
│   │   │   └── save-items.json
│   │   ├── maps
│   │   │   └── save-maps.json
│   │   └── tokens
│   │       └── save-tokens.json
│   ├── test
│   │   └── tst.ts
│   ├── types
│   │   ├── battle.ts
│   │   ├── card.ts
│   │   ├── effects.ts
│   │   ├── elementoVFX.tsx
│   │   ├── executeChoice.ts
│   │   ├── getTokenVisual.ts
│   │   ├── item.ts
│   │   ├── mapas.ts
│   │   ├── mapObject.ts
│   │   ├── music.ts
│   │   ├── soundtouchjs.d.ts
│   │   ├── status.ts
│   │   ├── target.tsx
│   │   ├── text-to-svg.d.ts
│   │   ├── tokenEffectVisual.ts
│   │   └── token.tsx
│   └── utils
│       ├── battleCalculations.tsx
│       ├── battleEffects.ts
│       └── paralysis.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
</>

---

# Stack Tecnológica

Frontend:

* React
* TypeScript
* TailwindCSS

Persistência:

* LocalStorage (atualmente)

Planejado:

* Backend dedicado
* Banco de dados persistente

---

# Estrutura Conceitual

O sistema gira em torno de algumas entidades principais.

## Token

Representa qualquer entidade do tabuleiro.

Pode ser:

* Jogador
* NPC
* IA
* Monstro
* Invocação

Contém:

* atributos
* posição
* vida
* mana
* inventário
* efeitos
* equipe

---

## BattleState

Representa o estado global de combate.

Possui:

* status da batalha
* turnOrder
* currentTurnIndex
* rodada atual
* histórico de ações
* ações acumuladas

---

## TurnOrder

Fila de turnos.

Exemplo:

```ts
[
  { tokenId: "A" },
  { tokenId: "B" },
  { tokenId: "C" }
]
```

O índice atual é controlado por:

```ts
battleState.currentTurnIndex
```

---

## Board Tokens

Coleção principal de tokens ativos.

```ts
boardTokens
```

Toda lógica de combate depende dela.

---

# Sistema de Combate

O combate é totalmente automatizado.

Fluxo simplificado:

1. Início da batalha
2. Geração da ordem de turnos
3. Turno atual é selecionado
4. Jogador ou IA age
5. Reações são resolvidas
6. Dano é aplicado
7. Mortes são processadas
8. Próximo turno

---

# Paper do Sistema de Combate - Combact Sect

1. INTRODUÇÃO
A respectiva leitura conduzirá o leitor a compreender o funcionamento do sistema de RPG denominado Combat Sect, grandemente inspirado no D&D 5° Edição. Consulte o manual toda vez que surgirem dúvidas, que é relativamente normal levando em consideração a complexidade inicial do sistema.
2. APÊNDICES DE COMBATE
TESTES
TOKEN
BARRAS
2.1. OS TESTES
Os testes determinam um sucesso ou uma falha, para os testes é necessário girar um dado para determinar seu acerto ou sua falha, dependendo do teste, existe um modificador que serve para adicionar a seu dado um certo bônus aumentando assim o valor gerado, seu o numero do seu teste passa de um certo número proposto pelo mestre, dizemos que o teste deu sucesso, e você pode determinar este seu sucesso o descrevendo da maneira que desejar, caso contrário se falhar, o mestre irá determinar o modo em que você falhou e as consequências dessa falha.
2.2. TOKEN
Quando estiver em um combate, algo a se reparar é seu token, é possível notar algumas estatísticas nele, como algumas barras que ficam acima ou abaixo dele, geralmente editado pelo Mestre para mostrar como se encontra seu personagem no atual momento. Mas vamos entender mais a fundo. A aura que rodeia o token é o range corpo-a-corpo do personagem, ele determinará se socos, chutes, cotoveladas e afins irão acertar sim ou não seu adversário.
2.3. BARRAS
A barra de vida é um fator que depende da consistência e do nível do personagem para ser calculado. A segunda barra determina o estoque mágico/mana ou estamina ( de acordo com o que se trata o RPG ), o número dessa barra é calculada da seguinte maneira: Modificador de Sabedoria + Proficiência em Sabedoria (caso tenha) + Itens ou outros fatores ocasionais, existirá também habilidades que podem elevar esse número ou diminuí-lo, até mesmo situações dentro do RPG que pode reduzir ou aumentar esse número, de certa forma fica em aberto o jeito em que o mestre deseja modificá-lo. No Combat Sect existe um indicador delimitado por duas bolinhas roxas, o Dado Certo, este dado é muito útil, deve-se ter uma estratégia boa para utilizá-lo, ele age como um dado crítico com algumas adições, este dado tem uma vantagem quando a questão é “sair vivo de uma situação”, por batalha, é distribuído aos jogadores apenas dois desses dados, uma vez gastos em uma batalha eles não retomam.
3. REGRAS DO COMBATE
INICIATIVA
NÚMERO DOS DADOS
AÇÕES COMUNS
REAÇÃO
DESTREZA E CONSISTÊNCIA
TIPOS DE JOGADAS
ARTIFÍCIOS
3.1. INICIATIVA
No início de uma batalha, ambos os jogadores jogam teste de destreza ( disparo ) para ver quem começa o turno. Aquele que ganhar com a maior pontuação no dado, terá direito a duas ações no início de seu turno.
3.2. NÚMERO DOS DADOS
Os dados no Combat Sect se comportam de uma maneira semelhante ao D&D Tradicional. Caso o dado caia 1, o dado é considerado falha crítica e uma péssima consequência ocorrerá sobre o jogador que falhou em determinado teste. No intervalo de 2 a 19 os dados têm seus efeitos normais. Caso tire 20 é considerado crítico, então um número aleatório será selecionado entre 2 e 4, isso pode ser feito jogando um d4 e desconsiderando caso o valor caia em 1, assim jogando novamente, o número que cair deve multiplicar pelo valor tirado no d20. 
3.3. AÇÕES COMUNS
Toda e qualquer ação que utilize algum atributo e não seja alguma ação especial de habilidade é considerada ação comum.
3.4. REAÇÃO
As reações podem ser feitas quando você não está no seu turno e algo dentro de um cenário pode vir a te afetar, pode ser algo vindo de um ambiente ou de uma entidade, porém apenas dois tipos de teste são admitidos: teste de consistência ou teste de destreza. Todavia, se o jogador possuir alguma ação especial que, em sua descrição, especifique que pode ser usada como uma reação, ela também é admitida.
3.5. DESTREZA E CONSISTÊNCIA
A consistência e a destreza apesar de semelhantes têm uma grande diferença, isso impacta diretamente os testes e suas ações. A consistência sempre diminui o dano recebido mesmo quando baixo. Em geral a Consistência é “bem melhor” para defesa do que a destreza. A destreza pode ser utilizada mais para definir outras jogadas, veja especificamente no tópico de " TIPOS DE JOGADAS".
 3.6. TIPOS DE JOGADAS
Nessa parte não será listada as ações que já conhecemos (atacar, investigar, convencer...), caso queira conhecer esses tipos de jogadas pode optar por pesquisar sobre isso no livro do jogador ou na internet, aqui será listada apenas jogadas específicas que são possíveis de se fazer durante uma batalha.
JOGADAS DE PARALISIA
SINCRONIZAR
QUEBRA COM DEFESA
CONTRA-ATAQUE
SURPREENDER
INTENSIFICAR
DESNORTEAR
COMBO
ACÚMULO DE AÇÕES
AÇÃO DE MÃO-ÚNICA
INTERVIR
LIVRAMENTO DE AÇÕES
3.6.1. JOGADAS DE PARALISIA
Ataques carregados com mana sempre irão paralisar o inimigo rapidamente (caso dado obtido seja maior), a chamada paralisia rápida, isso dá o direito de girar seu dado livremente para definir o dano que ele irá receber durante essa paralisia, porém, caso você tente lançar outro ataque carregado, o inimigo vai perder a paralisia e poderá se defender de alguma forma.
3.6.2. SINCRONIZAR
Quando estiver em equipe, você pode optar por fazer uma ação sincronizada com um aliado. Nesse caso, ambos devem girar um d6 e obter o mesmo número. Por exemplo, se dois jogadores jogarem um dado e tirarem 4 simultaneamente, ambos podem fazer um ataque combinado ou uma magia composta e assim por diante. Porém, a única exceção é o número 1: se ambos tirarem 1 simultaneamente no dado, nenhum dos dois joga. Esse requisito também vale quando os jogadores estão em grupo com mais de dois membros. Em um grupo de três, por exemplo, a regra é a mesma: os três jogam um d6, e os que tirarem dados iguais jogam simultaneamente. Caso o jogador tire um crítico (6) no dado de sincronização, ele pode combinar com quem for o dono do turno. Caso ele seja o dono do turno, poderá escolher alguém para combinar.
3.6.3. QUEBRA COM DEFESA
O Quebra com Defesa irá ocorrer quando o seu dado de consistência (e somente consistência) for maior que o dado de ataque do inimigo, o inimigo necessita estar corpo-a-corpo para isso ocorrer, quando isso ocorrer, seu adversário fica exposto a tomar 1 ataque livre.
3.6.4. CONTRA-ATAQUE
A destreza só impossibilita a perda do dano caso o dado obtido seja maior que o dado adversário, caso esse seja versátil, gire um dado de ataque e atribua o dobro do dano para o adversário, obtido no dado. Essa reação é chamada de contra-ataque, o uso de mana também é válido para essa ação.
3.6.5. SURPREENDER
Esta ação é bastante útil na hora de fazer combos, apesar de arriscada. Uma vez que é seu turno, você pode declarar uma tentativa de surpreender seu adversário, ambos jogaram teste de destreza, porém seu adversário jogará este teste com vantagem, se seu dado for maior que o do seu adversário, ele receberá 3 ações livres e perderá seu turno (o chamado turn-cancel), caso contrário, você receberá 1 ações livres. Uma vez feita a tentativa de realizar a ação do surpreender, o jogador que a utilizou deverá aguardar 8 rounds para reutilizá-la ou então pagar 3 ações para comprar o surpreender novamente. Se você tentar surpreender seu adversário pela 2° vez consecutiva, ambos jogaram teste de destreza, seu adversário jogará com vantagem e você com desvantagem, se seu dado for maior que o do seu adversário, ele receberá 6 ações livres e perderá seu turno, caso contrário, você receberá 3 ações livres. Um surpreender é considerado consecutivo quando o 1° surpreender foi aplicado com sucesso.
3.6.6. INTENSIFICAR
Esta ação só pode ser usada em batalha e em inimigos com até o dobro de sua sabedoria ( caso você tenha proficiência, isso vale para inimigos com até o triplo de sua sabedoria ). Caso o inimigo possua algum efeito ou condição causado por mana, você deve fazer um teste de inteligência, e seu adversário também. Caso seu dado saia maior que o dado adversário, duplique as condições nele, caso contrário, o indivíduo sofrerá somente metade das condições ocasionadas nele.
3.6.7 DESNORTEAR
Uma vez que seja ou não seu turno, jogue um dado de sabedoria, seu adversário irá jogar com vantagem, caso seu dado saia maior do que o do adversário, será considerado desnorteado, significa que ele poderá receber uma ação livre, ele perderá todas as ações que ele acumulou e será dada para você, somando claro, com as ações atuais que você tem (essa soma não pode ultrapassar o seu limite de ações possíveis de acumular), mas caso seu dado saia menor, você perderá suas ações, e receberá uma ação livre.
3.6.8 PREVER
A ação de prever consiste em fazer um teste de inteligência contra o adversário, caso o seu dado se sobressaia sobre o dado do adversário, haverá um sucesso na ação de prever, assim, caso a próxima ação venha a afetar o jogador de algum modo, essa ação será negada. Algumas ações em especial podem ocasionar efeito sobre o jogador que conseguiu fazê-la, isso é determinado pelo mestre.
3.6.9 COMBO
Algo é considerado um combo quando é realizado uma série de 6 ataques consecutivos, quando um combo é realizado, o jogador que aplicou o combo receberá vantagem na próxima ação realizada.
3.6.10. ACÚMULO DE AÇÕES
Geralmente um jogador só pode realizar uma ação por turno, porém isso muda caso o jogador deseje pular o turno sem ter feito nada, caso ele faça isso, o seu próximo turno, ou até mesmo no seu pré-turno, ele poderá realizar 2 ações, ou quantas ações ele tiver depositado. O limite de ações a serem depositadas é de somente 5.
3.6.11. AÇÃO DE MÃO-ÚNICA
Caso você tenha mais de uma ação, e com elas deseja fazer apenas uma porém mais intensa, pode usar todas ou algumas para fazer tal ação, exemplo: você tem duas ações e deseja com elas fazer uma "Super-Esquiva" assim você irá girar 2d20 +2*X. 
Em fórmula: 
(Quantidade de ações)d20+(Quantidade de ações)*(Soma total dos modificadores)
Desse modo, caracteriza-se uma ação de mão única.
3.6.12. INTERVIR
Quando se estiver a 5 pés de um aliado, uma ação chamada intervir pode ser realizada. Intervir significa atuar em um pré-turno de um jogador de modo a auxiliá-lo. Isso pode ser feito declarando a ação de intervir ao Mestre e em seguida jogando o dado como se estivesse reagindo a uma ação. Para que a ação de intervir seja aceita de fato, é necessário que o jogador que deseja intervir tenha mais de 1 ação em estoque.
3.6.13. CRIAR FORMAÇÕES DE BATALHA
Uma formação de batalha é realizada quando dois indivíduos gastam 2 ações cada um e simultaneamente para a partir de então, terem todas as suas próximas ações sincronizadas. Indivíduos em uma formação de batalha não podem realizar uma sincronia com alguém fora da formação e muito menos receber intervenção de personagens externos à formação. Os benefícios de uma formação remetem a dois personagens jogarem de formas simultâneas sem nenhuma necessidade de fatores de sorte. 
Quando uma formação é criada, a dupla deve escolher algum benefício de formação, são alguns desses benefícios:

Força aprimorada: Os indivíduos se tornam mais confiantes, isso impacta diretamente na sua força. A força de cada personagem na formação multiplica por 1.25x.
Disparo adrenalínico: Em uma formação de batalha, ambos se dispõe a uma batalha mais sangrenta, oque faz a adrenalina da dupla se elevar de modo alarmante. A destreza de cada personagem na formação multiplica por 1.25x.
QI Compartilhado: Caso a formação ocorra entre indivíduos que possuam proficiência em inteligência ou, então, possuam as classes de mago, feiticeiro ou bruxo, poderão realizar tal formação. O atributo de inteligência de ambos é multiplicado por 1.5x.
Protagonismo Avançado: Formação válida apenas para jogadores, não inclui NPC 's. Nessa formação, é possível que ambos os jogadores possam adquirir 1 dado certo, caso os mesmos tenham desperdiçado os outros 2 dados certos.
Aliança de Guerra: Essa formação só pode ser feita se os dois elos da formação forem da classe de guerreiros. No momento em que a formação for realizada, ambos os guerreiros ganham mais 1 ação, e o limite de ações acumuladas sobe de 5 para 6. O surto de ação de um dos elos vale para os dois.
Demanda de Mana: Uma formação que pode ser realizada se um dos elos do grupo for um mago. O mago da formação tem o direito de utilizar da própria mana e da mana do outro integrante da formação. Além disso, as hard magic do grupo tem ganho de 1.25x.
Combinação Mágica: Formação realizada se ambos os integrantes do elo forem magos. A mana de ambos os magos tem um multiplicador bonûs de 2x. A mana de ambos pode ser compartilhada e qualquer ataque mágico recebe multiplicador de 1.5x.
Trapaceiro sem Remorso: Essa formação pode ser realizada caso um integrante do grupo for um ladino. Se o ambiente for favorável, com bastante esconderijos e obstáculos, um dos elos da formação pode gastar somente 1 ação para dar brecha ao ladino realizar um ataque furtivo. Caso o ambiente não seja favorável ao ataque furtivo, um dos elos deve gastar 2 ações para realizar o mesmo.
Malandragem em Dobro: Essa formação só pode ser realizada se ambos os lados do elo forem ladinos. Desse modo, cada jogador em sua vez ganha 2 ações cada vez que chega um turno de algum deles. Caso o ambiente for favorável a eles, um deles pode gastar 2 ações para realizarem um ataque furtivo em conjunto.
Fúria Sangrenta: Formação realizada quando em ambos os lados do elo haverem bárbaros. A força de ambos é multiplicada por 2x. Cada ataque de algum dos bárbaros causam paralisia rápida. Ambos os bárbaros entram em estado de fúria automaticamente.
Elo com o feiticeiro: Essa formação é realizada quando há pelo menos um feiticeiro na formação. O feiticeiro pode fazer com que o outro lado da formação aprenda uma magia durante o tempo da formação. Além disso, toda vez que algum dos integrantes da formação realizar um ataque normal, o mesmo também pode, por opção, realizar um ataque mágico em conjunto sem cobrar recarga mas gastando sua respectiva mana. A spell da restauração mística é válida para os dois lados do elo.
Formação do Ídolo: Quando dois bruxos se juntam em uma formação, ambos utilizam de suas forças para invocar um ídolo, uma espécie de criatura divina altamente poderosa que será controlada pelos bruxos durante a sua formação.  Os bruxos ficam em pé inconscientes durante a formação, não podendo reagir diretamente.
Círculo de Paz: Formação realizada quando dois monges se reúnem. Os monges não podem ser atacados durante a formação. Qualquer efeito negativo para esses monges não surtirá qualquer efeito durante o estado de paz absoluta. Os monges não podem reagir para não interromperem o estado de paz. Para atacar algum dos monges é necessário doar ⅓ da vida total. Durante o estado de paz, os monges recobram vida e mana, de acordo com o card estabelecido para eles.
Formações Especiais: Demais formações podem depender do contexto do atual RPG. Esse tipo de formação pode incluir até mesmo mais de uma entidade e incluir efeitos dos mais variados tipos.

3.7. ARTIFÍCIOS

Artifícios são formas de ganhar uma espécie de upgrade durante a batalha. Os artifícios ficam listados no topo do token ou escritos em sua ficha, isso depende da plataforma de RPG que estiver utilizando. O uso de artifícios acontece somente no turno do jogador e por sua vez não gastam ações. Os artifícios são variados, e no geral, são um elemento de imersão de RPG, logo os artifícios se resumem a poções, feitiços ou qualquer objeto usável que dará alguma espécie de buffer temporário.


---

# Sistema de IA

A IA atua sobre o mesmo sistema usado pelos jogadores.

Ela não possui regras especiais.

O objetivo é que:

* jogadores
* NPCs
* monstros

utilizem exatamente as mesmas regras.

---

## Fluxo Atual da IA

1. IA recebe contexto

```ts
AIContext
```

2. IA escolhe ação

```ts
decideAction()
```

3. IA escolhe alvo

4. IA verifica alcance

5. IA move proceduralmente

6. IA executa ação

7. Turno é encerrado

---

# Sistema de Movimento Procedural

O movimento da IA não é instantâneo.

A criatura se desloca visualmente pelo mapa.

Fluxo:

```txt
IA decide atacar
↓
Está fora do alcance?
↓
Sim
↓
Move uma célula
↓
Recalcula alcance
↓
Move novamente
↓
Repete
↓
Alcance atingido
↓
Executa ataque
```

---

# Problema Atual da IA

O principal problema atual está relacionado à sincronização entre:

* turnos
* movimento procedural
* renderizações React
* callbacks assíncronos

A IA movimenta corretamente até o alvo.

Entretanto, em determinadas situações, especialmente quando uma IA inicia o combate, a ação ofensiva final não é executada corretamente.

Sintomas observados:

* IA move até o alvo
* alcance é detectado corretamente
* função de ataque é chamada
* ActionForm aparece indevidamente
* ataque não é resolvido

---

# Suspeita Principal

Existem fortes indícios de dependência implícita entre:

```ts
battleState.currentTurnIndex
```

e

```ts
handleExecuteAction()
```

A função atualmente depende do estado global do turno.

Entretanto o fluxo da IA é assíncrono.

Isso pode gerar inconsistências causadas por:

* re-renderizações
* closures antigas
* atualização de estados React
* remoção de tokens mortos
* reorganização de turnos

---

# Diretriz para Correções

Sempre preferir:

```ts
handleExecuteAction(
  attackerId,
  choice
)
```

ao invés de:

```ts
handleExecuteAction(choice)
```

quando a execução ocorrer em contexto assíncrono.

Evitar dependência implícita de:

```ts
battleState.currentTurnIndex
```

dentro de callbacks de IA.

---

# Objetivo Futuro

Transformar o CT-Tabuleiro em uma VTT altamente automatizada capaz de suportar:

* combate procedural completo
* IA avançada de inimigos
* geração dinâmica de mapas
* exploração automatizada
* lojas dinâmicas
* inventário persistente
* progressão automática
* eventos mundiais
* modos especiais de combate
* integração com IA generativa

Mantendo como prioridade máxima:

IMERSÃO + AUTOMAÇÃO + REDUÇÃO DE TEMPO MORTO.
