/*
  Custom MLAs show when they were registered, and a borrower's custom MLAs
  share one sequence of versions whatever their names, as the admin dialog
  suggests them.

  Templates from before "createdAt" take the time of this migration.
  The new index fails if one borrower already has two custom MLAs with the
  same version under different names; change one of their versions first.
*/

BEGIN;

ALTER TABLE "MlaTemplate"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "MlaTemplate_custom_name_version";
CREATE UNIQUE INDEX "MlaTemplate_custom_version"
  ON "MlaTemplate" ("borrowerId", "version")
  WHERE "borrowerId" IS NOT NULL;

COMMIT;
