ALTER TABLE "Card" ADD COLUMN "casterEffectsToApply" JSONB NOT NULL DEFAULT '[]';
UPDATE "Card" SET "casterEffectsToApply" = "effectToApply" WHERE "effectsAffectCaster" = true;
