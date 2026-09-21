-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "setDidActThisTurn" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "tokensBattlePosition" JSONB NOT NULL DEFAULT '[]';
