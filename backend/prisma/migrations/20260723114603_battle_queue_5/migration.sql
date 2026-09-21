/*
  Warnings:

  - You are about to drop the column `setDidActThisTurn` on the `BattleState` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BattleState" DROP COLUMN "setDidActThisTurn",
ADD COLUMN     "didActThisTurn" JSONB NOT NULL DEFAULT '[]';
