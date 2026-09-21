/*
  Warnings:

  - You are about to drop the column `inventory` on the `TokenInstance` table. All the data in the column will be lost.
  - You are about to drop the column `tokenCards` on the `TokenInstance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TokenInstance" DROP COLUMN "inventory",
DROP COLUMN "tokenCards";

-- CreateTable
CREATE TABLE "TokenCard" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "remainingRecharge" INTEGER NOT NULL DEFAULT 0,
    "remainingDuration" INTEGER NOT NULL DEFAULT 0,
    "itsLoaded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "durability" INTEGER,
    "maxDurability" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenCard_tokenId_idx" ON "TokenCard"("tokenId");

-- CreateIndex
CREATE INDEX "TokenCard_cardId_idx" ON "TokenCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenCard_tokenId_cardId_key" ON "TokenCard"("tokenId", "cardId");

-- CreateIndex
CREATE INDEX "InventoryItem_tokenId_idx" ON "InventoryItem"("tokenId");

-- CreateIndex
CREATE INDEX "InventoryItem_itemId_idx" ON "InventoryItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tokenId_itemId_key" ON "InventoryItem"("tokenId", "itemId");

-- AddForeignKey
ALTER TABLE "TokenCard" ADD CONSTRAINT "TokenCard_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "TokenInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenCard" ADD CONSTRAINT "TokenCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "TokenInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
