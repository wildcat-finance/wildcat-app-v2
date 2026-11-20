/*
  Borrower organisations, per-network registrations, and one MLA decision per
  market (docs/database-normalization-spec.md, changes C1 to C5 and C7).

  - "Borrower" becomes one organisation per network class (mainnet or testnet).
    Its address, cached on-chain approval and invitation on each network move
    to "BorrowerRegistration". The Terms of Use is still signed per network;
    borrower ToU rows gain a link to their registration.
  - "MasterLoanAgreement", "RefusalToAssignMla" and the borrower's row in
    "MlaSignature" become one "MarketMlaDecision" per market. Lender rows move
    to "MlaLenderSignature"; "NonMlaAcknowledgement" points at the decision.
  - MLA templates belong to a network class. Identical copies made per
    network are hidden behind the lowest id but keep their own ids, so
    agreements and saved create-market drafts that name them still resolve.
    A template that only a network the application does not serve had stays
    hidden, as it was never offered on the others.

  There is no compatibility layer. Every application instance that reads these
  tables, on every branch and environment sharing this database, must run code
  from the same commit as this migration.

  Rollback path: the replaced tables are kept, renamed with a "legacy_"
  prefix, and the tables reshaped in place ("MlaTemplate",
  "BorrowerProfileUpdateRequest", "NonMlaAcknowledgement") are first copied to
  "legacy_" tables with every row and column. A later migration drops them
  once the new shape is confirmed.
*/

BEGIN;

LOCK TABLE
  "Borrower",
  "BorrowerInvitation",
  "BorrowerProfileUpdateRequest",
  "MasterLoanAgreement",
  "MlaSignature",
  "RefusalToAssignMla",
  "NonMlaAcknowledgement",
  "MlaTemplate",
  "ServiceAgreement",
  "ServiceAgreementSignature",
  "ServiceAgreementRefusal",
  "AdminAccount",
  "MarketDescription"
IN ACCESS EXCLUSIVE MODE;

-- ---------------------------------------------------------------------------
-- Organisation manifest (reviewed input).
--
-- By default, the rows of one address on the networks of one class become one
-- organisation, and every other address is an organisation of its own. Equal
-- names are never merged automatically.
--
-- To merge different addresses into one organisation, or to split a default
-- group, list every affected (chainId, address) with a shared label. A listed
-- row joins its label's group; an unlisted row keeps the default grouping.
-- A label must not span mainnet and testnet.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE "borrower_manifest" (
  "chainId" INTEGER NOT NULL,
  "address" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  PRIMARY KEY ("chainId", "address")
) ON COMMIT DROP;

-- INSERT INTO "borrower_manifest" ("chainId", "address", "label") VALUES
--   (1, '0x0000000000000000000000000000000000000001', 'example-organisation'),
--   (1, '0x0000000000000000000000000000000000000002', 'example-organisation');

-- ---------------------------------------------------------------------------
-- Networks
-- ---------------------------------------------------------------------------
CREATE TABLE "Network" (
    "chainId" INTEGER NOT NULL,
    "isTestnet" BOOLEAN NOT NULL,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("chainId")
);
CREATE UNIQUE INDEX "Network_chainId_isTestnet_key" ON "Network"("chainId", "isTestnet");

INSERT INTO "Network" ("chainId", "isTestnet") VALUES
  (1, false),
  (9745, false),
  (11155111, true),
  (9746, true),
  -- Ink Sepolia: not configured in the application, but rows exist for it.
  (763373, true);

-- ---------------------------------------------------------------------------
-- Guards on the source data
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT "chainId" FROM "Borrower"
    UNION SELECT "chainId" FROM "BorrowerProfileUpdateRequest"
    UNION SELECT "chainId" FROM "AdminAccount"
    UNION SELECT "chainId" FROM "MlaTemplate"
    UNION SELECT "chainId" FROM "MasterLoanAgreement"
    UNION SELECT "chainId" FROM "RefusalToAssignMla"
    UNION SELECT "chainId" FROM "NonMlaAcknowledgement"
    UNION SELECT "chainId" FROM "MarketDescription"
    UNION SELECT "chainId" FROM "ServiceAgreementSignature"
    UNION SELECT "chainId" FROM "ServiceAgreementRefusal"
    EXCEPT SELECT "chainId" FROM "Network"
  ) THEN
    RAISE EXCEPTION 'Rows exist for a chainId with no "Network" row; add the network to the seed above or remove the rows';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "borrower_manifest" m
    LEFT JOIN "Borrower" b ON b."chainId" = m."chainId" AND b."address" = m."address"
    WHERE b."address" IS NULL
  ) THEN
    RAISE EXCEPTION 'The organisation manifest lists a (chainId, address) with no "Borrower" row';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "borrower_manifest" m
    JOIN "Network" n ON n."chainId" = m."chainId"
    GROUP BY m."label" HAVING count(DISTINCT n."isTestnet") > 1
  ) THEN
    RAISE EXCEPTION 'An organisation manifest label spans mainnet and testnet';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MasterLoanAgreement" m
    JOIN "RefusalToAssignMla" r ON r."chainId" = m."chainId" AND r."market" = m."market"
  ) THEN
    RAISE EXCEPTION 'A market has both an MLA and a refusal; resolve it by hand first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MasterLoanAgreement" m
    LEFT JOIN "MlaSignature" s
      ON s."chainId" = m."chainId" AND s."market" = m."market" AND s."address" = m."borrower"
    GROUP BY m."chainId", m."market" HAVING count(s."signer") <> 1
  ) THEN
    RAISE EXCEPTION 'An MLA does not have exactly one borrower signature; resolve it by hand first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MlaSignature" s
    JOIN "MasterLoanAgreement" m ON m."chainId" = s."chainId" AND m."market" = s."market"
    WHERE s."address" <> m."borrower"
    GROUP BY s."chainId", s."market", s."address" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A lender holds two MLA signatures for one market; choose the row to keep first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "ServiceAgreementSignature" s
    LEFT JOIN "Borrower" b ON b."chainId" = s."chainId" AND b."address" = s."address"
    WHERE s."party" = 'Borrower' AND b."address" IS NULL
    UNION ALL
    SELECT 1 FROM "ServiceAgreementRefusal" s
    LEFT JOIN "Borrower" b ON b."chainId" = s."chainId" AND b."address" = s."address"
    WHERE s."party" = 'Borrower' AND b."address" IS NULL
  ) THEN
    RAISE EXCEPTION 'A borrower ToU row has no "Borrower" row on its network; create or remove it first';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Keep the old rows: copy the tables reshaped in place, rename the replaced ones
-- ---------------------------------------------------------------------------
CREATE TABLE "legacy_MlaTemplate" AS TABLE "MlaTemplate";
CREATE TABLE "legacy_BorrowerProfileUpdateRequest" AS TABLE "BorrowerProfileUpdateRequest";
CREATE TABLE "legacy_NonMlaAcknowledgement" AS TABLE "NonMlaAcknowledgement";

-- Foreign keys between the replaced tables move with them. These three point
-- from or to a table that is reshaped in place, so they go.
ALTER TABLE "BorrowerProfileUpdateRequest" DROP CONSTRAINT "BorrowerProfileUpdateRequest_chainId_address_fkey";
ALTER TABLE "MasterLoanAgreement" DROP CONSTRAINT "MasterLoanAgreement_chainId_templateId_fkey";
ALTER TABLE "NonMlaAcknowledgement" DROP CONSTRAINT "NonMlaAcknowledgement_chainId_market_fkey";

ALTER TABLE "Borrower" RENAME TO "legacy_Borrower";
ALTER TABLE "BorrowerInvitation" RENAME TO "legacy_BorrowerInvitation";
ALTER TABLE "MasterLoanAgreement" RENAME TO "legacy_MasterLoanAgreement";
ALTER TABLE "MlaSignature" RENAME TO "legacy_MlaSignature";
ALTER TABLE "RefusalToAssignMla" RENAME TO "legacy_RefusalToAssignMla";

-- ---------------------------------------------------------------------------
-- Organisations
-- ---------------------------------------------------------------------------
CREATE TABLE "Borrower" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "isTestnet" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "avatar" TEXT,
    "description" TEXT,
    "founded" TEXT,
    "headquarters" TEXT,
    "website" TEXT,
    "twitter" TEXT,
    "telegram" TEXT,
    "linkedin" TEXT,
    "email" TEXT,
    "jurisdiction" TEXT,
    "physicalAddress" TEXT,
    "entityKind" TEXT,
    "additionalUrls" JSONB,

    CONSTRAINT "Borrower_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Borrower_id_isTestnet_key" ON "Borrower"("id", "isTestnet");

CREATE TEMP TABLE "borrower_group" ON COMMIT DROP AS
SELECT
  b."chainId",
  b."address",
  n."isTestnet",
  coalesce('manifest:' || m."label", 'address:' || b."address") AS "groupKey"
FROM "legacy_Borrower" b
JOIN "Network" n ON n."chainId" = b."chainId"
LEFT JOIN "borrower_manifest" m ON m."chainId" = b."chainId" AND m."address" = b."address";

CREATE TEMP TABLE "borrower_org" ON COMMIT DROP AS
SELECT gen_random_uuid() AS "id", g."isTestnet", g."groupKey"
FROM (SELECT DISTINCT "isTestnet", "groupKey" FROM "borrower_group") g;

-- Profile precedence within an organisation: registered rows first, then the
-- most recently accepted profile update, then the lowest chainId.
CREATE TEMP TABLE "borrower_source" ON COMMIT DROP AS
SELECT
  o."id" AS "borrowerId",
  o."isTestnet",
  b."chainId",
  b."address",
  b."name",
  b."alias",
  b."avatar",
  b."description",
  b."founded",
  b."headquarters",
  b."website",
  b."twitter",
  b."telegram",
  b."linkedin",
  b."email",
  b."jurisdiction",
  b."physicalAddress",
  b."entityKind",
  b."additionalUrls",
  b."registeredOnChain",
  b."registeredBy",
  row_number() OVER (
    PARTITION BY o."id"
    ORDER BY b."registeredOnChain" DESC, u."lastAcceptedAt" DESC NULLS LAST, b."chainId"
  ) AS "rank"
FROM "legacy_Borrower" b
JOIN "borrower_group" g ON g."chainId" = b."chainId" AND g."address" = b."address"
JOIN "borrower_org" o ON o."isTestnet" = g."isTestnet" AND o."groupKey" = g."groupKey"
LEFT JOIN (
  SELECT "chainId", "address", max("acceptedAt") AS "lastAcceptedAt"
  FROM "BorrowerProfileUpdateRequest"
  GROUP BY 1, 2
) u ON u."chainId" = b."chainId" AND u."address" = b."address";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "borrower_source"
    GROUP BY "borrowerId"
    HAVING count(*) FILTER (WHERE "name" IS NOT NULL AND btrim("name") <> '') = 0
  ) THEN
    RAISE EXCEPTION 'An organisation has no non-blank name on any of its rows; supply one first';
  END IF;
END $$;

INSERT INTO "Borrower" (
  "id", "isTestnet", "name", "alias", "avatar", "description", "founded",
  "headquarters", "website", "twitter", "telegram", "linkedin", "email",
  "jurisdiction", "physicalAddress", "entityKind", "additionalUrls"
)
SELECT
  "borrowerId",
  "isTestnet",
  (array_agg("name" ORDER BY "rank") FILTER (WHERE "name" IS NOT NULL AND btrim("name") <> ''))[1],
  (array_agg("alias" ORDER BY "rank") FILTER (WHERE "alias" IS NOT NULL))[1],
  (array_agg("avatar" ORDER BY "rank") FILTER (WHERE "avatar" IS NOT NULL))[1],
  (array_agg("description" ORDER BY "rank") FILTER (WHERE "description" IS NOT NULL))[1],
  (array_agg("founded" ORDER BY "rank") FILTER (WHERE "founded" IS NOT NULL))[1],
  (array_agg("headquarters" ORDER BY "rank") FILTER (WHERE "headquarters" IS NOT NULL))[1],
  (array_agg("website" ORDER BY "rank") FILTER (WHERE "website" IS NOT NULL))[1],
  (array_agg("twitter" ORDER BY "rank") FILTER (WHERE "twitter" IS NOT NULL))[1],
  (array_agg("telegram" ORDER BY "rank") FILTER (WHERE "telegram" IS NOT NULL))[1],
  (array_agg("linkedin" ORDER BY "rank") FILTER (WHERE "linkedin" IS NOT NULL))[1],
  (array_agg("email" ORDER BY "rank") FILTER (WHERE "email" IS NOT NULL))[1],
  (array_agg("jurisdiction" ORDER BY "rank") FILTER (WHERE "jurisdiction" IS NOT NULL))[1],
  (array_agg("physicalAddress" ORDER BY "rank") FILTER (WHERE "physicalAddress" IS NOT NULL))[1],
  (array_agg("entityKind" ORDER BY "rank") FILTER (WHERE "entityKind" IS NOT NULL))[1],
  (array_agg("additionalUrls" ORDER BY "rank") FILTER (WHERE "additionalUrls" IS NOT NULL))[1]
FROM "borrower_source"
GROUP BY "borrowerId", "isTestnet";

-- ---------------------------------------------------------------------------
-- Registrations: one per old "Borrower" row
-- ---------------------------------------------------------------------------
CREATE TABLE "BorrowerRegistration" (
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "borrowerId" UUID NOT NULL,
    "isTestnet" BOOLEAN NOT NULL,
    "registeredOnChain" BOOLEAN NOT NULL DEFAULT false,
    "registeredBy" TEXT,
    "checkedAt" TIMESTAMP(3),
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),

    CONSTRAINT "BorrowerRegistration_pkey" PRIMARY KEY ("chainId","address")
);
CREATE INDEX "BorrowerRegistration_borrowerId_idx" ON "BorrowerRegistration"("borrowerId");
CREATE UNIQUE INDEX "BorrowerRegistration_chainId_address_borrowerId_key" ON "BorrowerRegistration"("chainId", "address", "borrowerId");

INSERT INTO "BorrowerRegistration" (
  "chainId", "address", "borrowerId", "isTestnet", "registeredOnChain",
  "registeredBy", "checkedAt", "invitedBy", "invitedAt"
)
SELECT
  s."chainId",
  s."address",
  s."borrowerId",
  s."isTestnet",
  s."registeredOnChain",
  lower(s."registeredBy"),
  NULL,
  lower(i."inviter"),
  i."timeInvited"
FROM "borrower_source" s
LEFT JOIN "legacy_BorrowerInvitation" i ON i."chainId" = s."chainId" AND i."address" = s."address";

-- ---------------------------------------------------------------------------
-- Profile update requests: re-pointed at the organisation
-- ---------------------------------------------------------------------------
ALTER TABLE "BorrowerProfileUpdateRequest" ADD COLUMN "borrowerId" UUID;

UPDATE "BorrowerProfileUpdateRequest" u
SET "borrowerId" = r."borrowerId"
FROM "BorrowerRegistration" r
WHERE r."chainId" = u."chainId" AND r."address" = u."address";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "BorrowerProfileUpdateRequest" WHERE "borrowerId" IS NULL) THEN
    RAISE EXCEPTION 'A profile update request has no registration to take its organisation from';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "BorrowerProfileUpdateRequest"
    WHERE "acceptedAt" IS NULL AND "rejectedAt" IS NULL
    GROUP BY "borrowerId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'An organisation has more than one pending profile update request; accept or reject the older ones first';
  END IF;
END $$;

DROP INDEX "BorrowerProfileUpdateRequest_chainId_address_idx";
ALTER TABLE "BorrowerProfileUpdateRequest"
  DROP COLUMN "chainId",
  DROP COLUMN "address",
  ALTER COLUMN "borrowerId" SET NOT NULL;
CREATE INDEX "BorrowerProfileUpdateRequest_borrowerId_createdAt_idx" ON "BorrowerProfileUpdateRequest"("borrowerId", "createdAt" DESC);

-- ---------------------------------------------------------------------------
-- Terms of Use rows: borrower rows linked to their registration
-- ---------------------------------------------------------------------------
ALTER TABLE "ServiceAgreementSignature" ADD COLUMN "borrowerId" UUID;
ALTER TABLE "ServiceAgreementRefusal" ADD COLUMN "borrowerId" UUID;

UPDATE "ServiceAgreementSignature" s
SET "borrowerId" = r."borrowerId"
FROM "BorrowerRegistration" r
WHERE s."party" = 'Borrower' AND r."chainId" = s."chainId" AND r."address" = s."address";

UPDATE "ServiceAgreementRefusal" s
SET "borrowerId" = r."borrowerId"
FROM "BorrowerRegistration" r
WHERE s."party" = 'Borrower' AND r."chainId" = s."chainId" AND r."address" = s."address";

-- ---------------------------------------------------------------------------
-- MLA templates: one row per distinct template and network class
-- ---------------------------------------------------------------------------
DROP INDEX "MlaTemplate_one_default_per_chain";
DROP INDEX "MlaTemplate_chainId_id_key";

ALTER TABLE "MlaTemplate" ADD COLUMN "isTestnet" BOOLEAN;
UPDATE "MlaTemplate" t SET "isTestnet" = n."isTestnet" FROM "Network" n WHERE n."chainId" = t."chainId";
UPDATE "MlaTemplate" SET "hide" = coalesce("hide", false), "isDefault" = coalesce("isDefault", false);

-- Identical copies made per network are hidden behind the lowest id.
CREATE TEMP TABLE "template_keep" ON COMMIT DROP AS
SELECT
  t."id",
  min(t."id") OVER w AS "keepId",
  -- The group has a copy on its class's primary network (Ethereum, Sepolia).
  bool_or(t."chainId" IN (1, 11155111)) OVER w AS "onPrimaryNetwork",
  -- The group has a copy on a network the application serves.
  bool_or(t."chainId" IN (1, 9745, 11155111, 9746)) OVER w AS "onServedNetwork"
FROM "MlaTemplate" t
WINDOW w AS (
  PARTITION BY t."isTestnet", t."name", t."description", t."hide", t."isDefault",
    t."html", t."plaintext", t."borrowerFields", t."lenderFields"
);

-- ---------------------------------------------------------------------------
-- One MLA decision per market
-- ---------------------------------------------------------------------------
CREATE TYPE "MlaDecisionOutcome" AS ENUM ('Assigned', 'Declined');

CREATE TABLE "MarketMlaDecision" (
    "chainId" INTEGER NOT NULL,
    "market" TEXT NOT NULL,
    "outcome" "MlaDecisionOutcome" NOT NULL,
    "borrowerId" UUID,
    "borrowerAddress" TEXT NOT NULL,
    "signer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "kind" "SignatureKind" NOT NULL,
    "blockNumber" INTEGER,
    "timeSigned" TIMESTAMP(3) NOT NULL,
    "templateId" INTEGER,
    "html" TEXT,
    "plaintext" TEXT,
    "lenderFields" JSONB,

    CONSTRAINT "MarketMlaDecision_pkey" PRIMARY KEY ("chainId","market")
);
CREATE INDEX "MarketMlaDecision_borrowerId_idx" ON "MarketMlaDecision"("borrowerId");
CREATE UNIQUE INDEX "MarketMlaDecision_chainId_market_outcome_key" ON "MarketMlaDecision"("chainId", "market", "outcome");

INSERT INTO "MarketMlaDecision" (
  "chainId", "market", "outcome", "borrowerId", "borrowerAddress", "signer",
  "signature", "kind", "blockNumber", "timeSigned", "templateId", "html",
  "plaintext", "lenderFields"
)
SELECT
  m."chainId",
  m."market",
  'Assigned',
  r."borrowerId",
  m."borrower",
  lower(s."signer"),
  s."signature",
  s."kind",
  s."blockNumber",
  s."timeSigned",
  m."templateId",
  m."html",
  m."plaintext",
  m."lenderFields"
FROM "legacy_MasterLoanAgreement" m
JOIN "legacy_MlaSignature" s
  ON s."chainId" = m."chainId" AND s."market" = m."market" AND s."address" = m."borrower"
JOIN "BorrowerRegistration" r ON r."chainId" = m."chainId" AND r."address" = m."borrower";

INSERT INTO "MarketMlaDecision" (
  "chainId", "market", "outcome", "borrowerId", "borrowerAddress", "signer",
  "signature", "kind", "blockNumber", "timeSigned"
)
SELECT
  f."chainId",
  f."market",
  'Declined',
  r."borrowerId",
  f."address",
  lower(f."signer"),
  f."signature",
  f."kind",
  f."blockNumber",
  f."timeSigned"
FROM "legacy_RefusalToAssignMla" f
LEFT JOIN "BorrowerRegistration" r ON r."chainId" = f."chainId" AND r."address" = f."address";

CREATE TABLE "MlaLenderSignature" (
    "chainId" INTEGER NOT NULL,
    "market" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "outcome" "MlaDecisionOutcome" NOT NULL DEFAULT 'Assigned',
    "signer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "kind" "SignatureKind" NOT NULL,
    "blockNumber" INTEGER,
    "timeSigned" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlaLenderSignature_pkey" PRIMARY KEY ("chainId","market","address")
);
CREATE INDEX "MlaLenderSignature_chainId_address_idx" ON "MlaLenderSignature"("chainId", "address");

INSERT INTO "MlaLenderSignature" (
  "chainId", "market", "address", "outcome", "signer", "signature", "kind",
  "blockNumber", "timeSigned"
)
SELECT
  s."chainId",
  s."market",
  s."address",
  'Assigned',
  lower(s."signer"),
  s."signature",
  s."kind",
  s."blockNumber",
  s."timeSigned"
FROM "legacy_MlaSignature" s
JOIN "legacy_MasterLoanAgreement" m ON m."chainId" = s."chainId" AND m."market" = s."market"
WHERE s."address" <> m."borrower";

-- One server time per acknowledgement: "timeSigned" always equalled "createdAt".
ALTER TABLE "NonMlaAcknowledgement"
  DROP COLUMN "timeSigned",
  ADD COLUMN "outcome" "MlaDecisionOutcome" NOT NULL DEFAULT 'Declined';

-- Templates: hide the copies (never delete them: agreements and drafts name
-- them by id) and the templates no served network offered, keep one default
-- per class (the one on the primary network when two differ), and settle the
-- column types.
UPDATE "MlaTemplate" t SET "hide" = true, "isDefault" = false
FROM "template_keep" k
WHERE k."id" = t."id" AND (k."keepId" <> t."id" OR NOT k."onServedNetwork");

WITH ranked AS (
  SELECT
    t."id",
    row_number() OVER (PARTITION BY t."isTestnet" ORDER BY k."onPrimaryNetwork" DESC, t."id") AS "rank"
  FROM "MlaTemplate" t
  JOIN "template_keep" k ON k."id" = t."id"
  WHERE t."isDefault"
)
UPDATE "MlaTemplate" t SET "isDefault" = false FROM ranked WHERE ranked."id" = t."id" AND ranked."rank" > 1;

ALTER TABLE "MlaTemplate"
  DROP COLUMN "chainId",
  ALTER COLUMN "isTestnet" SET NOT NULL,
  ALTER COLUMN "hide" SET NOT NULL,
  ALTER COLUMN "isDefault" SET NOT NULL,
  ALTER COLUMN "isDefault" SET DEFAULT false;

-- ---------------------------------------------------------------------------
-- Keys of tables that keep their shape
-- ---------------------------------------------------------------------------
DROP INDEX "MarketDescription_chainId_marketAddress_key";
ALTER TABLE "MarketDescription" ADD CONSTRAINT "MarketDescription_pkey" PRIMARY KEY ("chainId", "marketAddress");

CREATE UNIQUE INDEX "ServiceAgreement_version_key" ON "ServiceAgreement"("version");

DROP TYPE "AccountKind";

-- ---------------------------------------------------------------------------
-- Guards on the result
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF (SELECT count(*) FROM "MlaTemplate") <> (SELECT count(*) FROM "legacy_MlaTemplate") THEN
    RAISE EXCEPTION 'Template count differs from the old "MlaTemplate" row count';
  END IF;
  IF (SELECT count(*) FROM "BorrowerRegistration") <> (SELECT count(*) FROM "legacy_Borrower") THEN
    RAISE EXCEPTION 'Registration count differs from the old "Borrower" row count';
  END IF;
  IF (SELECT count(*) FROM "Borrower") <> (SELECT count(*) FROM "borrower_org") THEN
    RAISE EXCEPTION 'Organisation count differs from the number of organisation groups';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "BorrowerRegistration" r
    JOIN "Borrower" b ON b."id" = r."borrowerId"
    WHERE b."isTestnet" <> r."isTestnet"
  ) THEN
    RAISE EXCEPTION 'A registration belongs to an organisation of the other network class';
  END IF;

  IF EXISTS (SELECT 1 FROM "ServiceAgreementSignature" WHERE ("party" = 'Borrower') <> ("borrowerId" IS NOT NULL))
     OR EXISTS (SELECT 1 FROM "ServiceAgreementRefusal" WHERE ("party" = 'Borrower') <> ("borrowerId" IS NOT NULL)) THEN
    RAISE EXCEPTION 'A ToU row has a borrower link that does not match its party';
  END IF;

  IF (SELECT count(*) FROM "MarketMlaDecision")
     <> (SELECT count(*) FROM "legacy_MasterLoanAgreement") + (SELECT count(*) FROM "legacy_RefusalToAssignMla") THEN
    RAISE EXCEPTION 'MLA decision count differs from agreements plus refusals';
  END IF;
  IF (SELECT count(*) FROM "MlaLenderSignature")
     <> (SELECT count(*) FROM "legacy_MlaSignature") - (SELECT count(*) FROM "legacy_MasterLoanAgreement") THEN
    RAISE EXCEPTION 'Lender MLA signature count differs from signatures minus agreements';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "MarketMlaDecision" d
    JOIN "legacy_MasterLoanAgreement" m ON m."chainId" = d."chainId" AND m."market" = d."market"
    WHERE md5(d."html") <> md5(m."html")
       OR md5(d."plaintext") <> md5(m."plaintext")
       OR d."lenderFields" <> m."lenderFields"
  ) THEN
    RAISE EXCEPTION 'An MLA decision does not reproduce its agreement text';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "NonMlaAcknowledgement" a
    LEFT JOIN "MarketMlaDecision" d
      ON d."chainId" = a."chainId" AND d."market" = a."market" AND d."outcome" = 'Declined'
    WHERE d."market" IS NULL
  ) THEN
    RAISE EXCEPTION 'A non-MLA acknowledgement has no declined decision';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "AdminAccount" ADD CONSTRAINT "AdminAccount_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Network"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BorrowerRegistration" ADD CONSTRAINT "BorrowerRegistration_borrowerId_isTestnet_fkey" FOREIGN KEY ("borrowerId", "isTestnet") REFERENCES "Borrower"("id", "isTestnet") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BorrowerRegistration" ADD CONSTRAINT "BorrowerRegistration_chainId_isTestnet_fkey" FOREIGN KEY ("chainId", "isTestnet") REFERENCES "Network"("chainId", "isTestnet") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BorrowerProfileUpdateRequest" ADD CONSTRAINT "BorrowerProfileUpdateRequest_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceAgreementSignature" ADD CONSTRAINT "ServiceAgreementSignature_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Network"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAgreementSignature" ADD CONSTRAINT "ServiceAgreementSignature_chainId_address_borrowerId_fkey" FOREIGN KEY ("chainId", "address", "borrowerId") REFERENCES "BorrowerRegistration"("chainId", "address", "borrowerId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceAgreementRefusal" ADD CONSTRAINT "ServiceAgreementRefusal_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Network"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAgreementRefusal" ADD CONSTRAINT "ServiceAgreementRefusal_chainId_address_borrowerId_fkey" FOREIGN KEY ("chainId", "address", "borrowerId") REFERENCES "BorrowerRegistration"("chainId", "address", "borrowerId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketMlaDecision" ADD CONSTRAINT "MarketMlaDecision_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Network"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketMlaDecision" ADD CONSTRAINT "MarketMlaDecision_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketMlaDecision" ADD CONSTRAINT "MarketMlaDecision_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MlaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MlaLenderSignature" ADD CONSTRAINT "MlaLenderSignature_chainId_market_outcome_fkey" FOREIGN KEY ("chainId", "market", "outcome") REFERENCES "MarketMlaDecision"("chainId", "market", "outcome") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NonMlaAcknowledgement" ADD CONSTRAINT "NonMlaAcknowledgement_chainId_market_outcome_fkey" FOREIGN KEY ("chainId", "market", "outcome") REFERENCES "MarketMlaDecision"("chainId", "market", "outcome") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketDescription" ADD CONSTRAINT "MarketDescription_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Network"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Rules Prisma cannot declare
-- ---------------------------------------------------------------------------
-- Addresses are stored lowercase. One existing MLA row has a market value
-- that is not an address, so the market checks apply to new rows only.
ALTER TABLE "BorrowerRegistration"
  ADD CONSTRAINT "BorrowerRegistration_address_format" CHECK ("address" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "BorrowerRegistration_registeredBy_format" CHECK ("registeredBy" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "BorrowerRegistration_invitedBy_format" CHECK ("invitedBy" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "BorrowerRegistration_invite_pair" CHECK (("invitedBy" IS NULL) = ("invitedAt" IS NULL));
ALTER TABLE "AdminAccount"
  ADD CONSTRAINT "AdminAccount_address_format" CHECK ("address" ~ '^0x[0-9a-f]{40}$');
ALTER TABLE "MarketDescription"
  ADD CONSTRAINT "MarketDescription_marketAddress_format" CHECK ("marketAddress" ~ '^0x[0-9a-f]{40}$');
ALTER TABLE "ServiceAgreementSignature"
  ADD CONSTRAINT "ServiceAgreementSignature_address_format" CHECK ("address" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "ServiceAgreementSignature_signer_format" CHECK ("signer" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "ServiceAgreementSignature_borrower_iff_party" CHECK (("party" = 'Borrower') = ("borrowerId" IS NOT NULL)),
  ADD CONSTRAINT "ServiceAgreementSignature_block_iff_contract" CHECK ("kind" IS NULL OR ("kind" = 'ECDSA') = ("blockNumber" IS NULL));
ALTER TABLE "ServiceAgreementRefusal"
  ADD CONSTRAINT "ServiceAgreementRefusal_address_format" CHECK ("address" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "ServiceAgreementRefusal_signer_format" CHECK ("signer" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "ServiceAgreementRefusal_borrower_iff_party" CHECK (("party" = 'Borrower') = ("borrowerId" IS NOT NULL)),
  ADD CONSTRAINT "ServiceAgreementRefusal_block_iff_contract" CHECK (("kind" = 'ECDSA') = ("blockNumber" IS NULL));
ALTER TABLE "MarketMlaDecision"
  ADD CONSTRAINT "MarketMlaDecision_borrowerAddress_format" CHECK ("borrowerAddress" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "MarketMlaDecision_signer_format" CHECK ("signer" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "MarketMlaDecision_content_iff_assigned" CHECK (
    CASE WHEN "outcome" = 'Assigned'
      THEN num_nonnulls("templateId", "html", "plaintext", "lenderFields") = 4
           AND "borrowerId" IS NOT NULL
      ELSE num_nulls("templateId", "html", "plaintext", "lenderFields") = 4
    END),
  ADD CONSTRAINT "MarketMlaDecision_block_iff_contract" CHECK (("kind" = 'ECDSA') = ("blockNumber" IS NULL)),
  ADD CONSTRAINT "MarketMlaDecision_signer" CHECK ("signer" = "borrowerAddress" OR "kind" = 'GnosisOwnerECDSA');
ALTER TABLE "MarketMlaDecision"
  ADD CONSTRAINT "MarketMlaDecision_market_format" CHECK ("market" ~ '^0x[0-9a-f]{40}$') NOT VALID;
ALTER TABLE "MlaLenderSignature"
  ADD CONSTRAINT "MlaLenderSignature_address_format" CHECK ("address" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "MlaLenderSignature_signer_format" CHECK ("signer" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "MlaLenderSignature_outcome_assigned" CHECK ("outcome" = 'Assigned'),
  ADD CONSTRAINT "MlaLenderSignature_block_iff_contract" CHECK (("kind" = 'ECDSA') = ("blockNumber" IS NULL));
ALTER TABLE "MlaLenderSignature"
  ADD CONSTRAINT "MlaLenderSignature_market_format" CHECK ("market" ~ '^0x[0-9a-f]{40}$') NOT VALID;
ALTER TABLE "NonMlaAcknowledgement"
  ADD CONSTRAINT "NonMlaAcknowledgement_market_format" CHECK ("market" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "NonMlaAcknowledgement_address_format" CHECK ("address" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "NonMlaAcknowledgement_signer_format" CHECK ("signer" ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT "NonMlaAcknowledgement_outcome_declined" CHECK ("outcome" = 'Declined'),
  ADD CONSTRAINT "NonMlaAcknowledgement_block_iff_contract" CHECK (("kind" = 'ECDSA') = ("blockNumber" IS NULL));
ALTER TABLE "Borrower"
  ADD CONSTRAINT "Borrower_name_not_blank" CHECK (btrim("name") <> ''),
  ADD CONSTRAINT "Borrower_additionalUrls_is_array"
    CHECK ("additionalUrls" IS NULL OR jsonb_typeof("additionalUrls") = 'array');
ALTER TABLE "BorrowerProfileUpdateRequest"
  ADD CONSTRAINT "BorrowerProfileUpdateRequest_one_outcome"
    CHECK (num_nonnulls("acceptedAt", "rejectedAt") <= 1),
  ADD CONSTRAINT "BorrowerProfileUpdateRequest_reason_needs_rejection"
    CHECK ("rejectedReason" IS NULL OR "rejectedAt" IS NOT NULL);
CREATE UNIQUE INDEX "BorrowerProfileUpdateRequest_one_pending"
  ON "BorrowerProfileUpdateRequest" ("borrowerId")
  WHERE "acceptedAt" IS NULL AND "rejectedAt" IS NULL;
CREATE UNIQUE INDEX "MlaTemplate_one_default_per_class"
  ON "MlaTemplate" ("isTestnet") WHERE "isDefault";

COMMIT;
