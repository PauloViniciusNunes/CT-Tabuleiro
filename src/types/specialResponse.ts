export type SpecialResponseSelectValue = string | number;

interface SpecialResponseFieldBase {
  id: string;
  label: string;
  required?: boolean;
}

export interface SpecialResponseNumberField extends SpecialResponseFieldBase {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  defaultValue?: number;
}

export interface SpecialResponseSelectField extends SpecialResponseFieldBase {
  type: "select";
  options: Array<{ label: string; value: SpecialResponseSelectValue }>;
  defaultValue?: SpecialResponseSelectValue;
}

export type SpecialResponseField =
  | SpecialResponseNumberField
  | SpecialResponseSelectField;

export interface PendingSpecialResponse {
  requestId: string;
  responderTokenId: string;
  responderUserId: string;
  requestedByTokenId?: string;
  title: string;
  description?: string;
  fields: SpecialResponseField[];
  createdAt: string;
}

export type SpecialResponseValues = Record<string, string | number>;

export type SpecialResponseCommand = {
  battleId: string;
  requestId: string;
  action: "submit" | "cancel";
  values?: SpecialResponseValues;
};
