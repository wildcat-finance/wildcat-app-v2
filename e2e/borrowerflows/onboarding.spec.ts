/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { createHash } from "node:crypto"

import { getDeploymentAddress } from "@wildcatfi/wildcat-sdk"
import JSZip from "jszip"
import { parseAbi, parseUnits } from "viem"

import { CHAIN_ID, gotoGatedBorrowerPath } from "./helpers"
import { formatServiceAgreementVersionLabel } from "../../src/utils/serviceAgreementVersions"
import * as chain from "../lib/chain"
import {
  ANVIL_ACCOUNTS,
  APP_URL,
  dbExec,
  faucet,
  gql,
  rpc,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import { connectAs, ensureConnected } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import { expect, test, type Page } from "../lib/test"

/**
 * UAT 2 Borrower Onboarding (BON-01…BON-10) — invitation, ToU signing, profile.
 * Runsheet: wildcat-uat/runsheet/uat_2 Borrower Onboarding.tsv.
 *
 * Accounts (per the page-2 brief):
 *   - #4 "Borrower B" = the onboarding subject: invited → accepts (ToU signature) → registered.
 *   - #5 = the never-invited wallet for BON-01. It must stay PRISTINE: this suite performs no
 *     writes for #5, ever (no faucet, no DB rows, no signatures — BON-01 only reads).
 *   - #0/#1 (lender suites) and #3 (pages 3/4 borrower) are not touched.
 *
 * App model discovered from src/app/[locale]/borrower + src/app/api/invite:
 *   - An "invitation" is an app-DB pair (Borrower profile row + BorrowerInvitation row) written
 *     by the admin panel via POST /api/invite. Seeding it through db-exec mirrors that admin
 *     action; the admin-panel cross-checks (ADM-03/ADM-04) belong to runsheet page 1.
 *   - Accepting the invitation IS the borrower's first ToU signature (PUT /api/invite verifies
 *     a wallet signature over the current ServiceAgreement acknowledgement + organization name),
 *     so BON-03 (accept) and BON-04 (sign ToU) are two facets of one ceremony here: BON-03
 *     drives it, BON-04 asserts persistence of the signed state.
 *   - Signature APIs bound the client's timeSigned to the SERVER wall clock — every page in this
 *     suite is a wall-clock page (plain page.goto, never the chain-aligned clock).
 *   - On /borrower/* pages the global ToUReacceptanceModal auto-opens for a Borrower-party
 *     account that has not accepted the current ToU (also over the invitation page); tests
 *     assert it where it is part of the expected UI and dismiss it (Escape) before clicking
 *     things underneath.
 *
 * State hygiene: setup deletes #4's onboarding rows and (if a previous run registered it)
 * de-registers #4 on-chain via anvil impersonation of the MockArchControllerOwner (the
 * ArchController owner; the mock exposes no removeBorrower of its own), so the suite is
 * re-runnable. Any stray e2e-seeded ToU version from a crashed BON-09 is rolled back first —
 * a leftover e2e version would break every party's ToU state suite-wide.
 *
 * Concurrency: NEVER run concurrently with other suites. BON-09 temporarily replaces the ToU
 * current version for the WHOLE app (all parties see a stale state while it runs) and restores
 * it before finishing (afterAll safety net included).
 */

const BORROWER_B = ANVIL_ACCOUNTS[4] as Address
const PRISTINE = ANVIL_ACCOUNTS[5] as Address

const MOCK_ARCH_OWNER = getDeploymentAddress(
  CHAIN_ID,
  "MockArchControllerOwner",
) as Address
const ARCH_CONTROLLER = getDeploymentAddress(
  CHAIN_ID,
  "WildcatArchController",
) as Address

const archAbi = parseAbi([
  "function isRegisteredBorrower(address account) view returns (bool)",
  "function removeBorrower(address borrower)",
])
const mockOwnerAbi = parseAbi(["function registerBorrower(address borrower)"])

const GAS = 5_000_000n

const BORROWER_B_NAME = "E2E Onboarding B Ltd"
const stamp = Date.now().toString(36)
const INVITE_DESCRIPTION = "E2E onboarding fixture borrower (page 2 suite)."

// ---------- API oracles ----------

type SlaStatus = {
  party: string
  isSigned: boolean
  state: string
  currentVersion: {
    version: string
    plaintextSha256: string
    reacceptanceDeadline: string | null
  }
  acceptedVersion: { version: string; plaintextSha256: string } | null
}

const slaStatus = async (
  address: Address,
  party: "Borrower" | "Lender" = "Borrower",
): Promise<SlaStatus> => {
  const res = await fetch(
    `${APP_URL}/api/sla/${address}?chainId=${CHAIN_ID}&party=${party}`,
  )
  expect(res.ok, `GET /api/sla ${party}: ${res.status}`).toBe(true)
  return (await res.json()) as SlaStatus
}

const slaState = async (
  address: Address,
  party: "Borrower" | "Lender" = "Borrower",
) => (await slaStatus(address, party)).state

/** HEAD /api/invite/[address]: 404 = no pending invitation; 200 carries Signed: true|false. */
const inviteHead = async (address: Address) => {
  const res = await fetch(
    `${APP_URL}/api/invite/${address.toLowerCase()}?chainId=${CHAIN_ID}`,
    { method: "HEAD" },
  )
  return { status: res.status, signed: res.headers.get("Signed") }
}

type CurrentAgreement = {
  version: string
  plaintext: string
  plaintextSha256: string
  acknowledgementText: string
  reacceptanceDeadline: string | null
}

const currentAgreement = async (): Promise<CurrentAgreement> => {
  const res = await fetch(`${APP_URL}/api/service-agreement/current`)
  expect(res.ok, `GET current agreement: ${res.status}`).toBe(true)
  return (await res.json()) as CurrentAgreement
}

// ---------- chain oracles / fixtures ----------

const isRegisteredOnChain = (account: Address) =>
  chain.publicClient.readContract({
    address: ARCH_CONTROLLER,
    abi: archAbi,
    functionName: "isRegisteredBorrower",
    args: [account],
  })

const waitTx = async (hash: `0x${string}`, meta?: chain.TxMeta) => {
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  chain.recordTx(receipt, meta)
  expect(receipt.status, `tx ${hash}`).toBe("success")
  return receipt
}

/** ADM-04 equivalent: on-chain borrower registration through the testnet MockArchControllerOwner
 *  (callable by anyone on the mock — verified by simulation at authoring time). */
const registerBorrowerOnChain = async (account: Address) =>
  waitTx(
    await chain.walletFor(account).writeContract({
      address: MOCK_ARCH_OWNER,
      abi: mockOwnerAbi,
      functionName: "registerBorrower",
      args: [account],
      gas: GAS,
    }),
    { functionName: "registerBorrower", args: [account] },
  )

/** Self-clean: undo a previous run's registration. The ArchController owner is the mock
 *  contract, so impersonate it (anvil) for the removeBorrower call. */
const deregisterBorrowerOnChain = async (account: Address) => {
  await rpc("anvil_impersonateAccount", [MOCK_ARCH_OWNER])
  // 10 ETH so the impersonated contract address can pay gas.
  await rpc("anvil_setBalance", [MOCK_ARCH_OWNER, "0x8AC7230489E80000"])
  await waitTx(
    await chain.walletFor(MOCK_ARCH_OWNER).writeContract({
      address: ARCH_CONTROLLER,
      abi: archAbi,
      functionName: "removeBorrower",
      args: [account],
      gas: GAS,
    }),
    { functionName: "removeBorrower", args: [account] },
  )
  await rpc("anvil_stopImpersonatingAccount", [MOCK_ARCH_OWNER])
}

const subgraphIsRegistered = async (account: Address) =>
  (
    await gql<{ registeredBorrowers: { isRegistered: boolean }[] }>(
      `{ registeredBorrowers(where: { borrower: "${account.toLowerCase()}" }) { isRegistered } }`,
    )
  ).registeredBorrowers[0]?.isRegistered ?? false

// ---------- DB fixtures (SELECTs are oracles; writes mirror admin actions) ----------

/** First result line of a -tA psql run. SELECTs print bare rows; DML additionally prints a
 *  command tag ("INSERT 0 1") AFTER any RETURNING rows — always read line one. */
const dbValue = (sql: string) => dbExec(sql).trim().split("\n")[0]?.trim() ?? ""

const dbCount = (sql: string) => Number(dbValue(sql) || "0")

const onboardingRowCounts = (account: Address) => {
  const a = account.toLowerCase()
  return {
    borrower: dbCount(
      `select count(*) from "Borrower" where "chainId"=${CHAIN_ID} and address='${a}'`,
    ),
    invitation: dbCount(
      `select count(*) from "BorrowerInvitation" where "chainId"=${CHAIN_ID} and address='${a}'`,
    ),
    signatures: dbCount(
      `select count(*) from "ServiceAgreementSignature" where "chainId"=${CHAIN_ID} and address='${a}' and party='Borrower'`,
    ),
    legacySignatures: dbCount(
      `select count(*) from "BorrowerServiceAgreementSignature" where "chainId"=${CHAIN_ID} and address='${a}'`,
    ),
  }
}

/** Delete every onboarding artefact of a previous run for this account (children first). */
const deleteOnboardingRows = (account: Address) => {
  const a = account.toLowerCase()
  dbExec(
    `delete from "ServiceAgreementSignature" where "chainId"=${CHAIN_ID} and address='${a}';
     delete from "ServiceAgreementRefusal" where "chainId"=${CHAIN_ID} and address='${a}';
     delete from "BorrowerServiceAgreementSignature" where "chainId"=${CHAIN_ID} and address='${a}';
     delete from "BorrowerProfileUpdateRequest" where "chainId"=${CHAIN_ID} and address='${a}';
     delete from "BorrowerInvitation" where "chainId"=${CHAIN_ID} and address='${a}';
     delete from "Borrower" where "chainId"=${CHAIN_ID} and address='${a}'`,
  )
}

/** Roll back any e2e-seeded ToU version a crashed BON-09 left behind, and make sure exactly
 *  one (real) version is current again. Idempotent. */
const rollbackSeededTouVersions = () => {
  dbExec(
    `delete from "ServiceAgreementSignature" where "serviceAgreementId" in
       (select id from "ServiceAgreement" where version like 'e2e-tou-%');
     delete from "ServiceAgreementRefusal" where "serviceAgreementId" in
       (select id from "ServiceAgreement" where version like 'e2e-tou-%');
     delete from "ServiceAgreement" where version like 'e2e-tou-%';
     update "ServiceAgreement" set "isCurrent"=true
       where id=(select max(id) from "ServiceAgreement")
       and not exists (select 1 from "ServiceAgreement" where "isCurrent")`,
  )
}

/** Mirror of the admin POST /api/invite write: Borrower profile row + BorrowerInvitation row.
 *  (The live DB carries admin-era columns beyond prisma/schema.prisma — removedFromArchController
 *  is NOT NULL, verified against information_schema.) */
const seedInvitation = (account: Address, inviter: Address) => {
  const a = account.toLowerCase()
  dbExec(
    `insert into "Borrower"
       ("chainId", address, name, alias, description, jurisdiction, "physicalAddress",
        "entityKind", email, "registeredOnChain", "removedFromArchController")
     select ${CHAIN_ID}, '${a}', '${BORROWER_B_NAME}', 'E2E B', '${INVITE_DESCRIPTION}', 'DE',
        'Teststrasse 2, 10115 Berlin', '6QQB', 'e2e-onboarding@example.com', false, false
     where not exists
       (select 1 from "Borrower" where "chainId"=${CHAIN_ID} and address='${a}');
     insert into "BorrowerInvitation"
       ("chainId", address, name, alias, description, jurisdiction, "physicalAddress",
        "entityKind", inviter, "timeInvited")
     select ${CHAIN_ID}, '${a}', '${BORROWER_B_NAME}', 'E2E B', '${INVITE_DESCRIPTION}', 'DE',
        'Teststrasse 2, 10115 Berlin', '6QQB', '${inviter.toLowerCase()}', timezone('utc', now())
     where not exists
       (select 1 from "BorrowerInvitation" where "chainId"=${CHAIN_ID} and address='${a}')`,
  )
}

// ---------- UI helpers ----------

/** The global ToU prompt auto-opens over /borrower pages for a Borrower-party account that has
 *  not accepted the current ToU; Escape dismisses it (session-only) in every non-expired state.
 *  While the dialog is open, MUI marks the app root aria-hidden and Playwright's role queries
 *  stop matching anything underneath — so pages where the prompt is EXPECTED must wait for it
 *  and dismiss it deterministically (see expectAndDismissTouPrompt) before role-based asserts. */
const dismissTouPromptIfOpen = async (page: Page) => {
  // Conditional (non-waiting) check — only for pages where the session dismissal is already
  // stamped and the prompt can no longer auto-open. Two dialog kinds can cover profile pages
  // (possibly stacked): the ToU prompt (closes on Escape) and head's KYB "How Wildcat checks
  // this profile" explainer, which closes ONLY via its "I understand" button (BON-06 family).
  for (let i = 0; i < 6; i += 1) {
    const dialog = page.getByRole("dialog").last()
    if (!(await dialog.isVisible().catch(() => false))) return
    const ack = dialog.getByRole("button", { name: /i understand/i })
    if (await ack.isVisible().catch(() => false)) {
      // When dialogs STACK, another dialog's backdrop can sit above this button even though
      // it is "visible" — a bare click would wait on pointer interception forever. Bounded
      // click; on interception fall through to Escape (closes whichever dialog is topmost).
      const clicked = await ack
        .click({ timeout: 5_000 })
        .then(() => true)
        .catch(() => false)
      if (!clicked) await page.keyboard.press("Escape")
    } else {
      await page.keyboard.press("Escape")
    }
    await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {})
  }
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 })
}

/** Wait for the auto-opening ToU prompt (it opens once the status queries resolve — an
 *  unwaited early check misses it), assert its identifying copy, and dismiss it. */
const expectAndDismissTouPrompt = async (
  page: Page,
  title: RegExp | string,
) => {
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 60_000 })
  await expect(dialog.getByText(title)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden({ timeout: 15_000 })
}

const sha256Hex = (text: string) =>
  createHash("sha256").update(text).digest("hex")

/** UTC ISO → the timestamp-without-tz literal prisma-compatible tables store (UTC). */
const sqlUtcTimestamp = (ms: number) =>
  new Date(ms).toISOString().replace("T", " ").replace("Z", "")

test.describe.serial("borrower onboarding (BON-01…10)", () => {
  test.setTimeout(300_000)

  // BON-03 → BON-05 cross-check: the version chip captured on the signing screen pre-signature.
  let chipBeforeSigning: { label: string; version: string } | undefined

  // BON-09 restore bookkeeping (afterAll safety net for a mid-test crash).
  let touOriginalAgreementId: number | undefined
  let touBumpNeedsRestore = false

  const restoreTouVersion = () => {
    if (touOriginalAgreementId === undefined) return
    dbExec(
      `delete from "ServiceAgreementSignature" where "serviceAgreementId" in
         (select id from "ServiceAgreement" where version like 'e2e-tou-%');
       delete from "ServiceAgreementRefusal" where "serviceAgreementId" in
         (select id from "ServiceAgreement" where version like 'e2e-tou-%');
       delete from "ServiceAgreement" where version like 'e2e-tou-%';
       update "ServiceAgreement" set "isCurrent"=false where "isCurrent";
       update "ServiceAgreement" set "isCurrent"=true where id=${touOriginalAgreementId}`,
    )
    touBumpNeedsRestore = false
  }

  test.afterAll(() => {
    // Safety net: a crash inside BON-09 must not leave the whole app on the seeded ToU version.
    if (touBumpNeedsRestore) restoreTouVersion()
  })

  test("BON-01: never-invited wallet sees the get-in-touch onboarding screen", async ({
    page,
  }) => {
    // Pristine-account invariant FIRST, before this suite writes anything anywhere: #5 must
    // have no DB rows, no signatures and no on-chain registration. A failure here means some
    // run polluted the reserved wallet — fix the pollution, do not relax the assert.
    const rows = onboardingRowCounts(PRISTINE)
    expect(rows, "account #5 has app-DB onboarding rows").toEqual({
      borrower: 0,
      invitation: 0,
      signatures: 0,
      legacySignatures: 0,
    })
    expect(await isRegisteredOnChain(PRISTINE), "on-chain registration").toBe(
      false,
    )
    expect((await inviteHead(PRISTINE)).status, "HEAD /api/invite").toBe(404)
    expect(await slaState(PRISTINE)).toBe("neverSigned")

    await connectAs(page, 5)
    await page.goto("/borrower")
    await ensureConnected(page, PRISTINE)

    await step(
      page,
      "never-signed ToU prompt (read-only, dismissed)",
      async () => {
        // A never-signed Borrower-party wallet gets the first-signature prompt; BON-01 must not
        // sign anything for #5 — assert and dismiss. (Role queries below need it closed anyway.)
        await expectAndDismissTouPrompt(page, "Terms of Use Signature Required")
      },
    )

    await step(
      page,
      "not-onboarded banner with the contact route",
      async () => {
        await expect(page.getByText("Become A Borrower")).toBeVisible({
          timeout: 60_000,
        })
        await expect(
          page.getByText(
            "Corporate entity interested in establishing a credit line?",
          ),
        ).toBeVisible()
        // The contact route in this app build is the in-app "Get In Touch" form link (the
        // runsheet also allows an email route; this build links the form).
        const getInTouch = page.getByRole("link", { name: "Get In Touch" })
        await expect(getInTouch).toBeVisible()
        expect(await getInTouch.getAttribute("href")).toBe(
          "https://forms.gle/irca7KeC7ASmkRh16",
        )
        expect(await getInTouch.getAttribute("target")).toBe("_blank")
        // No borrower functionality is offered.
        await expect(
          page.getByRole("button", { name: "+ Create New Market" }),
        ).toHaveCount(0)
      },
    )

    await step(page, "invitation page confirms no invitation", async () => {
      await page.goto("/borrower/invitation")
      // The ToU prompt ("Terms of Use Signature Required" for a never-signed borrower) may
      // cover the page; the state panel underneath is what BON-01 is about.
      await expect(page.getByText("No invitation found")).toBeVisible({
        timeout: 60_000,
      })
      await expect(
        page.getByText(
          "This wallet does not currently have a borrower invitation.",
        ),
      ).toBeVisible()
    })

    // Re-assert pristine: BON-01 itself must not have written anything for #5.
    expect(onboardingRowCounts(PRISTINE)).toEqual({
      borrower: 0,
      invitation: 0,
      signatures: 0,
      legacySignatures: 0,
    })
    attachAgreement("BON-01 pristine wallet", {
      account: PRISTINE,
      dbRows: rows,
      inviteHead: await inviteHead(PRISTINE),
      slaState: await slaState(PRISTINE),
    })
  })

  test("setup: self-clean Borrower B and the ToU version table", async () => {
    // Wall/chain divergence breaks the wall-clock signature ceremonies driven below.
    await syncChainTimeToWallClock()
    const chainNow = await chain.blockTimestamp()
    const wallNow = Math.floor(Date.now() / 1000)
    expect(
      chainNow - wallNow < 30 * 86_400,
      `chain leads wall clock by ${
        chainNow - wallNow
      }s — dev:fork:reset and run this suite ` +
        `before long time-travel suites`,
    ).toBe(true)

    // A crashed BON-09 from a previous run leaves the app on an e2e ToU version — roll back
    // BEFORE seeding, or the invitation acceptance (legacyWrapperHash dual-write) breaks.
    rollbackSeededTouVersions()
    const current = await currentAgreement()
    expect(current.version).not.toContain("e2e-tou-")

    // Previous-run onboarding state for #4: DB rows away, on-chain registration undone.
    deleteOnboardingRows(BORROWER_B)
    if (await isRegisteredOnChain(BORROWER_B)) {
      await deregisterBorrowerOnChain(BORROWER_B)
      await syncSubgraph()
    }

    // Gas for the BON-07 registration transaction.
    faucet(BORROWER_B, parseUnits("1", 18))

    // Assert the clean slate this suite builds on.
    expect(onboardingRowCounts(BORROWER_B)).toEqual({
      borrower: 0,
      invitation: 0,
      signatures: 0,
      legacySignatures: 0,
    })
    expect(await isRegisteredOnChain(BORROWER_B)).toBe(false)
    expect((await inviteHead(BORROWER_B)).status).toBe(404)
    expect(await slaState(BORROWER_B)).toBe("neverSigned")
    attachAgreement("setup clean slate", {
      borrowerB: BORROWER_B,
      chainLeadSeconds: chainNow - wallNow,
      touVersion: current.version,
    })
  })

  test("BON-02: invited wallet sees the pending invitation with an explicit Accept", async ({
    page,
  }) => {
    // Fixture: what the admin's "send invite" does (POST /api/invite writes exactly these two
    // rows). The ADM-side cross-check of this action is runsheet page 1 (ADM-03).
    seedInvitation(BORROWER_B, ANVIL_ACCOUNTS[0] as Address)
    const head = await inviteHead(BORROWER_B)
    expect(head, "pending unsigned invitation via API").toEqual({
      status: 200,
      signed: "false",
    })

    await connectAs(page, 4)
    await page.goto("/borrower")
    await ensureConnected(page, BORROWER_B)

    await step(page, "ToU prompt routes to the invitation", async () => {
      // For an invited-but-unsigned borrower the global ToU prompt auto-opens and points at
      // the invitation ceremony (initial acceptance may only happen there).
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 60_000 })
      await expect(
        dialog.getByText("Borrower Invitation Required"),
      ).toBeVisible()
      await expect(
        dialog.getByRole("button", { name: "Complete Borrower Invitation" }),
      ).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden({ timeout: 15_000 })
    })

    await step(page, "dashboard banner offers Accept", async () => {
      await expect(page.getByText("Pending Borrower Invitation")).toBeVisible({
        timeout: 60_000,
      })
      await expect(
        page.getByText(
          "You've been invited to register as a Wildcat borrower.",
        ),
      ).toBeVisible()
      const accept = page.getByRole("link", { name: "Accept", exact: true })
      await expect(accept).toBeVisible()
      await accept.click()
      await page.waitForURL(/\/borrower\/invitation/, { timeout: 30_000 })
    })

    await step(page, "invitation page asks the wallet to sign in", async () => {
      await dismissTouPromptIfOpen(page)
      // Invitation details are behind wallet login (JWT); the pre-login state is explicit.
      await expect(page.getByText("Sign in required")).toBeVisible({
        timeout: 60_000,
      })
      await expect(
        page.getByText(
          "Sign in with the invited wallet to view and accept your borrower invitation.",
        ),
      ).toBeVisible()
    })
    attachAgreement("BON-02 invited state", {
      inviteHead: head,
      dbRows: onboardingRowCounts(BORROWER_B),
    })
  })

  test("BON-03: accepting the invitation records the borrower's ToU acceptance", async ({
    page,
  }) => {
    const agreement = await currentAgreement()
    await connectAs(page, 4)
    await page.goto("/borrower/invitation")
    await ensureConnected(page, BORROWER_B)

    await step(page, "sign in (wallet login signature)", async () => {
      // Fresh context ⇒ the invitation-required ToU prompt auto-opens here too (the page
      // beneath is aria-hidden to role queries until it is dismissed).
      await expectAndDismissTouPrompt(page, "Borrower Invitation Required")
      const signIn = page.getByRole("button", { name: "Sign in", exact: true })
      await expect(signIn).toBeVisible({ timeout: 60_000 })
      await signIn.click()
    })

    await step(page, "review the invitation + terms", async () => {
      await expect(page.getByText("Accept Borrower Invitation")).toBeVisible({
        timeout: 60_000,
      })
      // Organization name is prefilled from the invitation and is embedded in the signed record.
      await expect(
        page.getByRole("textbox", { name: "Borrower name" }),
      ).toHaveValue(BORROWER_B_NAME)
      // Version chip (title attribute carries the raw version id) — captured for BON-05.
      const chip = page.locator(`[title="${agreement.version}"]`).first()
      await expect(chip).toBeVisible({ timeout: 30_000 })
      chipBeforeSigning = {
        label: (await chip.innerText()).trim(),
        version: agreement.version,
      }
      // The signing screen offers the document download (asserted in depth in BON-06).
      await expect(
        page.getByRole("link", { name: "Download", exact: true }),
      ).toBeVisible()
    })

    await step(page, "Sign & Accept", async () => {
      await page
        .getByRole("button", { name: "Sign & Accept", exact: true })
        .click()
      // Success replaces the route with the borrower dashboard.
      await page.waitForURL(/\/borrower(\/)?$/, { timeout: 120_000 })
    })

    // Acceptance recorded: versioned signature row + legacy dual-write + API state machine.
    await expect
      .poll(() => slaState(BORROWER_B), { timeout: 60_000 })
      .toBe("signedCurrent")
    const status = await slaStatus(BORROWER_B)
    expect(status.acceptedVersion?.version).toBe(agreement.version)
    const rows = onboardingRowCounts(BORROWER_B)
    expect(rows.signatures, "ServiceAgreementSignature row").toBe(1)
    expect(rows.legacySignatures, "legacy dual-write row").toBe(1)
    expect(await inviteHead(BORROWER_B)).toEqual({
      status: 200,
      signed: "true",
    })

    await step(page, "dashboard flips to pending registration", async () => {
      await expect(page.getByText("Pending On-chain Registration")).toBeVisible(
        { timeout: 60_000 },
      )
      await expect(
        page.getByText(
          "You will be able to create your first market once the Wildcat team finalizes your borrower registration on-chain.",
        ),
      ).toBeVisible()
    })
    // Admin-panel reflection of the acceptance (ADM-03) is asserted on runsheet page 1; the
    // API the panel reads (GET /api/invite, admin-only) serves the same DB rows checked here.
    attachAgreement("BON-03 acceptance", {
      slaStatus: status,
      dbRows: rows,
      inviteHead: await inviteHead(BORROWER_B),
    })
  })

  test("BON-04: signed ToU state persists across reload and reconnect", async ({
    page,
  }) => {
    // New browser context per test = a fresh "reconnect" of the wallet (no session storage,
    // no API token). The signed state must come back purely from the server.
    expect(await slaState(BORROWER_B)).toBe("signedCurrent")

    await connectAs(page, 4)
    await gotoGatedBorrowerPath(page, "/borrower/agreement", BORROWER_B)

    const assertReviewState = async () => {
      // Review mode: Cancel + Download only — no sign CTA of any kind.
      await expect(
        page.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeVisible({ timeout: 60_000 })
      await expect(
        // Upstream a5700145: the ToU download is a native LINK on head (was a button).
      page
        .getByRole("link", { name: /download/i })
        .or(page.getByRole("button", { name: "Download", exact: true }))
        .first(),
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Sign Terms of Use" }),
      ).toHaveCount(0)
      await expect(
        page.getByRole("button", { name: "Complete Invitation" }),
      ).toHaveCount(0)
    }

    await step(page, "agreement page is in review mode", assertReviewState)
    await step(page, "still signed after reload", async () => {
      await page.reload()
      await assertReviewState()
    })
    expect(await slaState(BORROWER_B)).toBe("signedCurrent")
    attachAgreement("BON-04 persistence", {
      slaStatus: await slaStatus(BORROWER_B),
    })
  })

  test("BON-05: displayed ToU version matches the published current version", async ({
    page,
  }) => {
    const agreement = await currentAgreement()
    const expectedLabel = formatServiceAgreementVersionLabel(agreement.version)

    // Before-signing capture from the invitation screen (BON-03) named the same version.
    expect(
      chipBeforeSigning,
      "chip captured pre-signing in BON-03",
    ).toBeDefined()
    expect(chipBeforeSigning!.version).toBe(agreement.version)
    expect(chipBeforeSigning!.label).toBe(expectedLabel)

    await connectAs(page, 4)
    await gotoGatedBorrowerPath(page, "/borrower/agreement", BORROWER_B)

    await step(page, "version chip on the agreement page", async () => {
      const chip = page.locator(`[title="${agreement.version}"]`).first()
      await expect(chip).toBeVisible({ timeout: 60_000 })
      expect((await chip.innerText()).trim()).toBe(expectedLabel)
    })

    // After signing, the account's accepted version IS the current published version.
    const status = await slaStatus(BORROWER_B)
    expect(status.acceptedVersion?.version).toBe(agreement.version)
    expect(status.acceptedVersion?.plaintextSha256).toBe(
      agreement.plaintextSha256,
    )
    attachAgreement("BON-05 version agreement", {
      currentVersion: agreement.version,
      chipBeforeSigning,
      accepted: status.acceptedVersion,
    })
  })

  test("BON-06: ToU document downloads from the signing screen and the profile", async ({
    page,
  }) => {
    const agreement = await currentAgreement()

    await connectAs(page, 4)
    await gotoGatedBorrowerPath(page, "/borrower/agreement", BORROWER_B)
    await step(page, "signing screen offers Download", async () => {
      await expect(
        // Upstream a5700145: the ToU download is a native LINK on head (was a button).
      page
        .getByRole("link", { name: /download/i })
        .or(page.getByRole("button", { name: "Download", exact: true }))
        .first(),
      ).toBeVisible({ timeout: 60_000 })
    })

    // The button window.opens this endpoint; assert the served document itself (this app
    // serves the canonical plaintext as .txt, not a PDF — noted deviation from the runsheet).
    const download = await fetch(
      `${APP_URL}/api/service-agreement/current/download`,
    )
    expect(download.status).toBe(200)
    expect(download.headers.get("content-type")).toContain("text/plain")
    const sanitized = agreement.version.replace(/[^a-zA-Z0-9._-]+/g, "-")
    expect(download.headers.get("content-disposition")).toContain(
      `Wildcat Terms of Use - ${sanitized}.txt`,
    )
    const body = await download.text()
    expect(body).toBe(agreement.plaintext)
    expect(sha256Hex(body), "download hash vs published sha").toBe(
      agreement.plaintextSha256,
    )

    await step(page, "profile offers the acceptance certificate", async () => {
      await page.goto("/borrower/profile")
      await expect(page.getByText("Accepted Version")).toBeVisible({
        timeout: 60_000,
      })
      // Head: a KYB explainer modal ("How Wildcat checks this profile") auto-opens on borrower
      // profiles and aria-hides the page — dismiss it first.
      const understood = page.getByRole("button", { name: /i understand/i })
      if (
        await understood
          .waitFor({ timeout: 8_000 })
          .then(() => true)
          .catch(() => false)
      ) {
        await understood.click()
        await expect(understood).toBeHidden({ timeout: 10_000 })
      }
      const cert = page
        .getByRole("link", { name: /download acceptance certificate/i })
        .or(
          page.getByRole("button", {
            name: "Download Acceptance Certificate",
          }),
        )
        .first()
      // Head: the certificate control lives in the "Terms of Use status" popover — open it when
      // the control is not rendered inline (a5700145 family relayout).
      if (!(await cert.isVisible().catch(() => false))) {
        await page
          .getByRole("button", { name: /terms of use status/i })
          .click()
      }
      await expect(cert).toBeVisible({ timeout: 30_000 })
    })

    // The profile button window.opens the certificate ZIP; verify it matches the signed version.
    const cert = await fetch(
      `${APP_URL}/api/service-agreement/${BORROWER_B.toLowerCase()}/certificate?chainId=${CHAIN_ID}`,
    )
    expect(cert.status).toBe(200)
    const zip = await JSZip.loadAsync(await cert.arrayBuffer())
    const recordFile = zip.file("acceptance-record.json")
    expect(recordFile, "acceptance-record.json in the ZIP").not.toBeNull()
    const record = JSON.parse(await recordFile!.async("string")) as {
      address: string
      version: string
      plaintextSha256: string
      organizationName: string | null
      acceptedTermsTextAvailable: boolean
    }
    expect(record.address).toBe(BORROWER_B.toLowerCase())
    expect(record.version).toBe(agreement.version)
    expect(record.plaintextSha256).toBe(agreement.plaintextSha256)
    expect(record.organizationName).toBe(BORROWER_B_NAME)
    expect(record.acceptedTermsTextAvailable).toBe(true)
    const termsFile = zip.file("Accepted Terms of Use.txt")
    expect(termsFile, "accepted terms text in the ZIP").not.toBeNull()
    expect(sha256Hex(await termsFile!.async("string"))).toBe(
      agreement.plaintextSha256,
    )
    attachAgreement("BON-06 downloads", {
      downloadDisposition: download.headers.get("content-disposition"),
      certificateRecord: record,
    })
  })

  test("BON-07: after on-chain registration the borrower gets full functionality", async ({
    page,
  }) => {
    // Fixture = ADM-04's effect: registration through the testnet MockArchControllerOwner
    // (the admin-panel side of ADM-04 is runsheet page 1).
    expect(await isRegisteredOnChain(BORROWER_B)).toBe(false)
    await registerBorrowerOnChain(BORROWER_B)
    expect(await isRegisteredOnChain(BORROWER_B)).toBe(true)
    await syncSubgraph()
    await expect
      .poll(() => subgraphIsRegistered(BORROWER_B), { timeout: 90_000 })
      .toBe(true)
    // The pending invitation resolves itself on the next API read (the server checks the chain
    // and stamps registeredOnChain).
    await expect
      .poll(async () => (await inviteHead(BORROWER_B)).status, {
        timeout: 60_000,
      })
      .toBe(404)

    await connectAs(page, 4)
    await page.goto("/borrower")
    await ensureConnected(page, BORROWER_B)

    await step(
      page,
      "dashboard shows full borrower functionality",
      async () => {
        await expect(
          page.getByRole("button", { name: "+ Create New Market" }),
        ).toBeVisible({ timeout: 90_000 })
        // Freshly registered, no markets yet: the create-your-first-market lead banner.
        await expect(page.getByText("No Active Markets")).toBeVisible()
        await expect(
          page.getByRole("link", { name: "Create New Market", exact: true }),
        ).toBeVisible()
        await expect(
          page.getByText("Pending On-chain Registration"),
        ).toHaveCount(0)
      },
    )

    await step(page, "create-market wizard is reachable", async () => {
      await gotoGatedBorrowerPath(page, "/borrower/create-market", BORROWER_B)
      // The wizard mounts (ToU gate passed); step sidebar concatenates numbers ("1Market Policy").
      await expect(
        page.getByRole("button", { name: /Market Policy/ }).first(),
      ).toBeVisible({ timeout: 90_000 })
    })
    attachAgreement("BON-07 registration", {
      onChain: await isRegisteredOnChain(BORROWER_B),
      subgraph: await subgraphIsRegistered(BORROWER_B),
      inviteHead: await inviteHead(BORROWER_B),
      dbRegisteredFlag: dbExec(
        `select "registeredOnChain" from "Borrower" where "chainId"=${CHAIN_ID} and address='${BORROWER_B.toLowerCase()}'`,
      ).trim(),
    })
  })

  test("BON-08: borrower-side profile edit renders on the public profile", async ({
    page,
    browser,
  }) => {
    const description = `E2E onboarding description ${stamp}: automated profile edit check.`
    const website = `e2e-${stamp}.example.com`

    await connectAs(page, 4)
    await page.goto("/borrower/profile/edit")
    await ensureConnected(page, BORROWER_B)

    await step(page, "login for profile changes", async () => {
      // Fresh context ⇒ no API token, so the login gate is always present here; the form
      // swaps it out once the signed login lands.
      const login = page.getByRole("button", {
        name: "Sign a message before submitting changes to profile",
      })
      await expect(login).toBeVisible({ timeout: 60_000 })
      await login.click()
      await expect(login).toBeHidden({ timeout: 60_000 })
    })

    await step(page, "edit description and website", async () => {
      const descriptionField = page.getByPlaceholder(
        "Description of your business operations",
        { exact: false },
      )
      // Wait for the form to prefill from the stored profile before typing, or the
      // fetch-triggered reset would overwrite the input. Match the shared "E2E onboarding"
      // prefix rather than INVITE_DESCRIPTION exactly: a partial rerun of the suite leaves a
      // previous run's edited description in the DB, and either prefill proves the load.
      await expect(descriptionField).toHaveValue(/^E2E onboarding /, {
        timeout: 60_000,
      })
      await descriptionField.fill(description)
      await page.getByPlaceholder("borrower-profile.com").fill(website)
      const confirm = page.getByRole("button", { name: "Confirm", exact: true })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      await page.waitForURL(/\/borrower\/profile(\/)?$/, { timeout: 60_000 })
    })

    await step(page, "own profile shows the changes", async () => {
      // KNOWN-ISSUES #10: GET /api/profiles/[address] is served with
      // `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`, so the refetch
      // react-query fires right after the edit POST can be answered from cache with the
      // PRE-edit profile — and nothing ever refetches again, leaving the borrower staring
      // at their old profile. Reload-poll here (each reload remounts the query); journal
      // how many reloads the fresh profile took so the report shows the staleness.
      let reloads = 0
      for (;;) {
        try {
          await expect(page.getByText(description)).toBeVisible({
            timeout: 20_000,
          })
          break
        } catch (err) {
          if (reloads >= 4) throw err
          reloads += 1
          await page.reload()
        }
      }
      attachAgreement("BON-08 stale-profile-after-edit (KNOWN-ISSUES #10)", {
        reloadsUntilFreshProfile: reloads,
        staleObserved: reloads > 0,
      })
    })

    // Server-side: the update request row exists AND was applied to the profile (this build
    // auto-applies non-restricted fields; name/alias edits stay admin-only).
    const profileRes = await fetch(
      `${APP_URL}/api/profiles/${BORROWER_B.toLowerCase()}?chainId=${CHAIN_ID}`,
    )
    const { profile } = (await profileRes.json()) as {
      profile: { description?: string; website?: string; name?: string } | null
    }
    expect(profile?.description).toBe(description)
    expect(profile?.website).toBe(website)
    expect(profile?.name).toBe(BORROWER_B_NAME)

    // Public borrower page, viewed from a different session (default account #0).
    const publicContext = await browser.newContext()
    try {
      const publicPage = await publicContext.newPage()
      await publicPage.goto(`/borrower/profile/${BORROWER_B.toLowerCase()}`)
      await expect(publicPage.getByText(description)).toBeVisible({
        timeout: 60_000,
      })
      await expect(publicPage.getByText(BORROWER_B_NAME).first()).toBeVisible()
      // The viewing account (#0, auto-connected) has no Borrower-party ToU acceptance, so the
      // global prompt may cover the page; role queries need it closed.
      const websiteLink = publicPage.getByRole("link", {
        name: "Website",
        exact: true,
      })
      const publicDialog = publicPage.getByRole("dialog")
      await expect(websiteLink.or(publicDialog).first()).toBeVisible({
        timeout: 60_000,
      })
      await dismissTouPromptIfOpen(publicPage)
      await expect(websiteLink).toBeVisible()
      expect(await websiteLink.getAttribute("href")).toBe(`https://${website}`)
    } finally {
      await publicContext.close()
    }
    // "About borrower" inside a market detail page needs a market owned by #4 — none exists in
    // this suite's scope (market rendering of borrower profiles is covered by pages 3/4).
    attachAgreement("BON-08 profile edit", { profile })
  })

  test("BON-09: ToU version bump — re-sign prompt states and blocked actions", async ({
    page,
  }) => {
    test.setTimeout(420_000)
    // ADM-13's effect (publish a new ToU version) is seeded straight into the ServiceAgreement
    // table; admin-side verification is runsheet page 1. The bump affects EVERY party app-wide,
    // so this test restores the original version before finishing (plus afterAll safety net).
    expect(await slaState(BORROWER_B)).toBe("signedCurrent")
    const lender0Before = await slaState(ANVIL_ACCOUNTS[0] as Address, "Lender")

    const original = await currentAgreement()
    touOriginalAgreementId = dbCount(
      `select id from "ServiceAgreement" where "isCurrent"`,
    )
    expect(touOriginalAgreementId).toBeGreaterThan(0)

    const seededVersion = `e2e-tou-${stamp}`
    const seededPlaintext =
      `# E2E Terms of Use (${seededVersion})\n\n` +
      `Synthetic ToU version seeded by the page-2 onboarding suite to exercise re-acceptance. ` +
      `If you can read this outside a test run, the suite failed to restore the real version.`
    const seededAck = `I agree to the Wildcat Terms of Use e2e test version ${stamp}.`
    const seededId = dbCount(
      `insert into "ServiceAgreement"
         (version, plaintext, html, "plaintextSha256", "acknowledgementText", "effectiveDate")
       values ('${seededVersion}', '${seededPlaintext.replace(/'/g, "''")}',
         '<p>e2e</p>', '${sha256Hex(seededPlaintext)}', '${seededAck}',
         '${sqlUtcTimestamp(Date.now())}')
       returning id`,
    )
    expect(seededId).toBeGreaterThan(0)
    // Atomic flip: the seeded version becomes current with a 48h re-acceptance campaign.
    dbExec(
      `update "ServiceAgreement" set "isCurrent"=false where "isCurrent";
       update "ServiceAgreement" set "isCurrent"=true,
         "reacceptanceDeadline"='${sqlUtcTimestamp(
           Date.now() + 48 * 3_600_000,
         )}'
       where id=${seededId}`,
    )
    touBumpNeedsRestore = true

    try {
      expect(await slaState(BORROWER_B)).toBe("staleWithinGrace")

      await connectAs(page, 4)

      await step(
        page,
        "state 1: dismissible re-sign prompt (grace)",
        async () => {
          // No ensureConnected here: its role queries race the auto-opening dialog (open dialog
          // ⇒ background aria-hidden ⇒ role queries blind); the prompt itself only opens for a
          // connected account, so waiting for it proves the connection.
          await page.goto("/borrower")
          const dialog = page.getByRole("dialog")
          await expect(dialog).toBeVisible({ timeout: 60_000 })
          await expect(dialog.getByText("Updated Terms of Use")).toBeVisible()
          await expect(
            dialog.getByText(/Please sign the new version by/),
          ).toBeVisible()
          // Signing capacity is spelled out with the organization name (profile fetch may lag).
          await expect(
            dialog.getByText(`Borrower (${BORROWER_B_NAME})`),
          ).toBeVisible({ timeout: 30_000 })
          // Grace state is dismissible…
          await page.keyboard.press("Escape")
          await expect(dialog).toBeHidden({ timeout: 15_000 })
          // …and manually reopenable from the footer status entry.
          await page
            .getByRole("button", { name: "Terms of Use status" })
            .click()
          await expect(dialog).toBeVisible({ timeout: 30_000 })
          await page.keyboard.press("Escape")
          await expect(dialog).toBeHidden({ timeout: 15_000 })
        },
      )

      // Expire the campaign deadline: grace → blocking.
      dbExec(
        `update "ServiceAgreement" set "reacceptanceDeadline"='${sqlUtcTimestamp(
          Date.now() - 3_600_000,
        )}' where id=${seededId}`,
      )
      expect(await slaState(BORROWER_B)).toBe("staleExpired")

      await step(
        page,
        "state 2: blocking modal after the deadline",
        async () => {
          await page.goto("/borrower")
          const dialog = page.getByRole("dialog")
          await expect(dialog).toBeVisible({ timeout: 60_000 })
          await expect(
            dialog.getByText(/The signing deadline\s+has passed/),
          ).toBeVisible()
          // Not dismissible: Escape leaves it in place and the header cross is absent.
          await page.keyboard.press("Escape")
          await expect(dialog).toBeVisible()
        },
      )

      await step(page, "state 3: create-market is blocked", async () => {
        // Plain navigation: gotoGatedBorrowerPath's ensureConnected can never pass here — the
        // forced blocking modal aria-hides the header (chip AND connect CTA invisible to role
        // queries), and the connectAs cookie already guarantees the connection.
        await page.goto("/borrower/create-market")
        // The forced modal overlays this page too; the blocked screen renders beneath it.
        await expect(
          page.getByText("Terms of Use update required"),
        ).toBeVisible({ timeout: 60_000 })
        await expect(
          page.getByText(
            "Creating new markets is paused until you accept the current Terms of Use. Your existing markets and withdrawals are unaffected.",
          ),
        ).toBeVisible()
        await expect(page.getByText("Review Terms of Use")).toBeVisible()
      })

      await step(page, "state 4: status-check error surface", async () => {
        // Simulate the status API being unreachable in a tab where nothing resolved yet.
        await page.route("**/api/sla/**", (route) => route.abort())
        await page.goto("/borrower")
        await ensureConnected(page, BORROWER_B)
        await page.getByRole("button", { name: "Terms of Use status" }).click()
        const dialog = page.getByRole("dialog")
        await expect(
          dialog.getByText(/Couldn.t verify your Terms of Use status/),
        ).toBeVisible({ timeout: 60_000 })
        const retry = dialog.getByRole("button", { name: "Retry" })
        await expect(retry).toBeVisible()
        // Connectivity back: Retry recovers to the real (blocking) state in place.
        await page.unroute("**/api/sla/**")
        await retry.click()
        await expect(dialog.getByText("Updated Terms of Use")).toBeVisible({
          timeout: 60_000,
        })
      })

      await step(page, "re-sign from the blocking prompt", async () => {
        const dialog = page.getByRole("dialog")
        const sign = dialog.getByRole("button", { name: "Sign Terms of Use" })
        await expect(sign).toBeEnabled({ timeout: 60_000 })
        await sign.click()
        await expect
          .poll(() => slaState(BORROWER_B), { timeout: 90_000 })
          .toBe("signedCurrent")
        // The manually-opened dialog stays up and flips to the signed confirmation in place.
        await expect(
          dialog.getByText(/this capacity is up to date/),
        ).toBeVisible({ timeout: 60_000 })
      })
      const resigned = await slaStatus(BORROWER_B)
      expect(resigned.acceptedVersion?.version).toBe(seededVersion)

      await step(page, "state 5: signed confirmation", async () => {
        // Fresh load: no auto prompt for a current acceptance; the manual status view (footer)
        // shows the read-only confirmation with no sign/decline actions.
        await page.goto("/borrower")
        await ensureConnected(page, BORROWER_B)
        const dialog = page.getByRole("dialog")
        const statusButton = page.getByRole("button", {
          name: "Terms of Use status",
        })
        // Role queries only resolve while no dialog covers the app — visibility of the footer
        // entry itself doubles as the no-auto-prompt check.
        await expect(statusButton).toBeVisible({ timeout: 60_000 })
        await statusButton.click()
        await expect(dialog).toBeVisible({ timeout: 30_000 })
        await expect(
          dialog.getByText(/this capacity is up to date/),
        ).toBeVisible()
        await expect(
          dialog.getByRole("button", { name: "Close", exact: true }),
        ).toBeVisible()
        await expect(
          dialog.getByRole("button", { name: "Sign Terms of Use" }),
        ).toHaveCount(0)
      })

      attachAgreement("BON-09 states", {
        seededVersion,
        original: original.version,
        resignedAccepted: resigned.acceptedVersion,
      })
    } finally {
      // Restore the real ToU version even when an assert above failed (a timeout still skips
      // this — the afterAll hook then performs the same restore).
      restoreTouVersion()
    }

    // The rollback returns every party to its pre-bump state: Borrower B's BON-03 acceptance
    // of the real version counts again, and lender #0 is exactly where it started.
    expect(await slaState(BORROWER_B)).toBe("signedCurrent")
    const restored = await slaStatus(BORROWER_B)
    expect(restored.currentVersion.version).toBe(original.version)
    expect(restored.acceptedVersion?.version).toBe(original.version)
    expect(await slaState(ANVIL_ACCOUNTS[0] as Address, "Lender")).toBe(
      lender0Before,
    )
  })

  test("BON-10: Safe borrower onboarding", async () => {
    test.fixme(
      true,
      "blocked: Safe wallet — no Safe infrastructure on the local fork (no Safe{Wallet} app/relay); BON-02…07 via Safe cannot be automated here",
    )
  })
})
