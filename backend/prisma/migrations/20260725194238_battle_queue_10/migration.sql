-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "previsionActions" JSONB NOT NULL DEFAULT '{}';
