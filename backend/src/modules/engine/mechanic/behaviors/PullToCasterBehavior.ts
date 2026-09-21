import { MechanicEvent } from "../events/MechanicEvent";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";

import { BattleSetter } from "../../context/BattleSetter";

export class PullToCasterBehavior extends Behavior {

    private readonly battleStateRepository = new BattleStateRepository();
    private readonly battleSetter = new BattleSetter();
    private readonly tokenInstanceRepository = new TokenTemplateRepository();

    lister(): MechanicEventType[] {
        return [
            MechanicEventType.TURN_INIT
        ];
    }

    async execute(context: EngineContext, mechanic: MechanicInstance, event: MechanicEvent): Promise<void> {
        const battleState = await this.battleStateRepository.findById(context.battleId);

        if (!battleState) {
            throw new Error("Ocorreu um problema ao tentar encontrar uma batalha.");
        }

        const targetId = (mechanic.metadata["targetId"] as string) ?? "";
        const casterId = mechanic.sourceTokenId;

        if (!targetId || !casterId) {
            return;
        }

        // Busca o alvo puxado e o conjurador (caster)
        const targetToken = await this.tokenInstanceRepository.findTokenTemplateById(targetId);
        const casterToken = await this.tokenInstanceRepository.findTokenTemplateById(casterId);

        if (!targetToken) {
            throw new Error(`Não foi possível encontrar o token alvo com ID ${targetId}`);
        }

        if (!casterToken) {
            throw new Error(`Não foi possível encontrar o conjurador com ID ${casterId}`);
        }

        // 1. Calcula a diferença de posição entre o Alvo e o Conjurador
        const deltaCol = casterToken.col - targetToken.col;
        const deltaRow = casterToken.row - targetToken.row;

        // Se o alvo já estiver exatamente na mesma célula que o conjurador, ignora a atração
        if (Math.abs(deltaCol) <= 1 &&
            Math.abs(deltaRow) <= 1) {
            return;
        }

        // 2. Chebyshev Step: Math.sign resulta em -1, 0 ou 1 para cada eixo.
        // Isso desloca o token 1 célula na direção diagonal ou ortogonal do conjurador.
        const stepCol = Math.sign(deltaCol);
        const stepRow = Math.sign(deltaRow);

        const newCol = targetToken.col + stepCol;
        const newRow = targetToken.row + stepRow;

        // 3. Atualiza a posição do token puxado
        await this.tokenInstanceRepository.update(targetId, {
            col: newCol,
            row: newRow
        });

        // 4. Marca o ponto de partida do token para sincronizar as animações de interpolação no frontend
        await this.battleSetter.tokenDefineStartPosition(targetId);

        console.log(`[PULL EFFECT] Token ${targetId} puxado de (${targetToken.col}, ${targetToken.row}) para (${newCol}, ${newRow})`);
    }
}