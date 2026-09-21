/*
  Warnings:

  - You are about to drop the column `pendingAttackId` on the `PendingQueue` table. All the data in the column will be lost.
  - You are about to drop the column `pendingCardResolutionId` on the `PendingQueue` table. All the data in the column will be lost.
  - You are about to drop the column `pendingFreeResponseId` on the `PendingQueue` table. All the data in the column will be lost.
  - You are about to drop the column `pendingReactionId` on the `PendingQueue` table. All the data in the column will be lost.
  - You are about to drop the `PendingAttack` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PendingCardResolution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PendingFreeResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PendingReaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PendingQueue" DROP CONSTRAINT "PendingQueue_pendingAttackId_fkey";

-- DropForeignKey
ALTER TABLE "PendingQueue" DROP CONSTRAINT "PendingQueue_pendingCardResolutionId_fkey";

-- DropForeignKey
ALTER TABLE "PendingQueue" DROP CONSTRAINT "PendingQueue_pendingFreeResponseId_fkey";

-- DropForeignKey
ALTER TABLE "PendingQueue" DROP CONSTRAINT "PendingQueue_pendingReactionId_fkey";

-- DropForeignKey
ALTER TABLE "PendingReaction" DROP CONSTRAINT "PendingReaction_pendingAttackId_fkey";

-- DropIndex
DROP INDEX "PendingQueue_pendingAttackId_key";

-- DropIndex
DROP INDEX "PendingQueue_pendingCardResolutionId_key";

-- DropIndex
DROP INDEX "PendingQueue_pendingFreeResponseId_key";

-- DropIndex
DROP INDEX "PendingQueue_pendingReactionId_key";

-- AlterTable
ALTER TABLE "PendingQueue" DROP COLUMN "pendingAttackId",
DROP COLUMN "pendingCardResolutionId",
DROP COLUMN "pendingFreeResponseId",
DROP COLUMN "pendingReactionId",
ADD COLUMN     "pendingAttack" JSONB,
ADD COLUMN     "pendingCardResolution" JSONB,
ADD COLUMN     "pendingFreeResponse" JSONB,
ADD COLUMN     "pendingReaction" JSONB;

-- DropTable
DROP TABLE "PendingAttack";

-- DropTable
DROP TABLE "PendingCardResolution";

-- DropTable
DROP TABLE "PendingFreeResponse";

-- DropTable
DROP TABLE "PendingReaction";

-- DropEnum
DROP TYPE "ReactionAttribute";
