export enum MechanicEventType {
    TURN_INIT = "combat.turn.init",
    DAMAGE_RECEIVED = "combat.damage.received",
    LIFE_INCREMENT = "combat.life.increment",
    LIFE_DECREASE = "combat.life.decrease",
    MANA_DECREASE = "combat.mana.decrease",
    MANA_INCREMENT = "combat.mana.increment",
    ACTION_INCREMENT = "combat.action.increment",
    ROLL_RESOLVED = "combat.roll.resolved",
    TOKEN_MOVED = "board.token.moved",
    ENVIRONMENT_CHANGED = "board.environment.changed",
    ENVIRONMENT_CHANGE_DENIED = "board.environment.change-denied",
    MECHANIC_APPLIED = "mechanic.applied",
    MECHANIC_PRE_REMOVED = "mechanic.pre-removed",
    TOKEN_RESOURCES_SET = "token.resources.set",
    ATTRIBUTE_TEST_RESOLVED = "combat.attribute-test.resolved",
    ACTION_DISPATCH_REQUESTED = "action.dispatch.requested",
    ACTION_DISPATCH = "action.dispatch"
}
