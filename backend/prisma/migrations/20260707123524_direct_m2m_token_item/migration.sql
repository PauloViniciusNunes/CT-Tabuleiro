/*
  Warnings:

  - You are about to drop the column `tokenId` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `tokenId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the `TokenCard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TokenItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_tokenId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_tokenId_fkey";

-- DropForeignKey
ALTER TABLE "TokenCard" DROP CONSTRAINT "TokenCard_cardId_fkey";

-- DropForeignKey
ALTER TABLE "TokenCard" DROP CONSTRAINT "TokenCard_tokenId_fkey";

-- DropForeignKey
ALTER TABLE "TokenItem" DROP CONSTRAINT "TokenItem_itemInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "TokenItem" DROP CONSTRAINT "TokenItem_tokenInstanceId_fkey";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "tokenId";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "tokenId";

-- DropTable
DROP TABLE "TokenCard";

-- DropTable
DROP TABLE "TokenItem";

-- CreateTable
CREATE TABLE "InstanceTokenCard" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "remainingRecharge" INTEGER NOT NULL DEFAULT 0,
    "remainingDuration" INTEGER NOT NULL DEFAULT 0,
    "itsLoaded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstanceTokenCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstanceTokenItem" (
    "id" TEXT NOT NULL,
    "tokenInstanceId" TEXT NOT NULL,
    "itemInstanceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "durability" INTEGER,
    "maxDurability" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstanceTokenItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CardToToken" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CardToToken_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ItemToToken" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ItemToToken_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "InstanceTokenCard_tokenId_idx" ON "InstanceTokenCard"("tokenId");

-- CreateIndex
CREATE INDEX "InstanceTokenCard_cardId_idx" ON "InstanceTokenCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "InstanceTokenCard_tokenId_cardId_key" ON "InstanceTokenCard"("tokenId", "cardId");

-- CreateIndex
CREATE INDEX "InstanceTokenItem_tokenInstanceId_idx" ON "InstanceTokenItem"("tokenInstanceId");

-- CreateIndex
CREATE INDEX "InstanceTokenItem_itemInstanceId_idx" ON "InstanceTokenItem"("itemInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "InstanceTokenItem_tokenInstanceId_itemInstanceId_key" ON "InstanceTokenItem"("tokenInstanceId", "itemInstanceId");

-- CreateIndex
CREATE INDEX "_CardToToken_B_index" ON "_CardToToken"("B");

-- CreateIndex
CREATE INDEX "_ItemToToken_B_index" ON "_ItemToToken"("B");

-- AddForeignKey
ALTER TABLE "InstanceTokenCard" ADD CONSTRAINT "InstanceTokenCard_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "TokenInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceTokenCard" ADD CONSTRAINT "InstanceTokenCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceTokenItem" ADD CONSTRAINT "InstanceTokenItem_tokenInstanceId_fkey" FOREIGN KEY ("tokenInstanceId") REFERENCES "TokenInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceTokenItem" ADD CONSTRAINT "InstanceTokenItem_itemInstanceId_fkey" FOREIGN KEY ("itemInstanceId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToToken" ADD CONSTRAINT "_CardToToken_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToToken" ADD CONSTRAINT "_CardToToken_B_fkey" FOREIGN KEY ("B") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToToken" ADD CONSTRAINT "_ItemToToken_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToToken" ADD CONSTRAINT "_ItemToToken_B_fkey" FOREIGN KEY ("B") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;
