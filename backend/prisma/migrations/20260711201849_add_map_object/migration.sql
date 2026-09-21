-- CreateEnum
CREATE TYPE "MapObjectType" AS ENUM ('wall', 'chest', 'article', 'door');

-- CreateTable
CREATE TABLE "MapObject" (
    "id" TEXT NOT NULL,
    "type" "MapObjectType" NOT NULL DEFAULT 'wall',
    "row" INTEGER NOT NULL DEFAULT 1,
    "col" INTEGER NOT NULL DEFAULT 1,
    "imgUrl" TEXT NOT NULL,
    "itemRelativeId" TEXT NOT NULL,
    "linkedMapId" TEXT NOT NULL,
    "linkedDoorId" TEXT,

    CONSTRAINT "MapObject_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MapObject" ADD CONSTRAINT "MapObject_itemRelativeId_fkey" FOREIGN KEY ("itemRelativeId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapObject" ADD CONSTRAINT "MapObject_linkedMapId_fkey" FOREIGN KEY ("linkedMapId") REFERENCES "Map"("id") ON DELETE CASCADE ON UPDATE CASCADE;
