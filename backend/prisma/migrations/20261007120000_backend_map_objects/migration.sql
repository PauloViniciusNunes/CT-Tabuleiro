-- Separate MapObject ownership from a door's optional destination.
ALTER TABLE "MapObject" DROP CONSTRAINT IF EXISTS "MapObject_linkedMapId_fkey";

ALTER TABLE "MapObject" ADD COLUMN "mapId" TEXT;
UPDATE "MapObject" SET "mapId" = "linkedMapId" WHERE "mapId" IS NULL;
ALTER TABLE "MapObject" ALTER COLUMN "mapId" SET NOT NULL;

-- Existing linkedMapId values are preserved. For legacy records they keep the
-- old owner value until the object is explicitly edited through the new CRUD.
ALTER TABLE "MapObject" ALTER COLUMN "linkedMapId" DROP NOT NULL;
ALTER TABLE "MapObject" ALTER COLUMN "itemRelativeId" DROP NOT NULL;

ALTER TABLE "MapObject"
ADD CONSTRAINT "MapObject_mapId_fkey"
FOREIGN KEY ("mapId") REFERENCES "Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MapObject"
ADD CONSTRAINT "MapObject_linkedMapId_fkey"
FOREIGN KEY ("linkedMapId") REFERENCES "Map"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MapObject_mapId_idx" ON "MapObject"("mapId");
CREATE INDEX "MapObject_linkedMapId_idx" ON "MapObject"("linkedMapId");
CREATE INDEX "MapObject_itemRelativeId_idx" ON "MapObject"("itemRelativeId");
