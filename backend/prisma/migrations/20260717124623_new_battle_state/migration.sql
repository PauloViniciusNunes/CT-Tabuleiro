-- CreateTable
CREATE TABLE "BattleState" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "currentTurnIndex" INTEGER NOT NULL,
    "currentActorId" TEXT,
    "phase" TEXT NOT NULL,
    "isReallocatingTurns" BOOLEAN NOT NULL,
    "isAIActing" BOOLEAN NOT NULL,
    "turnVersion" INTEGER NOT NULL,
    "locks" JSONB NOT NULL,
    "turnOrder" JSONB NOT NULL,
    "accumulatedActions" JSONB NOT NULL,
    "activeEffects" JSONB NOT NULL,
    "actionHistory" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleState_pkey" PRIMARY KEY ("id")
);
