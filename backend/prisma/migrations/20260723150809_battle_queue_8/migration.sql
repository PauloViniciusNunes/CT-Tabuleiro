/*
  Warnings:

  - The `totalActionsReturn` column on the `BattleState` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "BattleState" DROP COLUMN "totalActionsReturn",
ADD COLUMN     "totalActionsReturn" INTEGER NOT NULL DEFAULT 0;
