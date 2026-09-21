-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "prevReaction" JSONB NOT NULL DEFAULT '{}';
