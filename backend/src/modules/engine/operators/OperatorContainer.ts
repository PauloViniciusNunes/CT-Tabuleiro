import { DamageOperator } from "./DamageOperator";
import { EnvironmentOperator } from "./EnvironmentOperator";
import { ManaDecreaseOperator } from "./ManaDecreaseOperator";
import { MovementOperator } from "./MovementOperator";
import type { Operator } from "./Operator";
import type { OperatorRuntime } from "./Operator";
import { OperatorType } from "./OperatorType";
import { RollOperator } from "./RollOperator";
import { MechanicApplicationOperator } from "./MechanicApplicationOperator";
import { TokenResourceOperator } from "./TokenResourceOperator";
import { ActionDispatchOperator } from "./ActionDispatchOperator";
import { ManaIncrementOperator } from "./ManaIncrementOperator";
import { LifeIncrementOperator } from "./LifeIncrementOperator";
import { LifeDecreaseOperator } from "./LifeDecreaseOperator";
import { ActionIncrementOperator } from "./ActionIncrementOperator";

interface OperatorMap {
    [OperatorType.DAMAGE]: DamageOperator;
    [OperatorType.LIFE_INCREMENT]: LifeIncrementOperator;
    [OperatorType.LIFE_DECREASE]: LifeDecreaseOperator;
    [OperatorType.ROLL]: RollOperator;
    [OperatorType.MOVEMENT]: MovementOperator;
    [OperatorType.ENVIRONMENT]: EnvironmentOperator;
    [OperatorType.MANA_DECREASE]: ManaDecreaseOperator;
    [OperatorType.MANA_INCREMENT]: ManaIncrementOperator;
    [OperatorType.ACTION_INCREMENT]: ActionIncrementOperator;
    [OperatorType.MECHANIC_APPLICATION]: MechanicApplicationOperator;
    [OperatorType.RESOURCE_SET]: TokenResourceOperator;
    [OperatorType.ACTION_DISPATCH]: ActionDispatchOperator;
}

type OperatorInput<Type extends OperatorType> =
    OperatorMap[Type] extends Operator<infer Input, unknown> ? Input : never;

type OperatorOutput<Type extends OperatorType> =
    OperatorMap[Type] extends Operator<unknown, infer Output> ? Output : never;

export class OperatorContainer {
    private readonly operators = new Map<OperatorType, object>();

    constructor(runtime: OperatorRuntime) {
        this.register(
            OperatorType.DAMAGE,
            new DamageOperator(runtime),
        );
        this.register(
            OperatorType.LIFE_INCREMENT,
            new LifeIncrementOperator(runtime),
        );
        this.register(
            OperatorType.LIFE_DECREASE,
            new LifeDecreaseOperator(runtime),
        );
        this.register(
            OperatorType.ROLL,
            new RollOperator(runtime),
        );
        this.register(
            OperatorType.MOVEMENT,
            new MovementOperator(runtime),
        );
        this.register(
            OperatorType.ENVIRONMENT,
            new EnvironmentOperator(runtime),
        );
        this.register(
            OperatorType.MANA_DECREASE,
            new ManaDecreaseOperator(runtime)
        )
        this.register(
            OperatorType.MANA_INCREMENT,
            new ManaIncrementOperator(runtime)
        )
        this.register(
            OperatorType.ACTION_INCREMENT,
            new ActionIncrementOperator(runtime),
        )
        this.register(
            OperatorType.MECHANIC_APPLICATION,
            new MechanicApplicationOperator(runtime),
        );
        this.register(
            OperatorType.RESOURCE_SET,
            new TokenResourceOperator(runtime),
        );
        this.register(
            OperatorType.ACTION_DISPATCH,
            new ActionDispatchOperator(runtime),
        );
    }

    register<Type extends OperatorType>(
        type: Type,
        operator: OperatorMap[Type],
    ): this {
        this.operators.set(type, operator);
        return this;
    }

    get<Type extends OperatorType>(type: Type): OperatorMap[Type] {
        const operator = this.operators.get(type);

        if (!operator) {
            throw new Error(`Operator não registrado para o tipo "${type}".`);
        }

        return operator as OperatorMap[Type];
    }

    execute<Type extends OperatorType>(
        type: Type,
        input: OperatorInput<Type>,
    ): Promise<OperatorOutput<Type>> {
        const operator = this.get(type) as unknown as Operator<
            OperatorInput<Type>,
            OperatorOutput<Type>
        >;

        return operator.execute(input);
    }
}
