import { OptionalExtraAttackBehavior } from "../behaviors/OptionalExtraAttackBehavior";
import { RollQuantityBonusInterceptor } from "../interceptors/RollQuantityBonusInterceptor";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";


/*
Ao acertar um ataque, concede 3 ataques extras.
Não cresce exponencialmente. Só válido no primeiro ataque acertado no turno.
Ao acertar um ataque, form aparece pergutando "Ataques Extras, deseja usar?".
Caso responda Confirmar, consome canUsage. Reseta só quando voltar ao turno de quem porta
a mecânica. o número de ações na rolagem é adicionado +3 quando clica em confirmar.
+3 pois equivalente ao número no metadado extraAttacks.

O formulário so se interessa caso for uma rolagem de ataque físico com target definido.
A adição tambem so se interessa pelo caso de rolagem de ataque fisico com target definido.

Portanto o interceptor so se interessara por essas duas condições, e na condição de que pode usar
os ataques extras.

Se as condições de rolagem forem satisfeitas, a rolagem do ataque físico direcionado é interrompido>
o form aparece, e caso a resposta seja Confirmar > A rolagem adicionará +3 na parte de quantidade de ações,
equivalente a variável (Q). A rolagem continua válida mesmo se Q exceder 5.
*/
export class TreeExtraAttacksMechanic extends MechanicDefinition {
    id = "999";
    name = "tres-ataques-extra";
    behavior = [new OptionalExtraAttackBehavior()];
    abstractlistensTo = [
        MechanicEventType.TURN_INIT,
        MechanicEventType.ACTION_DISPATCH_REQUESTED,
    ];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config?: Record<string, unknown> = {
        extraAttacks: 3,
        canUsage: true
    };
    override readonly interceptors = [new RollQuantityBonusInterceptor()];
}
