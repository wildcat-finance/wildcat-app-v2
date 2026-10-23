-- Release 2 application code must already be serving all traffic, with all
-- Release 1 instances retired, including production if it shares the database.
BEGIN;

LOCK TABLE "LenderServiceAgreementSignature", "BorrowerServiceAgreementSignature"
IN ACCESS EXCLUSIVE MODE;

-- Refuse to discard any legacy acceptance missing its versioned record. Existing
-- versioned records may contain newer evidence, so compare identity/version.
DO $$
BEGIN
  IF EXISTS (
    WITH legacy AS (
      SELECT
        "chainId", lower("signer") AS "address",
        'Lender'::"ServiceAgreementParty" AS "party", "serviceAgreementHash"
      FROM "LenderServiceAgreementSignature"
      UNION ALL
      SELECT
        "chainId", lower("address"),
        'Borrower'::"ServiceAgreementParty", "serviceAgreementHash"
      FROM "BorrowerServiceAgreementSignature"
    )
    SELECT 1
    FROM legacy
    LEFT JOIN "ServiceAgreement" agreement
      ON agreement."legacyWrapperHash" = legacy."serviceAgreementHash"
    LEFT JOIN "ServiceAgreementSignature" acceptance
      ON acceptance."chainId" = legacy."chainId"
      AND acceptance."address" = legacy."address"
      AND acceptance."party" = legacy."party"
      AND acceptance."serviceAgreementId" = agreement.id
    WHERE acceptance.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Legacy ToU acceptances lack versioned records; investigate and resolve mismatches before dropping legacy tables';
  END IF;
END $$;

DROP TABLE "LenderServiceAgreementSignature";
DROP TABLE "BorrowerServiceAgreementSignature";

COMMIT;
