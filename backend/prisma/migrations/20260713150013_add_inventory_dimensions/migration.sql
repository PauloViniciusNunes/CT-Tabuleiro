/*
  Warnings:

  - Added the required column `armorId` to the `TokenInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `neckId` to the `TokenInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `offHandId` to the `TokenInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryHandId` to the `TokenInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ringId` to the `TokenInstance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "armorId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "commonSlotIds" TEXT[],
ADD COLUMN     "economy" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inventoryDimensionsCols" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "inventoryDimensionsRows" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "neckId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "offHandId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "primaryHandId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ringId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "TokenInstance" ADD COLUMN     "armorId" TEXT NOT NULL,
ADD COLUMN     "commonSlotIds" TEXT[],
ADD COLUMN     "economy" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inventoryDimensionsCols" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "inventoryDimensionsRows" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "neckId" TEXT NOT NULL,
ADD COLUMN     "offHandId" TEXT NOT NULL,
ADD COLUMN     "primaryHandId" TEXT NOT NULL,
ADD COLUMN     "ringId" TEXT NOT NULL;
