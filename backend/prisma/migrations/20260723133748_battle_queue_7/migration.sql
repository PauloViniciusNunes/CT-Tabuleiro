-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "freeActionLock" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "remainingExtraActions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "totalActionsReturn" JSONB NOT NULL DEFAULT '[]';
