-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "selectedPivots" JSONB NOT NULL DEFAULT '[]';
