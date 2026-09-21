/*
  Warnings:

  - You are about to drop the column `templateId` on the `TokenInstance` table. All the data in the column will be lost.
  - You are about to drop the `InventoryItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TokenTemplate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `tokenId` to the `Card` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenId` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_tokenId_fkey";

-- DropForeignKey
ALTER TABLE "TokenInstance" DROP CONSTRAINT "TokenInstance_templateId_fkey";

-- DropForeignKey
ALTER TABLE "TokenTemplate" DROP CONSTRAINT "TokenTemplate_userId_fkey";

-- DropIndex
DROP INDEX "TokenInstance_templateId_idx";

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "tokenId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "tokenId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TokenInstance" DROP COLUMN "templateId";

-- DropTable
DROP TABLE "InventoryItem";

-- DropTable
DROP TABLE "TokenTemplate";

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "lastDamagerId" TEXT,
    "name" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "forca" INTEGER NOT NULL DEFAULT 25,
    "destreza" INTEGER NOT NULL DEFAULT 25,
    "consistencia" INTEGER NOT NULL DEFAULT 25,
    "inteligencia" INTEGER NOT NULL DEFAULT 25,
    "sabedoria" INTEGER NOT NULL DEFAULT 25,
    "carisma" INTEGER NOT NULL DEFAULT 25,
    "level" INTEGER NOT NULL DEFAULT 2,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "bonusForca" INTEGER NOT NULL DEFAULT 0,
    "bonusDestreza" INTEGER NOT NULL DEFAULT 0,
    "bonusConsistencia" INTEGER NOT NULL DEFAULT 0,
    "bonusInteligencia" INTEGER NOT NULL DEFAULT 0,
    "bonusSabedoria" INTEGER NOT NULL DEFAULT 0,
    "bonusCarisma" INTEGER NOT NULL DEFAULT 0,
    "profForca" BOOLEAN NOT NULL DEFAULT false,
    "profDestreza" BOOLEAN NOT NULL DEFAULT false,
    "profConsistencia" BOOLEAN NOT NULL DEFAULT false,
    "profInteligencia" BOOLEAN NOT NULL DEFAULT false,
    "profSabedoria" BOOLEAN NOT NULL DEFAULT false,
    "profCarisma" BOOLEAN NOT NULL DEFAULT false,
    "class" "TokenClass" NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'Vivo',
    "team" "TokenTeam" NOT NULL,
    "col" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "startCol" INTEGER,
    "startRow" INTEGER,
    "bodyToBodyRange" INTEGER NOT NULL DEFAULT 1,
    "magicalRange" INTEGER NOT NULL DEFAULT 6,
    "pendingXPAllocating" INTEGER NOT NULL DEFAULT 0,
    "currentLife" INTEGER NOT NULL,
    "maxLife" INTEGER NOT NULL,
    "currentMana" INTEGER NOT NULL,
    "maxMana" INTEGER NOT NULL,
    "certaintyDiceRemaining" INTEGER,
    "paralysisState" "ParalysisState",
    "tokenPrimaryElement" "TokenPrimaryElement",
    "tokenPrimaryDisvantage" "TokenPrimaryDisvantage",
    "cards" JSONB NOT NULL DEFAULT '[]',
    "tokenEffects" JSONB NOT NULL DEFAULT '[]',
    "visualOverlays" JSONB NOT NULL DEFAULT '[]',
    "bossSettings" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenItem" (
    "id" TEXT NOT NULL,
    "tokenInstanceId" TEXT NOT NULL,
    "itemInstanceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "durability" INTEGER,
    "maxDurability" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Token_userId_idx" ON "Token"("userId");

-- CreateIndex
CREATE INDEX "TokenItem_tokenInstanceId_idx" ON "TokenItem"("tokenInstanceId");

-- CreateIndex
CREATE INDEX "TokenItem_itemInstanceId_idx" ON "TokenItem"("itemInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenItem_tokenInstanceId_itemInstanceId_key" ON "TokenItem"("tokenInstanceId", "itemInstanceId");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenItem" ADD CONSTRAINT "TokenItem_tokenInstanceId_fkey" FOREIGN KEY ("tokenInstanceId") REFERENCES "TokenInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenItem" ADD CONSTRAINT "TokenItem_itemInstanceId_fkey" FOREIGN KEY ("itemInstanceId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
