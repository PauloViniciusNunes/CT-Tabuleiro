/*
  Warnings:

  - A unique constraint covering the columns `[pendingFreeResponseId]` on the table `PendingQueue` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PendingQueue" ADD COLUMN     "pendingEsquivaRoll" JSONB,
ADD COLUMN     "pendingFreeResponseId" TEXT;

-- CreateTable
CREATE TABLE "PendingFreeResponse" (
    "id" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "paralyzedId" TEXT NOT NULL,

    CONSTRAINT "PendingFreeResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingQueue_pendingFreeResponseId_key" ON "PendingQueue"("pendingFreeResponseId");

-- AddForeignKey
ALTER TABLE "PendingQueue" ADD CONSTRAINT "PendingQueue_pendingFreeResponseId_fkey" FOREIGN KEY ("pendingFreeResponseId") REFERENCES "PendingFreeResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
