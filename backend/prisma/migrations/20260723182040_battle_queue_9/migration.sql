-- AlterTable
ALTER TABLE "BattleState" ALTER COLUMN "tokensBattlePosition" SET DEFAULT '{}',
ALTER COLUMN "didActThisTurn" SET DEFAULT '{}',
ALTER COLUMN "tokenParalysis" SET DEFAULT '{}',
ALTER COLUMN "freeActionLock" SET DEFAULT '{}',
ALTER COLUMN "remainingExtraActions" SET DEFAULT '{}';
