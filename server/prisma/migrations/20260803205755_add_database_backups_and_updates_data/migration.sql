-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('web', 'linux', 'android', 'windows');

-- CreateTable
CREATE TABLE "database_backups" (
    "id" UUID NOT NULL,
    "relativeFilePath" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "updates_data" (
    "id" UUID NOT NULL,
    "type" "UpdateType" NOT NULL,
    "version" TEXT NOT NULL,
    "relativeFilePath" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "updates_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "database_backups_relativeFilePath_key" ON "database_backups"("relativeFilePath");

-- CreateIndex
CREATE UNIQUE INDEX "updates_data_version_key" ON "updates_data"("version");
