/*
  Warnings:

  - The values [neutro] on the enum `TokenPrimaryDisvantage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TokenPrimaryDisvantage_new" AS ENUM ('none', 'fire', 'water', 'earth', 'air', 'light', 'dark');
ALTER TABLE "Token" ALTER COLUMN "tokenPrimaryDisvantage" TYPE "TokenPrimaryDisvantage_new" USING ("tokenPrimaryDisvantage"::text::"TokenPrimaryDisvantage_new");
ALTER TABLE "TokenInstance" ALTER COLUMN "tokenPrimaryDisvantage" TYPE "TokenPrimaryDisvantage_new" USING ("tokenPrimaryDisvantage"::text::"TokenPrimaryDisvantage_new");
ALTER TYPE "TokenPrimaryDisvantage" RENAME TO "TokenPrimaryDisvantage_old";
ALTER TYPE "TokenPrimaryDisvantage_new" RENAME TO "TokenPrimaryDisvantage";
DROP TYPE "public"."TokenPrimaryDisvantage_old";
COMMIT;
