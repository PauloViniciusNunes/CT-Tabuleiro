-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "movedThisTurn" JSONB NOT NULL DEFAULT '{}';
