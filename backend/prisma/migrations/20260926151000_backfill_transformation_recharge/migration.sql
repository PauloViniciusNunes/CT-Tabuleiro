UPDATE "Token"
SET "transformationRecharge" = 1
WHERE "transformationDurationMode" = 'rounds'
  AND "transformationRecharge" <= 0;

UPDATE "TokenInstance"
SET "transformationRecharge" = 1
WHERE "transformationDurationMode" = 'rounds'
  AND "transformationRecharge" <= 0;
