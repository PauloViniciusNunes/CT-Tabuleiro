/*
  Warnings:

  - The `tokenCards` column on the `TokenInstance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cards` column on the `TokenInstance` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "TokenInstance" DROP COLUMN "tokenCards",
ADD COLUMN     "tokenCards" JSONB NOT NULL DEFAULT '[]',
DROP COLUMN "cards",
ADD COLUMN     "cards" JSONB NOT NULL DEFAULT '[]';
