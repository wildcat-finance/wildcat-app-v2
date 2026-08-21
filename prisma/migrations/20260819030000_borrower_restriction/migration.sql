-- Persisted removal flag and manual admin override for borrowers removed
-- from the archcontroller (product#789). Additive and reversible: all new
-- columns are defaulted or nullable.

ALTER TABLE "Borrower" ADD COLUMN "removedFromArchController" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Borrower" ADD COLUMN "removedAt" TIMESTAMP(3);
ALTER TABLE "Borrower" ADD COLUMN "restrictionOverride" TEXT;
ALTER TABLE "Borrower" ADD COLUMN "restrictionOverrideBy" TEXT;
ALTER TABLE "Borrower" ADD COLUMN "restrictionOverrideAt" TIMESTAMP(3);
