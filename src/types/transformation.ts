export interface TransformationOption {
  templateId: string;
  name: string;
  imageUrl: string;
  direction: "transform" | "revert";
  durationMode: "persistent" | "rounds";
  durationRounds: number | null;
  rechargeRounds: number;
  remainingRecharge: number;
}

export interface PendingTransformationResolution {
  requestId: string;
  tokenId: string;
  ownerId: string;
  options: TransformationOption[];
}

export type TransformationCommand = {
  battleId: string;
  requestId: string;
  action: "submit" | "cancel";
  templateId?: string;
};
