-- AlterTable
ALTER TABLE "Borrower" ADD COLUMN     "entityKind" TEXT,
ADD COLUMN     "jurisdiction" TEXT,
ADD COLUMN     "physicalAddress" TEXT;

-- AlterTable
ALTER TABLE "BorrowerProfileUpdateRequest" ADD COLUMN     "entityKind" TEXT,
ADD COLUMN     "jurisdiction" TEXT,
ADD COLUMN     "physicalAddress" TEXT;
