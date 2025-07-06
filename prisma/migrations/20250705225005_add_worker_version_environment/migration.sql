-- CreateEnum
CREATE TYPE "WorkerEnvironment" AS ENUM ('DEVELOPMENT', 'STAGING', 'TESTING', 'PRODUCTION');

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "environment" "WorkerEnvironment" NOT NULL DEFAULT 'DEVELOPMENT',
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0.0';
