export enum SocketEvent {
    TOKEN_CREATED = "token.created",
    TOKEN_UPDATED = "token.updated",
    TOKEN_DELETED = "token.deleted",
    TOKEN_IN_OFFENSIVE_CARD = "token.offensive.card",
    TOKEN_IN_AMBIENT_PIVOT_SELECTION = "token.ambient.pivot.selection",

    CARD_CREATED = "card.created",
    CARD_UPDATED = "card.updated",

    MAP_UPDATED = "map.updated",
    CAMPAIGN_MEMBER_MAP_UPDATED = "campaign.member.map.updated",
    CAMPAIGN_PRESENCE_UPDATED = "campaign.presence.updated",

    CHAT_MESSAGE = "chat.message",

    TURN_STARTED = "combat.turn.started",

    BATTLE_STARTED = "combat.battle.started",
    BATTLE_UPDATED = "combat.battle.updated",
    BATTLE_ENDED = "combat.battle.ended",

    FRONTEND_CARD_SELECTION = "frontend.card.selection",
    FRONTEND_ADVANCE_TURN = "frontend.advance.turn",
    FRONTEND_IN_DEFENSE_RESOLUTION = "frontend.defense.resolution",
    FRONTEND_ADD_PREVIEW_CELLS = "frontend.preview.cells",
    FRONTEND_SET_PREVIEW_CELLS = "frontend.set.preview.cells",
    FRONTEND_SELECTED_CELL = "frontend.selected.cell",
    FRONTEND_SELECTED_TARGET = "frontend.selected.target",
    FRONTEND_OFFENSIVE_CARD_SCORE = "frontend.offensive.card.score",
    FRONTEND_OFFENSIVE_CARD_TEST_SCORE = "frontend.offensive.card.test.score",
    FRONTEND_IN_TARGET_SELECTION = "frontend.in.target.selection",
    FRONTEND_IN_CARD_SELECTION = "frontend.in.card.selection",
    FRONTEND_AMBIENT_PIVOT_SELECTION = "frontend.ambient.pivot.selection",
    FRONTEND_AMBIENT_PIVOT_PHASE = "frontend.ambient.pivot.phase",
    FRONTEND_SELECTED_PIVOTS = "frontend.selected.pivots",
    FRONTEND_ARMED_CARD = "frontend.armed.card",

    PENDING_ATTACK = "pending.attack",
    PENDING_ESQUIVA_ROLL = "pending.esquiva.roll",
    PENDING_CARD_RESOLUTION = "pending.card.resolution",
    PENDING_OFFENSIVE_CARD = "pending.offensive.card",
    PENDING_FREE_RESPONSE = "pending.free.response",
    PENDING_SPECIAL_RESPONSE = "pending.special.response",
}
