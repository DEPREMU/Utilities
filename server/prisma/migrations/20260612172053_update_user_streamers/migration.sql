/*
  Warnings:

  - You are about to drop the column `userId` on the `streamer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `streamer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "streamer" DROP CONSTRAINT "streamer_userId_fkey";

-- AlterTable
ALTER TABLE "streamer" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "user_streamers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "streamerId" UUID NOT NULL,

    CONSTRAINT "user_streamers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_streamers_userId_streamerId_key" ON "user_streamers"("userId", "streamerId");

-- CreateIndex
CREATE UNIQUE INDEX "streamer_name_key" ON "streamer"("name");

-- AddForeignKey
ALTER TABLE "user_streamers" ADD CONSTRAINT "user_streamers_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "streamer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streamers" ADD CONSTRAINT "user_streamers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
