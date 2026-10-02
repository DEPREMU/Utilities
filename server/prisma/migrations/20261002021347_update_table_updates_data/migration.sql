/*
  Warnings:

  - A unique constraint covering the columns `[type,version]` on the table `updates_data` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "updates_data_version_key";

-- CreateIndex
CREATE UNIQUE INDEX "updates_data_type_version_key" ON "updates_data"("type", "version");
