-- DropIndex
DROP INDEX "public"."session_sessionToken_key";

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "sessionToken" DROP NOT NULL;
