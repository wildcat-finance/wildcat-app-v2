-- Sanitization applied to the dev DB copy before it becomes the harness snapshot.
-- Deterministic placeholders; keeps rows so borrower/lender flows still work.
-- Column names verified against prisma/schema.prisma (Borrower, BorrowerInvitation,
-- BorrowerProfileUpdateRequest, MarketDescription).
update "Borrower" set
  email = case when email is null then null else 'borrower-' || left(md5(address),8) || '@example.invalid' end,
  name = coalesce(name, 'Borrower'),
  description = case when description is null then null else 'Sanitized description' end,
  "physicalAddress" = null, telegram = null, linkedin = null, twitter = null;
update "BorrowerInvitation" set
  name = 'Invited ' || left(md5(address),8), alias = null, description = null, "physicalAddress" = null;
update "BorrowerProfileUpdateRequest" set
  email = null, description = null, "physicalAddress" = null, telegram = null, linkedin = null, twitter = null;
update "MarketDescription" set description = 'Sanitized market description';
-- API tokens / one-time secrets are not needed by the smoke; keep the signature tables (ToU/MLA
-- acceptances) because the smoke relies on existing lenders having accepted.
