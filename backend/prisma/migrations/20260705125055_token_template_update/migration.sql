/*
  Warnings:

  - Added the required column `updatedAt` to the `TokenTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `TokenTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TokenTemplate" ADD COLUMN     "class" "TokenClass" NOT NULL DEFAULT 'Guerreiro',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "imageUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "type" "TokenType" NOT NULL DEFAULT 'player',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "TokenTemplate_userId_idx" ON "TokenTemplate"("userId");

-- CreateIndex
CREATE INDEX "TokenTemplate_name_idx" ON "TokenTemplate"("name");

-- AddForeignKey
ALTER TABLE "TokenTemplate" ADD CONSTRAINT "TokenTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
