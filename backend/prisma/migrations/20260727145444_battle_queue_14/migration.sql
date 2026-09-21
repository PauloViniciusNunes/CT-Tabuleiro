-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "lastTurnMoved" JSONB NOT NULL DEFAULT '{}';
