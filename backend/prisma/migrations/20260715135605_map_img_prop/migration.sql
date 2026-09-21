-- AlterTable
ALTER TABLE "Map" ADD COLUMN     "img" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Token" ALTER COLUMN "inventoryDimensionsRows" SET DEFAULT 4;
