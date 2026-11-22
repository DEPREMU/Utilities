/*
  Warnings:

  - You are about to drop the column `valueMs` on the `notification_crypto` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CryptoInterval" AS ENUM ('m1', 'm5', 'm10', 'm30', 'm60');

-- AlterTable
ALTER TABLE "notification_crypto" DROP COLUMN "valueMs",
ADD COLUMN     "time" "CryptoInterval" NOT NULL DEFAULT 'm30';
