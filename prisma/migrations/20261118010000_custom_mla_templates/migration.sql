/*
  Custom MLAs (product#938): an MLA template registered for one borrower,
  versioned and retirable. No existing row changes: every current template
  stays a market MLA (borrowerId NULL) and none is retired.
*/

BEGIN;

ALTER TABLE "MlaTemplate"
  ADD COLUMN "borrowerId" UUID,
  ADD COLUMN "retiredAt" TIMESTAMP(3),
  ADD COLUMN "version" TEXT;

CREATE INDEX "MlaTemplate_borrowerId_idx" ON "MlaTemplate"("borrowerId");

ALTER TABLE "MlaTemplate" ADD CONSTRAINT "MlaTemplate_borrowerId_isTestnet_fkey" FOREIGN KEY ("borrowerId", "isTestnet") REFERENCES "Borrower"("id", "isTestnet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A custom MLA always carries a version, is never the class default, and its
-- name and version tell it apart from the borrower's other custom MLAs.
ALTER TABLE "MlaTemplate"
  ADD CONSTRAINT "MlaTemplate_custom_has_version"
    CHECK ("borrowerId" IS NULL OR ("version" IS NOT NULL AND btrim("version") <> '')),
  ADD CONSTRAINT "MlaTemplate_custom_not_default"
    CHECK ("borrowerId" IS NULL OR NOT "isDefault"),
  ADD CONSTRAINT "MlaTemplate_retired_not_default"
    CHECK ("retiredAt" IS NULL OR NOT "isDefault");
CREATE UNIQUE INDEX "MlaTemplate_custom_name_version"
  ON "MlaTemplate" ("borrowerId", "name", "version")
  WHERE "borrowerId" IS NOT NULL;

COMMIT;
