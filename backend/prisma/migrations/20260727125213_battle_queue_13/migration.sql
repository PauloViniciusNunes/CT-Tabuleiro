-- AlterTable
ALTER TABLE "BattleState" ADD COLUMN     "cardsNotRechargeds" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "lastTurnActed" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "maxSelectablePivots" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timeToRechargeCard" JSONB NOT NULL DEFAULT '{}';
