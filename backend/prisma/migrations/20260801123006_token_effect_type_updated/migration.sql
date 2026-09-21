/*
  Warnings:

  - The `tokenPrimaryElement` column on the `Token` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tokenPrimaryDisvantage` column on the `Token` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tokenPrimaryElement` column on the `TokenInstance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tokenPrimaryDisvantage` column on the `TokenInstance` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Token" DROP COLUMN "tokenPrimaryElement",
ADD COLUMN     "tokenPrimaryElement" TEXT,
DROP COLUMN "tokenPrimaryDisvantage",
ADD COLUMN     "tokenPrimaryDisvantage" TEXT;

-- AlterTable
ALTER TABLE "TokenInstance" DROP COLUMN "tokenPrimaryElement",
ADD COLUMN     "tokenPrimaryElement" TEXT,
DROP COLUMN "tokenPrimaryDisvantage",
ADD COLUMN     "tokenPrimaryDisvantage" TEXT;
