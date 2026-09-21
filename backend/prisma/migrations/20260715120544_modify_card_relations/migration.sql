/*
  Warnings:

  - The `cards` column on the `Token` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cards` column on the `TokenInstance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `_CardToToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ItemToToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InstanceTokenCard" DROP CONSTRAINT "InstanceTokenCard_cardId_fkey";

-- DropForeignKey
ALTER TABLE "InstanceTokenCard" DROP CONSTRAINT "InstanceTokenCard_tokenId_fkey";

-- DropForeignKey
ALTER TABLE "MapObject" DROP CONSTRAINT "MapObject_itemRelativeId_fkey";

-- DropForeignKey
ALTER TABLE "_CardToToken" DROP CONSTRAINT "_CardToToken_A_fkey";

-- DropForeignKey
ALTER TABLE "_CardToToken" DROP CONSTRAINT "_CardToToken_B_fkey";

-- DropForeignKey
ALTER TABLE "_ItemToToken" DROP CONSTRAINT "_ItemToToken_A_fkey";

-- DropForeignKey
ALTER TABLE "_ItemToToken" DROP CONSTRAINT "_ItemToToken_B_fkey";

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "instaceCardsIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "tokenCards" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "cards",
ADD COLUMN     "cards" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "TokenInstance" ADD COLUMN     "tokenCards" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "cards",
ADD COLUMN     "cards" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "_CardToToken";

-- DropTable
DROP TABLE "_ItemToToken";
