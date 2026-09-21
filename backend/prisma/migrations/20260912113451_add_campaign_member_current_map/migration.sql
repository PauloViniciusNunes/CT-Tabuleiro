-- AlterTable
ALTER TABLE "CampaignMember" ADD COLUMN     "currentMapId" TEXT;

-- CreateIndex
CREATE INDEX "CampaignMember_currentMapId_idx" ON "CampaignMember"("currentMapId");

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_currentMapId_fkey" FOREIGN KEY ("currentMapId") REFERENCES "Map"("id") ON DELETE SET NULL ON UPDATE CASCADE;
