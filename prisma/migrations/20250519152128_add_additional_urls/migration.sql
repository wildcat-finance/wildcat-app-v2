-- AlterTable
ALTER TABLE "Borrower" ADD COLUMN     "additionalUrls" JSONB;

-- AlterTable
ALTER TABLE "BorrowerProfileUpdateRequest" ADD COLUMN     "additionalUrls" JSONB;
