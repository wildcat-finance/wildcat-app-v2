BEGIN;

-- DropForeignKey
ALTER TABLE "LenderKycSignature" DROP CONSTRAINT "LenderKycSignature_startId_fkey";

-- DropIndex
DROP INDEX "LenderKycSignature_startId_idx";

-- AlterTable
ALTER TABLE "LenderKycSignature" DROP COLUMN "startId";

-- DropTable
DROP TABLE "LenderKycStart";

-- DropEnum
DROP TYPE "LenderKycStartSource";

-- DropEnum
DROP TYPE "LenderKycNotSignedReason";

-- AlterEnum
CREATE TYPE "LenderKycOutcome_new" AS ENUM ('submitted', 'updated', 'unchanged', 'skipped');
ALTER TABLE "LenderKycSignature" ALTER COLUMN "outcome" TYPE "LenderKycOutcome_new" USING ("outcome"::text::"LenderKycOutcome_new");
ALTER TYPE "LenderKycOutcome" RENAME TO "LenderKycOutcome_old";
ALTER TYPE "LenderKycOutcome_new" RENAME TO "LenderKycOutcome";
DROP TYPE "LenderKycOutcome_old";

COMMIT;
