-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('Vivo', 'Morto');

-- CreateEnum
CREATE TYPE "TokenTeam" AS ENUM ('Red', 'Blue', 'Green', 'Yellow');

-- CreateEnum
CREATE TYPE "TokenClass" AS ENUM ('Guerreiro', 'Mago', 'Barbaro', 'Ladino', 'Feiticeiro');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('player', 'ia', 'boss');

-- CreateEnum
CREATE TYPE "ParalysisState" AS ENUM ('none', 'partial', 'full');

-- CreateEnum
CREATE TYPE "TokenPrimaryElement" AS ENUM ('none', 'fire', 'water', 'earth', 'air', 'light', 'dark');

-- CreateEnum
CREATE TYPE "TokenPrimaryDisvantage" AS ENUM ('none', 'fire', 'water', 'earth', 'air', 'light', 'dark');

-- CreateTable
CREATE TABLE "TokenTemplate" (
    "id" TEXT NOT NULL,

    CONSTRAINT "TokenTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
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
    "mapId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenInstance_templateId_idx" ON "TokenInstance"("templateId");

-- CreateIndex
CREATE INDEX "TokenInstance_mapId_idx" ON "TokenInstance"("mapId");

-- CreateIndex
CREATE INDEX "TokenInstance_userId_idx" ON "TokenInstance"("userId");

-- AddForeignKey
ALTER TABLE "TokenInstance" ADD CONSTRAINT "TokenInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TokenTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenInstance" ADD CONSTRAINT "TokenInstance_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenInstance" ADD CONSTRAINT "TokenInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
