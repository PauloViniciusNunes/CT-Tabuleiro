/*
  Warnings:

  - A unique constraint covering the columns `[pendingQueueId]` on the table `BattleState` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pendingQueueId` to the `BattleState` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Attributes" AS ENUM ('forca', 'destreza', 'consistencia', 'inteligencia', 'sabedoria', 'carisma');

-- CreateEnum
CREATE TYPE "ReactionAttribute" AS ENUM ('destreza', 'consistencia');

-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "pendingQueueId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PendingReaction" (
    "id" TEXT NOT NULL,
    "type" "ReactionAttribute" NOT NULL,
    "targetTokenId" TEXT NOT NULL,
    "pendingAttackId" TEXT,

    CONSTRAINT "PendingReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingCardResolution" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,

    CONSTRAINT "PendingCardResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAttack" (
    "id" TEXT NOT NULL,
    "attackerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rawDamage" INTEGER NOT NULL,
    "attackRoll" INTEGER NOT NULL,
    "usedMana" INTEGER NOT NULL,
    "attackAttribute" "Attributes" NOT NULL,
    "isReactionAllowed" BOOLEAN NOT NULL,
    "isFreeAttack" BOOLEAN NOT NULL,
    "usedActions" INTEGER NOT NULL,
    "atackElement" "TokenPrimaryElement" NOT NULL,
    "usedItemId" TEXT NOT NULL,

    CONSTRAINT "PendingAttack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingQueue" (
    "id" TEXT NOT NULL,
    "pendingAttackId" TEXT,
    "pendingReactionId" TEXT,
    "pendingCardResolutionId" TEXT,

    CONSTRAINT "PendingQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingQueue_pendingAttackId_key" ON "PendingQueue"("pendingAttackId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingQueue_pendingReactionId_key" ON "PendingQueue"("pendingReactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingQueue_pendingCardResolutionId_key" ON "PendingQueue"("pendingCardResolutionId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleState_pendingQueueId_key" ON "BattleState"("pendingQueueId");

-- AddForeignKey
ALTER TABLE "PendingReaction" ADD CONSTRAINT "PendingReaction_pendingAttackId_fkey" FOREIGN KEY ("pendingAttackId") REFERENCES "PendingAttack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingQueue" ADD CONSTRAINT "PendingQueue_pendingAttackId_fkey" FOREIGN KEY ("pendingAttackId") REFERENCES "PendingAttack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingQueue" ADD CONSTRAINT "PendingQueue_pendingReactionId_fkey" FOREIGN KEY ("pendingReactionId") REFERENCES "PendingReaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingQueue" ADD CONSTRAINT "PendingQueue_pendingCardResolutionId_fkey" FOREIGN KEY ("pendingCardResolutionId") REFERENCES "PendingCardResolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleState" ADD CONSTRAINT "BattleState_pendingQueueId_fkey" FOREIGN KEY ("pendingQueueId") REFERENCES "PendingQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
