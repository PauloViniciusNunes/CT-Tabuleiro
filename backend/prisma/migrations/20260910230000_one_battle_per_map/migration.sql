-- Preserve the most recently changed battle if historical duplicate rows exist.
-- The older rows and their now-unreferenced queues cannot be resumed safely.
WITH ranked_battles AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "mapId"
            ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
        ) AS position
    FROM "BattleState"
)
DELETE FROM "BattleState" AS battle
USING ranked_battles
WHERE battle."id" = ranked_battles."id"
  AND ranked_battles.position > 1;

DELETE FROM "PendingQueue" AS queue
WHERE NOT EXISTS (
    SELECT 1
    FROM "BattleState" AS battle
    WHERE battle."pendingQueueId" = queue."id"
);

CREATE UNIQUE INDEX "BattleState_mapId_key" ON "BattleState"("mapId");
