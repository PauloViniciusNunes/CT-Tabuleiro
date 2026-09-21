/*
  Warnings:

  - The values [none] on the enum `TokenPrimaryDisvantage` will be removed. If these variants are still used in the database, this will fail.
  - The values [none] on the enum `TokenPrimaryElement` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TokenPrimaryDisvantage_new" AS ENUM ('neutro', 'fire', 'water', 'earth', 'air', 'light', 'dark');
ALTER TABLE "Token" ALTER COLUMN "tokenPrimaryDisvantage" TYPE "TokenPrimaryDisvantage_new" USING ("tokenPrimaryDisvantage"::text::"TokenPrimaryDisvantage_new");
ALTER TABLE "TokenInstance" ALTER COLUMN "tokenPrimaryDisvantage" TYPE "TokenPrimaryDisvantage_new" USING ("tokenPrimaryDisvantage"::text::"TokenPrimaryDisvantage_new");
ALTER TYPE "TokenPrimaryDisvantage" RENAME TO "TokenPrimaryDisvantage_old";
ALTER TYPE "TokenPrimaryDisvantage_new" RENAME TO "TokenPrimaryDisvantage";
DROP TYPE "public"."TokenPrimaryDisvantage_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TokenPrimaryElement_new" AS ENUM ('neutro', 'fire', 'water', 'earth', 'air', 'light', 'dark');
ALTER TABLE "Token" ALTER COLUMN "tokenPrimaryElement" TYPE "TokenPrimaryElement_new" USING ("tokenPrimaryElement"::text::"TokenPrimaryElement_new");
ALTER TABLE "TokenInstance" ALTER COLUMN "tokenPrimaryElement" TYPE "TokenPrimaryElement_new" USING ("tokenPrimaryElement"::text::"TokenPrimaryElement_new");
ALTER TYPE "TokenPrimaryElement" RENAME TO "TokenPrimaryElement_old";
ALTER TYPE "TokenPrimaryElement_new" RENAME TO "TokenPrimaryElement";
DROP TYPE "public"."TokenPrimaryElement_old";
COMMIT;
