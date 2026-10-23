-- Product #911: Section 2.4 and a 30-day re-acceptance campaign.
-- Source: wildcat-finance/wildcat-docs, legal/wildcat-terms-of-use.txt (22 October 2026).
-- Publication date: 22 October 2026. Coordinate docs publication with activation;
-- if first publication moves, revise the date, version, text and hashes together
-- BEFORE this migration is applied to any shared environment.
-- Release 2 must serve all traffic and its legacy-table migration must be applied.
-- This is an activation: prompts begin when this transaction commits. The deadline
-- is 30 days from activation, not 30 days from each user's next visit.
BEGIN;

LOCK TABLE "ServiceAgreement" IN SHARE ROW EXCLUSIVE MODE;

DO $tou_bump$
DECLARE
  previous "ServiceAgreement"%ROWTYPE;
  new_plaintext text;
  new_html text;
  activation_time timestamp := clock_timestamp() AT TIME ZONE 'UTC';
  clause text := $tou_clause$From time to time, in our sole discretion, we may require affirmative re-acceptance of the updated Terms (such as by wallet signature through the Products) from borrowers and from lenders before they may continue to access the relevant functions through the Products. If a borrower does not provide re-acceptance when required, the Company may suspend or restrict that borrower’s access to borrower functions through the Products and may revoke that borrower’s eligibility to deploy new Markets through the Products (Section 4.1) and exercise its rights under Section 17 until re-acceptance is provided. If a lender does not provide re-acceptance when required, the Company may restrict the making of new deposits through the Products; the Company will not, under this Section, restrict the submission of withdrawal requests or the claiming of assets that have become available, and those functions remain exercisable directly on-chain, independently of the Products. For all other users, continued use of the Products after posting of the updated Terms constitutes acceptance in accordance with Sections 2.1 and 2.2.$tou_clause$;
BEGIN
  IF to_regclass('"LenderServiceAgreementSignature"') IS NOT NULL
    OR to_regclass('"BorrowerServiceAgreementSignature"') IS NOT NULL THEN
    RAISE EXCEPTION 'Apply the Release 2 legacy-signature retirement before activating ToU Version 3';
  END IF;

  SELECT * INTO previous FROM "ServiceAgreement" WHERE "isCurrent";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expected current ToU Version 2 before activating Version 3';
  END IF;
  IF previous."version" <> 'terms-of-use-v2-2025-02-12'
    OR previous."plaintextSha256" <> '711a9e6707e6cf85166786461a0a45aa3b926b22b414abe8dfcc6c1afef020d1'
    OR encode(sha256(convert_to(previous."plaintext", 'UTF8')), 'hex') <> '711a9e6707e6cf85166786461a0a45aa3b926b22b414abe8dfcc6c1afef020d1'
    OR encode(sha256(convert_to(previous."html", 'UTF8')), 'hex') <> 'd06fba6b740c79e01dd53fd04fd6d505029c1cc238fa0ebbc3496bc17f0b61e2' THEN
    RAISE EXCEPTION 'Current ToU differs from the reviewed Version 2 artifact; refusing to replace it';
  END IF;

  -- Keep every existing section byte-for-byte; add only the approved clause
  -- directly before Section 3 and replace the old Updated and effective line.
  new_plaintext := replace(
    previous."plaintext",
    E'\n# 3 Disclaimers and Acknowledgments',
    E'\n## 2.4 Required Re-Acceptance\n' || clause || E'\n\n# 3 Disclaimers and Acknowledgments'
  );
  new_plaintext := replace(new_plaintext,
    'Updated and effective: 17 January 2025',
    'Updated and effective: 22 October 2026');
  new_html := replace(
    previous."html",
    '<p># 3 Disclaimers and Acknowledgments</p>',
    E'<p>## 2.4 Required Re-Acceptance<br />\n' || clause || E'</p>\n<p># 3 Disclaimers and Acknowledgments</p>'
  );
  new_html := replace(new_html,
    'Updated and effective: 17 January 2025',
    'Updated and effective: 22 October 2026');

  IF encode(sha256(convert_to(new_plaintext, 'UTF8')), 'hex') <> '007e86459dfcab2734e4a2d573d3832f109cf9258f0dec212eaeb79b3c55c067'
    OR encode(sha256(convert_to(new_html, 'UTF8')), 'hex') <> 'fbfad6dfd8a6255f5c54682829ffff94521f5eab3630c600922c6035af8e734f' THEN
    RAISE EXCEPTION 'ToU Version 3 text does not match the reviewed publication artifacts';
  END IF;
  IF EXISTS (SELECT 1 FROM "ServiceAgreement" WHERE "version" = 'terms-of-use-v3-2026-10-22') THEN
    RAISE EXCEPTION 'ToU Version 3 already exists; refusing to overwrite history or restart its deadline';
  END IF;

  UPDATE "ServiceAgreement" SET "isCurrent" = false WHERE id = previous.id;
  INSERT INTO "ServiceAgreement" (
    "version", "plaintext", "html", "plaintextSha256", "legacyWrapperHash",
    "acknowledgementText", "effectiveDate", "isCurrent", "reacceptanceDeadline"
  ) VALUES (
    'terms-of-use-v3-2026-10-22', new_plaintext, new_html,
    '007e86459dfcab2734e4a2d573d3832f109cf9258f0dec212eaeb79b3c55c067', NULL,
    E'I agree to the Wildcat Terms of Use located at https://docs.wildcat.finance/legal/wildcat-terms-of-use, last updated on 22 October, 2026.\n\nHash of agreement text: 007e86459dfcab2734e4a2d573d3832f109cf9258f0dec212eaeb79b3c55c067',
    TIMESTAMP '2026-10-22 00:00:00', true, activation_time + INTERVAL '30 days'
  );
  -- Old terms, acceptances and refusals are not rewritten. Existing signatures
  -- continue to refer to exactly the version the user accepted.
END $tou_bump$;

COMMIT;
