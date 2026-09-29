ALTER TABLE "Token"
  ADD COLUMN "transformationDurationMode" TEXT NOT NULL DEFAULT 'persistent',
  ADD COLUMN "transformationDurationRounds" INTEGER;

ALTER TABLE "TokenInstance"
  ADD COLUMN "transformationDurationMode" TEXT NOT NULL DEFAULT 'persistent',
  ADD COLUMN "transformationDurationRounds" INTEGER;
