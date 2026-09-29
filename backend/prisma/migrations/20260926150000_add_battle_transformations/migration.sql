ALTER TABLE "Token"
ADD COLUMN "transformationRecharge" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TokenInstance"
ADD COLUMN "transformationRecharge" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PendingQueue"
ADD COLUMN "pendingTransformationResolution" JSONB;

ALTER TABLE "BattleState"
ADD COLUMN "transformationStates" JSONB NOT NULL DEFAULT '{}';
