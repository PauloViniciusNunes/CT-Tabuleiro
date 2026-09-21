ALTER TABLE "Token"
ADD COLUMN "isTransformation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "baseTokenId" TEXT,
ADD COLUMN "inheritBaseCards" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "attributeMultipliers" JSONB NOT NULL DEFAULT '{"forca":1,"destreza":1,"consistencia":1,"inteligencia":1,"sabedoria":1,"carisma":1}',
ADD COLUMN "additionalCards" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "additionalMechanics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "additionalDisadvantages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "TokenInstance"
ADD COLUMN "templateTokenId" TEXT,
ADD COLUMN "isTransformation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "baseTokenId" TEXT,
ADD COLUMN "inheritBaseCards" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "attributeMultipliers" JSONB NOT NULL DEFAULT '{"forca":1,"destreza":1,"consistencia":1,"inteligencia":1,"sabedoria":1,"carisma":1}',
ADD COLUMN "additionalCards" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "additionalMechanics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "additionalDisadvantages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Token_baseTokenId_idx" ON "Token"("baseTokenId");
CREATE INDEX "TokenInstance_templateTokenId_idx" ON "TokenInstance"("templateTokenId");
CREATE INDEX "TokenInstance_baseTokenId_idx" ON "TokenInstance"("baseTokenId");

ALTER TABLE "Token"
ADD CONSTRAINT "Token_baseTokenId_fkey"
FOREIGN KEY ("baseTokenId") REFERENCES "Token"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
