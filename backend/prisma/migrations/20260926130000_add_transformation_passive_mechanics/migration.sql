ALTER TABLE "Token"
ADD COLUMN "additionalPassiveMechanics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "TokenInstance"
ADD COLUMN "additionalPassiveMechanics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Token"
SET "additionalPassiveMechanics" = "passiveMechanics"
WHERE "isTransformation" = true;

UPDATE "TokenInstance"
SET "additionalPassiveMechanics" = "passiveMechanics"
WHERE "isTransformation" = true;
