/*
  Chain-scopes admin accounts and MLA templates.

  AdminAccount backfill intentionally removes old test-artifact global admin rows
  and replaces them with the reviewed chain-scoped admin manifest.

  MlaTemplate backfill keeps:
  - template 1 as Sepolia-only old hidden template;
  - template 2 as Ethereum mainnet default template;
  - cloned template 2 rows for Plasma mainnet, Plasma testnet, and Sepolia.
*/

-- DropForeignKey
ALTER TABLE "MasterLoanAgreement"
DROP CONSTRAINT "MasterLoanAgreement_templateId_fkey";

-- Add nullable columns first so existing rows can be backfilled.
ALTER TABLE "AdminAccount"
ADD COLUMN "chainId" INTEGER;

ALTER TABLE "MlaTemplate"
ADD COLUMN "chainId" INTEGER;

-- Replace global admin rows with reviewed chain-scoped rows.
DELETE FROM "AdminAccount";

INSERT INTO "AdminAccount" ("chainId", "address") VALUES
  (1, '0x240334405021f4242d57a3785df39edc23e1b607'),
  (1, '0x0326bfaf89c759251916fa1c1c97f2f3378047c6'),
  (11155111, '0xa26845d12314c581f18d1ba36fd3b8feb7b3a1c4'),
  (11155111, '0xca732651410e915090d7a7d889a1e44ef4575fce'),
  (9745, '0x240334405021f4242d57a3785df39edc23e1b607'),
  (9745, '0x0326bfaf89c759251916fa1c1c97f2f3378047c6'),
  (9746, '0xa26845d12314c581f18d1ba36fd3b8feb7b3a1c4'),
  (9746, '0xca732651410e915090d7a7d889a1e44ef4575fce');

-- Existing template 1 is old hidden Sepolia template.
UPDATE "MlaTemplate"
SET "chainId" = 11155111
WHERE id = 1;

-- Existing template 2 remains the Ethereum mainnet default template.
UPDATE "MlaTemplate"
SET "chainId" = 1
WHERE id = 2;

-- Clone template 2 for Plasma mainnet and point Plasma mainnet agreements at it.
WITH cloned_template AS (
  INSERT INTO "MlaTemplate" (
    "chainId",
    "name",
    "description",
    "hide",
    "isDefault",
    "html",
    "plaintext",
    "borrowerFields",
    "lenderFields"
  )
  SELECT
    9745,
    "name",
    "description",
    "hide",
    "isDefault",
    "html",
    "plaintext",
    "borrowerFields",
    "lenderFields"
  FROM "MlaTemplate"
  WHERE id = 2
  RETURNING id
)
UPDATE "MasterLoanAgreement"
SET "templateId" = (SELECT id FROM cloned_template)
WHERE "chainId" = 9745
  AND "templateId" = 2;

-- Clone template 2 for Plasma testnet and point Plasma testnet agreements at it.
WITH cloned_template AS (
  INSERT INTO "MlaTemplate" (
    "chainId",
    "name",
    "description",
    "hide",
    "isDefault",
    "html",
    "plaintext",
    "borrowerFields",
    "lenderFields"
  )
  SELECT
    9746,
    "name",
    "description",
    "hide",
    "isDefault",
    "html",
    "plaintext",
    "borrowerFields",
    "lenderFields"
  FROM "MlaTemplate"
  WHERE id = 2
  RETURNING id
)
UPDATE "MasterLoanAgreement"
SET "templateId" = (SELECT id FROM cloned_template)
WHERE "chainId" = 9746
  AND "templateId" = 2;

-- Clone template 2 for Sepolia and point Sepolia template-2 agreements at it.
-- Template 1 Sepolia agreements stay on template 1.
WITH cloned_template AS (
  INSERT INTO "MlaTemplate" (
    "chainId",
    "name",
    "description",
    "hide",
    "isDefault",
    "html",
    "plaintext",
    "borrowerFields",
    "lenderFields"
  )
  SELECT
    11155111,
    "name",
    "description",
    "hide",
    "isDefault",
    "html",
    "plaintext",
    "borrowerFields",
    "lenderFields"
  FROM "MlaTemplate"
  WHERE id = 2
  RETURNING id
)
UPDATE "MasterLoanAgreement"
SET "templateId" = (SELECT id FROM cloned_template)
WHERE "chainId" = 11155111
  AND "templateId" = 2;

-- Fail loudly if any row was missed before making columns required.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AdminAccount" WHERE "chainId" IS NULL) THEN
    RAISE EXCEPTION 'AdminAccount chainId backfill incomplete';
  END IF;

  IF EXISTS (SELECT 1 FROM "MlaTemplate" WHERE "chainId" IS NULL) THEN
    RAISE EXCEPTION 'MlaTemplate chainId backfill incomplete';
  END IF;
END $$;

-- Now enforce required columns.
ALTER TABLE "AdminAccount"
ALTER COLUMN "chainId" SET NOT NULL;

ALTER TABLE "MlaTemplate"
ALTER COLUMN "chainId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_chainId_address_key"
ON "AdminAccount"("chainId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "MlaTemplate_chainId_id_key"
ON "MlaTemplate"("chainId", "id");

-- Enforce one default template per chain.
CREATE UNIQUE INDEX "MlaTemplate_one_default_per_chain"
ON "MlaTemplate"("chainId")
WHERE "isDefault" = true;

-- AddForeignKey
ALTER TABLE "MasterLoanAgreement"
ADD CONSTRAINT "MasterLoanAgreement_chainId_templateId_fkey"
FOREIGN KEY ("chainId", "templateId")
REFERENCES "MlaTemplate"("chainId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
