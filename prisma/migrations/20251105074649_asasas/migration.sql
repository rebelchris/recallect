-- AlterTable
ALTER TABLE "session" ALTER COLUMN "expires" DROP NOT NULL,
ALTER COLUMN "expiresAt" DROP NOT NULL;
