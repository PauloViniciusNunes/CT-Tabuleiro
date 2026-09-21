export type SpecialResponseSelectValue = string | number;

/** Identifies an action resumed by the handler of the currently pending form. */
export const SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY =
    "specialResponseContinuation";

interface SpecialResponseFieldBase {
    readonly id: string;
    readonly label: string;
    readonly required?: boolean;
}

export interface SpecialResponseNumberField extends SpecialResponseFieldBase {
    readonly type: "number";
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly integer?: boolean;
    readonly defaultValue?: number;
}

export interface SpecialResponseSelectField extends SpecialResponseFieldBase {
    readonly type: "select";
    readonly options: readonly {
        readonly label: string;
        readonly value: SpecialResponseSelectValue;
    }[];
    readonly defaultValue?: SpecialResponseSelectValue;
}

export type SpecialResponseField =
    | SpecialResponseNumberField
    | SpecialResponseSelectField;

export type SpecialResponseValue = number | string;

export interface PendingSpecialResponse {
    readonly requestId: string;
    readonly battleId: string;
    readonly mapId: string;
    readonly responderTokenId: string;
    readonly responderUserId: string;
    readonly requestedByTokenId?: string;
    readonly title: string;
    readonly description?: string;
    readonly fields: readonly SpecialResponseField[];
    readonly handlerKey: string;
    readonly context: Readonly<Record<string, unknown>>;
    readonly createdAt: string;
    readonly status: "PENDING";
}

export type PublicPendingSpecialResponse = Omit<
    PendingSpecialResponse,
    "battleId" | "mapId" | "handlerKey" | "context" | "status"
>;

export interface RequestSpecialResponseInput {
    readonly battleId: string;
    readonly responderTokenId: string;
    readonly requestedByTokenId?: string;
    readonly title: string;
    readonly description?: string;
    readonly fields: readonly SpecialResponseField[];
    readonly handlerKey: string;
    readonly context?: Readonly<Record<string, unknown>>;
}

export type SpecialResponseAction = "submit" | "cancel";

export interface SpecialResponseResolution {
    readonly action: SpecialResponseAction;
    readonly values: Readonly<Record<string, SpecialResponseValue>>;
}

export interface SpecialResponseHandlerContext {
    readonly pending: PendingSpecialResponse;
    readonly resolution: SpecialResponseResolution;
    readonly resolvedByUserId: string;
}

export type SpecialResponseHandler = (
    context: SpecialResponseHandlerContext,
) => Promise<void>;

export function toPublicPendingSpecialResponse(
    pending: PendingSpecialResponse,
): PublicPendingSpecialResponse {
    return {
        requestId: pending.requestId,
        responderTokenId: pending.responderTokenId,
        responderUserId: pending.responderUserId,
        requestedByTokenId: pending.requestedByTokenId,
        title: pending.title,
        description: pending.description,
        fields: pending.fields,
        createdAt: pending.createdAt,
    };
}
