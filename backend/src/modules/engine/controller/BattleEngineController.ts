import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/shared/utils/getUser";
import { ChoiceValidator } from "../validators/ChoiceValidator";

import { BattleEngineStartBattleService } from "../services/BattleEngineStartBattleService";
import { BattleEngineExecuteActionService } from "../services/BattleEngineExecuteActionService";
import { BattleEngineReactionService } from "../services/BattleEngineReactionService";
import { BattleEngineEndBattleService } from "../services/BattleEngineEndBattleService";
import { BattleEngineNextTurnService } from "../services/micro-services/BattleEngineNextTurnService";
import { BattleEngineResponseService } from "../services/BattleEngineResponseService";
import { BattleEngineDefenseResolutionService } from "../services/BattleEngineDefenseResolutionService";
import { BattleEnginePrevAction } from "../services/BattleEnginePrevAction";
import { BattleEngineCardResolution } from "../services/BattleEngineCardResolution";
import { BattleEngineCancelReaction } from "../services/BattleEngineCancelReaction";
import { BattleEnginePivotSelection } from "../services/micro-services/BattleEnginePivotSelection";
import { BattleEngineConfirmPivot } from "../services/micro-services/BattleEngineConfirmPivot";
import { BattleEngineSwapItem } from "../services/micro-services/BattleEngineSwapItem";
import { BattleEngineOffensiveCardResponse } from "../services/BattleEngineOffensiveCardResponse";
import { CORS_HEADERS } from "@/shared/cors/headers";
import { SpecialResponseResolutionService } from "../special-response/SpecialResponseResolutionService";
import { BattleEngineUseArtificeService } from "../services/BattleEngineUseArtificeService";
import { BattleEngineMoveTokenService } from "../services/BattleEngineMoveTokenService";

export class BattleEngineController {

    private readonly battleEngineStartBattleService = new BattleEngineStartBattleService()
    private readonly battleEngineExecuteActionService = new BattleEngineExecuteActionService()
    private readonly battleEngineReactionService = new BattleEngineReactionService()
    private readonly battleEngineEndService = new BattleEngineEndBattleService()
    private readonly battleEngineNextTurnService = new BattleEngineNextTurnService()
    private readonly battleEngineResponseService = new BattleEngineResponseService()
    private readonly battleEngineDefenseService = new BattleEngineDefenseResolutionService()
    private readonly battleEnginePrevService = new BattleEnginePrevAction()

    private readonly battleEngineCardResolution = new BattleEngineCardResolution()
    private readonly battleEngineCancelReaction = new BattleEngineCancelReaction()
    private readonly battleEnginePivotSelection = new BattleEnginePivotSelection()

    private readonly battleEngineConfirmPivot = new BattleEngineConfirmPivot()
    private readonly battleEngineSwapItem = new BattleEngineSwapItem()
    private readonly battleEngineOffensiveCardResponse = new BattleEngineOffensiveCardResponse()
    private readonly specialResponseResolutionService = new SpecialResponseResolutionService()
    private readonly battleEngineUseArtificeService = new BattleEngineUseArtificeService()
    private readonly battleEngineMoveTokenService = new BattleEngineMoveTokenService()

    async start(mapId: string, request: NextRequest) {
        try {
            const user = await getUser(request)
            console.log("Chegando até aqui")
            await this.battleEngineStartBattleService.execute(mapId, user.id)
            return NextResponse.json(
                { message: "Battle started successfully" }, // Corpo da resposta
                {
                    status: 201, // Configuração real do status HTTP
                    headers: CORS_HEADERS,
                }
            );
        } catch (error) {
            console.error(error)
            const message =
                error instanceof Error
                    ? error.message
                    : "Não foi possível iniciar a batalha.";

            return NextResponse.json(
                { message },
                {
                    status: message === "Já existe uma batalha neste mapa." ? 409 : 400,
                    headers: CORS_HEADERS,
                },
            );
        }
    }

    async execute(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            const choiced = ChoiceValidator.parse(body)
            await this.battleEngineExecuteActionService.execute((choiced["battleId"] as string), choiced)
            return NextResponse.json(
                { message: "Ação executada com sucesso!" },
                {
                    status: 201,
                    headers: CORS_HEADERS,
                }
            )
        }
        catch (error) {

            console.error(error)
            return NextResponse.json(
                {
                    message: error instanceof Error ? error.message : "Não foi possível executar a ação.",
                },
                {
                    status: 400,
                    headers: CORS_HEADERS,
                },
            )

        }
    }

    async reaction(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            console.log(body)
            const choiced = ChoiceValidator.parse(body)
            await this.battleEngineReactionService.execute((choiced["battleId"] as string), choiced)
            return NextResponse.json(
                { message: "Reação foi executada com sucesso!" },
                {
                    status: 201,
                    headers: CORS_HEADERS,
                }
            );
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                { message: error },
                {
                    status: 400
                }
            )
        }
    }

    async end(request: NextRequest) {
        try {
            const user = getUser(request)
            const body = await request.json()
            await this.battleEngineEndService.execute(body.battleId)
            return NextResponse.json(
                { message: "Sucesso ao encerrar a batalha" },
                {
                    status: 201,
                    headers: CORS_HEADERS
                }
            )
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                { message: "A batalha não pode ser encerrada adequadamente." },
                {
                    status: 400
                }
            )
        }
    }

    async next(request: NextRequest) {
        try {

            const user = getUser(request)
            const body = await request.json()
            await this.battleEngineNextTurnService.execute(body.battleId)
            return NextResponse.json(
                { message: "Sucesso ao passar o turno" },
                {
                    status: 201,
                    headers: CORS_HEADERS
                }
            )

        } catch (error) {
            console.error(error)
            return NextResponse.json(
                { message: "Não foi possível passar o turno" },
                {
                    status: 400
                }
            )

        }
    }

    async response(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            await this.battleEngineResponseService.execute(body.battleId, body)
            return NextResponse.json(
                {message: "Sucesso ao declarar resposta!"},
                {
                    status: 200,
                    headers: CORS_HEADERS                   
                }
            )
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                {message: "Houve uma falha ao tentar realizar a response"},
                {
                    status: 400
                }
            )
            
        }
    }

    async cancelReaction(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            await this.battleEngineCancelReaction.execute(body.battleId)
            return NextResponse.json(
                {message: "Sucesso ao declarar cancelamento!"},
                {
                    status: 200,
                    headers: CORS_HEADERS                  
                }
            )            
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                {message: "Houve uma falha ao tentar realizar o cancelamento da reação"},
                {
                    status: 400
                }
            )
            
        }           
    }

    async defense(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            await this.battleEngineDefenseService.execute(body.battleId, body)
            return NextResponse.json(
                {message: "Sucesso ao declarar resolução-defesa!"},
                {
                    status: 200,
                    headers: CORS_HEADERS                 
                }
            )            
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                {message: "Houve uma falha ao tentar realizar a resolução de defesa"},
                {
                    status: 400
                }
            )
            
        }        
    }

    async prev(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            await this.battleEnginePrevService.execute(body.battleId)
            console.log("Isso chega até aqui?")
            return NextResponse.json(
                {message: "Sucesso ao declarar previsão de ação!"},
                {
                    status: 200,
                    headers: CORS_HEADERS                 
                }
            )            
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                {message: "Houve uma falha ao tentar realizar a previsão de ação."},
                {
                    status: 400
                }
            )
            
        }        
    }    

    async card(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            await this.battleEngineCardResolution.execute(body.battleId, body)

            return NextResponse.json(
                {message: "Sucesso ao lançar card"},
                {
                    status: 200,
                    headers: CORS_HEADERS                 
                }
            )            
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                {message: "Houve uma falha ao tentar realizar o lançamento do card."},
                {
                    status: 400
                }
            )
            
        }          
    }

    async pivot(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            await this.battleEnginePivotSelection.execute(body.battleId, body)

            return NextResponse.json(
                {message: "Sucesso ao escolher pivot"},
                {
                    status: 200,
                    headers: CORS_HEADERS                   
                }
            )            
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                {message: "Houve uma falha ao tentar realizar o lançamento do card."},
                {
                    status: 400
                }
            )
            
        }          
    }

    async confirmPivot(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            await this.battleEngineConfirmPivot.execute(body.battleId, body)

            return NextResponse.json(
                {message: "Sucesso ao escolher pivot"},
                {
                    status: 200,
                    headers: CORS_HEADERS                 
                }
            )            
        } catch (error) {
            console.error(error)
            return NextResponse.json(
                {message: "Houve uma falha ao tentar realizar o lançamento do card."},
                {
                    status: 400
                }
            )
            
        }            
    }

    async swapItem(request: NextRequest) {
        try {
            const user = await getUser(request);
            const body = await request.json();
            const token = await this.battleEngineSwapItem.execute(user.id, body);

            return NextResponse.json(token, {
                status: 200,
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.error(error);
            return NextResponse.json(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : "Não foi possível trocar o item.",
                },
                {
                    status: 400,
                    headers: CORS_HEADERS,
                },
            );
        }
    }

    async useArtifice(request: NextRequest) {
        try {
            const user = await getUser(request);
            const body = await request.json();
            const token = await this.battleEngineUseArtificeService.execute(user.id, body);

            return NextResponse.json(token, {
                status: 200,
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.error(error);
            return NextResponse.json(
                {
                    message: error instanceof Error
                        ? error.message
                        : "Não foi possível usar o artifício.",
                },
                { status: 400, headers: CORS_HEADERS },
            );
        }
    }

    async move(request: NextRequest) {
        try {
            const user = await getUser(request);
            const body = await request.json();
            const movement = await this.battleEngineMoveTokenService.execute(
                user.id,
                body,
            );

            return NextResponse.json(movement, {
                status: 200,
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.error(error);
            return NextResponse.json(
                {
                    message: error instanceof Error
                        ? error.message
                        : "Não foi possível mover o token.",
                },
                { status: 400, headers: CORS_HEADERS },
            );
        }
    }

    async offensiveCardResponse(request: NextRequest) {
        try {
            const user = await getUser(request);
            const body = await request.json();

            await this.battleEngineOffensiveCardResponse.execute(
                user.id,
                body.battleId,
                body,
            );

            return NextResponse.json(
                { message: "Defesa do card ofensivo resolvida com sucesso." },
                { status: 200, headers: CORS_HEADERS },
            );
        } catch (error) {
            console.error(error);
            return NextResponse.json(
                {
                    message: error instanceof Error
                        ? error.message
                        : "Não foi possível resolver a defesa do card ofensivo.",
                },
                { status: 400, headers: CORS_HEADERS },
            );
        }
    }

    async specialResponse(request: NextRequest) {
        try {
            const user = await getUser(request);
            const body = await request.json();
            const resolution = await this.specialResponseResolutionService.execute(
                user.id,
                body,
            );

            return NextResponse.json(resolution, {
                status: 200,
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.error(error);
            return NextResponse.json(
                {
                    message: error instanceof Error
                        ? error.message
                        : "Não foi possível resolver a resposta especial.",
                },
                { status: 400, headers: CORS_HEADERS },
            );
        }
    }
}
