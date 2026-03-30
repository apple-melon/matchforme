-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "collectedFieldsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Tournament" ADD COLUMN "splitClassCount" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Tournament" ADD COLUMN "seedBy" TEXT NOT NULL DEFAULT 'random';

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "weightKg" DOUBLE PRECISION;
ALTER TABLE "Participant" ADD COLUMN "heightCm" DOUBLE PRECISION;
ALTER TABLE "Participant" ADD COLUMN "age" INTEGER;
