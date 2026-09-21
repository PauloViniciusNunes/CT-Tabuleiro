-- AlterTable
ALTER TABLE "TokenInstance" ADD COLUMN "tokenCards" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TokenInstance" ADD COLUMN "cards" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TokenInstance" ADD COLUMN "inventory" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "TokenInstance" ADD COLUMN "tokenEffects" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TokenInstance" ADD COLUMN "visualOverlays" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "TokenInstance" ADD COLUMN "bossSettings" JSONB;

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "spellType" TEXT,
    "spellCircle" INTEGER,
    "baseDice" JSONB,
    "manaRequired" INTEGER,
    "actionsRequired" INTEGER,
    "duration" INTEGER,
    "recharge" INTEGER NOT NULL DEFAULT 0,
    "remainingDuration" INTEGER NOT NULL DEFAULT 0,
    "itsLoaded" BOOLEAN NOT NULL DEFAULT true,
    "causality" TEXT NOT NULL,
    "causalityType" TEXT NOT NULL,
    "defenseReplicate" TEXT,
    "partialOffensive" BOOLEAN,
    "entityQuantity" INTEGER NOT NULL DEFAULT 0,
    "effectToApply" JSONB NOT NULL DEFAULT '[]',
    "target" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imgUrl" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "ocasionalAdd" INTEGER NOT NULL,
    "atributeToOcasionalAdd" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "craftable" BOOLEAN NOT NULL DEFAULT false,
    "craftableWith" JSONB,
    "isArtifice" BOOLEAN NOT NULL DEFAULT false,
    "artficeSettings" JSONB NOT NULL,
    "habilityCards" JSONB,
    "vfxUrl" JSONB,
    "sfxUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Card_userId_idx" ON "Card"("userId");

-- CreateIndex
CREATE INDEX "Card_name_idx" ON "Card"("name");

-- CreateIndex
CREATE INDEX "Item_userId_idx" ON "Item"("userId");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE INDEX "Item_slot_idx" ON "Item"("slot");

-- CreateIndex
CREATE INDEX "Item_rarity_idx" ON "Item"("rarity");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
