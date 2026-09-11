/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { getDeploymentAddress } from "@wildcatfi/wildcat-sdk"
import { parseAbi } from "viem"

import { getLoginSignatureMessage } from "../../src/config/api"
import { buildServiceAgreementMessage } from "../../src/utils/serviceAgreementMessage"
import {
  ARCH_CONTROLLER,
  archControllerOwner,
  installToastRecorder,
  recordedToasts,
} from "../borrowerflows/helpers"
import * as chain from "../lib/chain"
import {
  ANVIL_ACCOUNTS,
  APP_URL,
  dbExec,
  gql,
  rpc,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import { connectAs, ensureConnected } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import { expect, test, type Locator, type Page } from "../lib/test"

/**
 * UAT 1 Admin (ADM-01…ADM-13) — the admin panel: login, borrower invitation, on-chain
 * registration, negative cases.
 * Runsheet: wildcat-uat/runsheet/uat_1 Admin.tsv.
 *
 * ── PORTED SUBSET (COVERAGE-SUGGESTIONS-2026-09-08 §7) ────────────────────────────────
 * The v2.5 worktree owns the full file (ADM-01…13). §7 names the high-value gaps for main:
 * unprivileged admin denial and the invitation/registration cycle. Those are the rows here,
 * with their v2.5 titles UNCHANGED so the side-by-side pairs row-for-row:
 *
 *  ADM-01 Admin login .............. ported — real wallet-signature login through the UI, plus
 *                                    the negative control (a non-admin wallet is refused).
 *  ADM-02 Add borrower ............. ported — Borrower A invited through the panel's
 *                                    "Invite Borrower" modal; row + DB row + invite API asserted.
 *  ADM-10 Duplicate invite ......... ported — a second invite for the same address is refused
 *                                    by POST /api/invite (400) and surfaced as the error modal.
 *  ADM-12 Invite before acceptance . ported — before acceptance the row carries NO Register
 *                                    control; it appears only once the borrower has signed.
 *  ADM-03 Invitation status ........ ported — the ADMIN side: after Borrower A accepts, the
 *                                    panel's Signed column and GET /api/invite flip.
 *  ADM-04 Whitelist tx ............. ported — the panel's Register button; see "M3 in the panel"
 *                                    below. Chain + subgraph + panel state asserted.
 *  ADM-05 Repeat for B ............. ported — ADM-02→04 repeated for Borrower B (anvil #8).
 *
 *  NOT ported here (not a gate — nobody has assessed them against main yet): ADM-06/07 (admin
 *  profile completion and edit propagation — main has no `/profile/borrower/[address]` route,
 *  see e2e/COVERAGE.md, so the public-profile half needs a different oracle), ADM-08 (ToU
 *  signature view — same route dependency) and the three v2.5 `test.fixme` stubs ADM-09/11/13,
 *  whose reasons (no history surface, no deregistration surface, no ToU publishing surface)
 *  hold identically here: main's admin panel is the SAME two flat grids.
 *
 * ── What main's admin panel actually offers, vs v2.5's ────────────────────────────────
 * Structurally identical. `src/app/[locale]/admin` is the same 14 files in both worktrees, and
 * the only diffs are i18n-key renames plus four hardcoded English strings ("Pending
 * Invitations", "Registered Borrowers", "Admin Panel", "Pending Registration") where v2.5 reads
 * a locale key. Every label this suite addresses resolves to the SAME text in both
 * (`admin.inviteBorrower.*`, `admin.editBorrower.button` = "Edit", `borrowerProfile.edit.*`
 * placeholders, `borrowerProfile.edit.buttons.confirm` = "Confirm"). Both grids expose the same
 * `data-field`s, and `AuthWrapper` has the same three-stage gate and the same copy.
 * The APIs are byte-identical too (`/api/auth/login`, `/api/invite/[address]`,
 * `/api/service-agreement/current`, `/api/service-agreement/[address]/status`,
 * `/api/profiles/updates`); `POST /api/invite` differs only by also resolving `registeredBy`.
 *
 * ── M3 in the panel: the Register button cannot register on main ──────────────────────
 * `useRegisterTestnetBorrower` builds its contract with
 * `getMockArchControllerOwnerContract(chainId, signer)`, i.e. the SDK deployment manifest's
 * `MockArchControllerOwner`. On SDK 3.1.17 (main) that is `0xa476920a…`, which Sepolia has since
 * superseded: `WildcatArchController.owner()` is `0x981f1Fb4…`, so the call reverts
 * `Unauthorized()` (0x82b42900) and the panel shows "Failed to Register Borrower". This is
 * KNOWN-ISSUES **M3**, previously recorded only against the e2e fixtures and "the app wherever
 * it registers borrowers from that constant" — ADM-04/ADM-05 are its first UI-facing proof.
 * ADM-04 asserts the panel path works on v2.5 and is blocked on main (so a fix cannot land
 * silently), journals the manifest/chain/revert evidence, and then completes the registration
 * through the chain's real owner so the panel's RECONCILIATION half still has an oracle. That
 * half — pending row disappears, Registered Borrowers gains it, `registeredOnChain` flips, the
 * invitation feed drops it — is genuine main coverage and passes.
 *
 * ── Admin auth model (src/app/[locale]/admin + src/app/api/auth) ──────────────────────
 *  /admin renders <AuthWrapper requiresAdmin>. It needs THREE things, in order:
 *    1. a connected wallet (else "Connect your wallet to continue.");
 *    2. an API token — the "Login" button signs `getLoginSignatureMessage(...)` with the wallet
 *       and POSTs it to /api/auth/login, which verifies the signature and mints a 1-week JWT
 *       carrying {address, signer, isAdmin, chainId}; the token is stored in redux and persisted
 *       to localStorage under "persist:apiTokens" (key `${address}_${chainId}`);
 *    3. isAdmin — set by createApiToken purely from a row in the app-DB table
 *       AdminAccount(id serial, address text, chainId int; unique(chainId,address)).
 *  Every admin API (GET/POST/DELETE /api/invite, GET /api/profiles, POST /api/profiles/updates
 *  for a foreign address) re-checks the JWT AND re-reads AdminAccount (isAdminForChain).
 *  This suite therefore seeds exactly one AdminAccount row for anvil #6 and then performs the
 *  REAL login ceremony in the browser — there is no session forging anywhere; the JWT the tests
 *  use for API oracles is read back out of localStorage after the app itself issued it.
 *
 * ── Accounts ─────────────────────────────────────────────────────────────────────────
 *  #6 admin identity, #7 "Borrower A", #8 "Borrower B", #9 non-admin stranger (login only —
 *  logging in writes nothing). #0–#2 (lenders), #3 (page-3 borrower), #4 (page-2 Borrower B)
 *  and #5 (page-2 PRISTINE wallet) are never touched by this suite. The main variant's
 *  borrower-ops fixture account (`pins.json.borrower.address`) is untouched too.
 *
 * ── State hygiene ────────────────────────────────────────────────────────────────────
 *  Setup (not afterAll — a crashed run must still leave a re-runnable fork) deletes the
 *  AdminAccount row and every onboarding row for #7/#8, and de-registers them on-chain via
 *  anvil impersonation of the ArchController's owner (read from the CHAIN, never from the SDK
 *  manifest — M3). Nothing is seeded for any account another suite owns.
 *
 * ── Documented gaps in this build (not test defects) ──────────────────────────────────
 *  • The invite modal renders an Email field but InviteBorrowerModal.handleSubmit never sends it
 *    (identical in both worktrees).
 *  • The admin profile forms pass `hideExternalLinks`, so website/twitter/telegram/linkedin/
 *    additional URLs are borrower-editable only.
 *  • No invitation email is sent anywhere in this build (no mailer): "delivered/retrievable" in
 *    ADM-02 is asserted as retrievable — HEAD /api/invite for the borrower's wallet.
 *
 * ── Concurrency ──────────────────────────────────────────────────────────────────────
 *  Sends chain transactions (borrower registration) — must not run beside another Playwright
 *  process. No time travel; the login and ToU ceremonies are WALL-clock signatures, so this file
 *  belongs before the time burners (KNOWN-ISSUES H1). It sorts first by path already.
 */

const CHAIN_ID = 11155111

const ADMIN_INDEX = 6
const BORROWER_A_INDEX = 7
const BORROWER_B_INDEX = 8
const STRANGER_INDEX = 9

const ADMIN = ANVIL_ACCOUNTS[ADMIN_INDEX] as Address
const BORROWER_A = ANVIL_ACCOUNTS[BORROWER_A_INDEX] as Address
const BORROWER_B = ANVIL_ACCOUNTS[BORROWER_B_INDEX] as Address
const STRANGER = ANVIL_ACCOUNTS[STRANGER_INDEX] as Address

/** What the APP uses to register (see "M3 in the panel"); the chain owner is the ground truth. */
const MANIFEST_ARCH_OWNER = getDeploymentAddress(
  CHAIN_ID,
  "MockArchControllerOwner",
) as Address

const archAbi = parseAbi([
  "function isRegisteredBorrower(address account) view returns (bool)",
  "function registerBorrower(address borrower)",
  "function removeBorrower(address borrower)",
])

const GAS = 5_000_000n

const stamp = Date.now().toString(36)

/** Legal names are the row anchors in the admin grids — stamp them so a re-run never collides. */
const BORROWER_A_NAME = `E2E Admin Borrower A ${stamp}`
const BORROWER_B_NAME = `E2E Admin Borrower B ${stamp}`
const BORROWER_A_ALIAS = "ADM A"
const BORROWER_B_ALIAS = "ADM B"
const INVITE_DESCRIPTION_A = `Invited by the page-1 admin suite (run ${stamp}).`
const INVITE_DESCRIPTION_B = `Borrower B of the page-1 admin suite (run ${stamp}).`
const INVITE_FOUNDED = "2019"
const INVITE_ADDRESS_LINE = "Teststrasse 7, 10115 Berlin"
/** Germany has exactly one jurisdiction subdivision, so picking the country fixes the
 *  jurisdiction (the subdivision selector is not even rendered) — one less flaky autocomplete. */
const INVITE_COUNTRY = "Germany"
const INVITE_ENTITY_KIND = "Aktiengesellschaft"
const INVITE_JURISDICTION = "DE"
const INVITE_ENTITY_KIND_CODE = "6QQB"

// ---------- app API oracles ----------

/** HEAD /api/invite/[address]: 404 = no pending invitation; 200 carries Signed: true|false. */
const inviteHead = async (account: Address) => {
  const res = await fetch(
    `${APP_URL}/api/invite/${account.toLowerCase()}?chainId=${CHAIN_ID}`,
    { method: "HEAD" },
  )
  return { status: res.status, signed: res.headers.get("Signed") }
}

type CurrentAgreement = {
  version: string
  plaintextSha256: string
  acknowledgementText: string
}

const currentAgreement = async (): Promise<CurrentAgreement> => {
  const res = await fetch(`${APP_URL}/api/service-agreement/current`)
  expect(res.ok, `GET current agreement: ${res.status}`).toBe(true)
  return (await res.json()) as CurrentAgreement
}

type ToUStatus = {
  current: { version: string; plaintextSha256: string }
  accepted: {
    version: string
    organizationName: string | null
    acceptedAt: number
  } | null
}

const touStatus = async (account: Address): Promise<ToUStatus> => {
  const res = await fetch(
    `${APP_URL}/api/service-agreement/${account.toLowerCase()}/status?chainId=${CHAIN_ID}`,
  )
  expect(res.ok, `GET service-agreement status: ${res.status}`).toBe(true)
  return (await res.json()) as ToUStatus
}

type AdminInvitationRow = {
  address: string
  name: string
  alias?: string
  inviter: string
  description?: string
  founded?: string
  headquarters?: string
  jurisdiction?: string
  physicalAddress?: string
  entityKind?: string
  timeInvited: string
  timeSigned: string | null
  hasSignedServiceAgreement: boolean
  registeredOnChain: boolean
}

/** GET /api/invite — the admin-only endpoint the Pending Invitations grid itself reads. */
const adminInvitations = async (bearer: string) => {
  const res = await fetch(
    `${APP_URL}/api/invite?onlyPendingInvitations=true&chainId=${CHAIN_ID}`,
    { headers: { authorization: `Bearer ${bearer}` } },
  )
  expect(res.status, "GET /api/invite (admin)").toBe(200)
  return (await res.json()) as AdminInvitationRow[]
}

const adminInvitationFor = async (bearer: string, account: Address) => {
  const rows = await adminInvitations(bearer)
  return rows.find((row) => row.address.toLowerCase() === account.toLowerCase())
}

/** GET /api/invite/[address] — admin (or the invitee) may read a single pending invitation. */
const adminInvitationDetail = async (bearer: string, account: Address) => {
  const res = await fetch(
    `${APP_URL}/api/invite/${account.toLowerCase()}?chainId=${CHAIN_ID}`,
    { headers: { authorization: `Bearer ${bearer}` } },
  )
  expect(res.status, "GET /api/invite/[address] (admin)").toBe(200)
  return ((await res.json()) as { invitation: AdminInvitationRow }).invitation
}

// ---------- the app's own login, driven headlessly for the BORROWER side ----------

/** POST /api/auth/login with a real anvil wallet signature over the app's own login message.
 *  This is the product login flow (no forged sessions) — used only for the borrower half of
 *  ADM-03/ADM-05, whose UI ceremony belongs to runsheet page 2 (BON-02/03). */
const loginThroughApi = async (account: Address) => {
  const timeSigned = Math.floor(Date.now() / 1000)
  const message = getLoginSignatureMessage(
    account.toLowerCase(),
    timeSigned,
    CHAIN_ID,
  )
  const signature = await chain.walletFor(account).signMessage({ message })
  const res = await fetch(`${APP_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      address: account.toLowerCase(),
      chainId: CHAIN_ID,
      signature,
      timeSigned,
    }),
  })
  expect(res.status, "POST /api/auth/login").toBe(200)
  return (await res.json()) as {
    token: string
    isAdmin: boolean
    address: string
    chainId: number
  }
}

/**
 * ADM-03's precondition: the invited borrower accepts (PUT /api/invite verifies a wallet
 * signature over the current ToU acknowledgement + organization name). The invitation fields are
 * echoed back exactly as the panel wrote them so the acceptance cannot mutate the admin's data.
 */
const acceptInvitationAsBorrower = async (
  account: Address,
  adminBearer: string,
) => {
  const invitation = await adminInvitationDetail(adminBearer, account)
  const { token } = await loginThroughApi(account)
  const agreement = await currentAgreement()
  const timeSigned = Date.now()
  const message = buildServiceAgreementMessage({
    acknowledgementText: agreement.acknowledgementText,
    timeSigned,
    chainId: CHAIN_ID,
    organizationName: invitation.name,
  })
  const signature = await chain.walletFor(account).signMessage({ message })
  const res = await fetch(`${APP_URL}/api/invite`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chainId: CHAIN_ID,
      address: account.toLowerCase(),
      name: invitation.name,
      alias: invitation.alias,
      description: invitation.description,
      founded: invitation.founded,
      headquarters: invitation.headquarters,
      jurisdiction: invitation.jurisdiction,
      physicalAddress: invitation.physicalAddress,
      entityKind: invitation.entityKind,
      signature,
      timeSigned,
    }),
  })
  expect(res.status, `PUT /api/invite: ${await res.text()}`).toBe(200)
  return { timeSigned, version: agreement.version }
}

// ---------- chain oracles / fixtures ----------

const isRegisteredOnChain = (account: Address) =>
  chain.publicClient.readContract({
    address: ARCH_CONTROLLER,
    abi: archAbi,
    functionName: "isRegisteredBorrower",
    args: [account],
  })

const subgraphIsRegistered = async (account: Address) =>
  (
    await gql<{ registeredBorrowers: { isRegistered: boolean }[] }>(
      `{ registeredBorrowers(where: { borrower: "${account.toLowerCase()}" }) { isRegistered } }`,
    )
  ).registeredBorrowers[0]?.isRegistered ?? false

/** Run an owner-only ArchController call as the owner itself (a contract), via impersonation. */
const asArchOwner = async (
  functionName: "registerBorrower" | "removeBorrower",
  account: Address,
) => {
  // The owner is read from the CHAIN: the SDK manifest's MockArchControllerOwner is superseded
  // on Sepolia and every call routed through it reverts (KNOWN-ISSUES M3).
  const owner = await archControllerOwner()
  await rpc("anvil_impersonateAccount", [owner])
  // 10 ETH so the impersonated contract address can pay gas.
  await rpc("anvil_setBalance", [owner, "0x8AC7230489E80000"])
  const hash = await chain.walletFor(owner).writeContract({
    address: ARCH_CONTROLLER,
    abi: archAbi,
    functionName,
    args: [account],
    gas: GAS,
  })
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  chain.recordTx(receipt, { functionName, args: [account] })
  expect(receipt.status, `${functionName} ${account}`).toBe("success")
  await rpc("anvil_stopImpersonatingAccount", [owner])
}

/** Self-clean: undo a previous run's registration. */
const deregisterBorrowerOnChain = (account: Address) =>
  asArchOwner("removeBorrower", account)

/** ADM-04's M3 workaround — see the header. Never used when the panel's own button worked. */
const registerBorrowerOnChain = (account: Address) =>
  asArchOwner("registerBorrower", account)

/** Does the address the APP registers through still hold the ArchController's ownership? */
const manifestOwnerEvidence = async (account: Address) => {
  const chainOwner = await archControllerOwner()
  let manifestPathReverts: string | null = null
  try {
    await chain.publicClient.simulateContract({
      address: MANIFEST_ARCH_OWNER,
      abi: archAbi,
      functionName: "registerBorrower",
      args: [account],
      account: ADMIN,
    })
  } catch (error) {
    manifestPathReverts = (error as Error).message.split("\n")[0] ?? "revert"
  }
  return {
    sdkManifestMockArchControllerOwner: MANIFEST_ARCH_OWNER,
    archControllerOwnerOnChain: chainOwner,
    manifestIsOwner:
      MANIFEST_ARCH_OWNER.toLowerCase() === chainOwner.toLowerCase(),
    manifestPathReverts,
  }
}

// ---------- DB oracles (SELECTs) and the single seeded row (AdminAccount) ----------

/** First result line of a -tA psql run. SELECTs print bare rows; DML additionally prints a
 *  command tag ("INSERT 0 1") AFTER any RETURNING rows — always read line one. */
const dbValue = (sql: string) => dbExec(sql).trim().split("\n")[0]?.trim() ?? ""

const dbCount = (sql: string) => Number(dbValue(sql) || "0")

const borrowerRowCounts = (account: Address) => {
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

/** Delete every artefact a previous run of THIS suite left for one of its borrowers. */
const deleteBorrowerRows = (account: Address) => {
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

const adminAccountCount = (account: Address) =>
  dbCount(
    `select count(*) from "AdminAccount" where "chainId"=${CHAIN_ID} and address='${account.toLowerCase()}'`,
  )

/** The ONLY row this suite seeds: the admin grant the panel's auth model reads (see header).
 *  Idempotent — the setup deletes first, so a crashed run cannot leave duplicates. */
const seedAdminAccount = (account: Address) => {
  const a = account.toLowerCase()
  dbExec(
    `delete from "AdminAccount" where "chainId"=${CHAIN_ID} and address='${a}';
     insert into "AdminAccount" ("chainId", address) values (${CHAIN_ID}, '${a}')`,
  )
}

const borrowerRow = (account: Address) => {
  const a = account.toLowerCase()
  const columns = [
    "name",
    "alias",
    "description",
    "founded",
    "email",
    "jurisdiction",
    "entityKind",
    "physicalAddress",
    "registeredOnChain",
    "inviter",
  ]
  const line = dbValue(
    `select b.name, b.alias, b.description, b.founded, b.email, b.jurisdiction,
            b."entityKind", b."physicalAddress", b."registeredOnChain", i.inviter
       from "Borrower" b left join "BorrowerInvitation" i
         on i."chainId"=b."chainId" and i.address=b.address
      where b."chainId"=${CHAIN_ID} and b.address='${a}'`,
  )
  const values = line.split("|")
  return Object.fromEntries(
    columns.map((column, index) => [column, values[index] ?? ""]),
  ) as Record<string, string>
}

// ---------- admin panel UI helpers ----------

/** A DataGrid row identified by unique text (the run-stamped legal name). */
const gridRow = (page: Page, text: string) =>
  page.locator(".MuiDataGrid-row").filter({ hasText: text })

const cell = (row: Locator, field: string) =>
  row.locator(`.MuiDataGrid-cell[data-field="${field}"]`)

/**
 * The fork DB carries hundreds of historical invitations/borrowers and the DataGrid both paginates
 * (100 rows) and virtualizes, so a freshly created row is NOT in the DOM by default. Sorting the
 * invited-at column descending puts this run's row first (nulls sort last in desc), which is the
 * only ordering assumption this suite makes about foreign data.
 */
const sortGridDescending = async (page: Page, headerName: string) => {
  const header = page.getByRole("columnheader", { name: headerName })
  await expect(header).toBeVisible({ timeout: 60_000 })
  // sortingOrder is ["asc","desc",null] — at most two clicks reach "descending".
  for (let i = 0; i < 3; i += 1) {
    if ((await header.getAttribute("aria-sort")) === "descending") break
    await header.click()
    await page.waitForTimeout(300)
  }
  await expect(header).toHaveAttribute("aria-sort", "descending", {
    timeout: 15_000,
  })
}

/** The JWT the app itself minted for this session, read back out of redux-persist storage.
 *  Used for the admin-only API oracles — never to fabricate access. */
const adminBearerFrom = async (page: Page) => {
  const key = `${ADMIN.toLowerCase()}_${CHAIN_ID}`
  const token = await page.evaluate((tokenKey) => {
    try {
      const raw = window.localStorage.getItem("persist:apiTokens")
      if (!raw) return null
      const outer = JSON.parse(raw) as Record<string, string>
      const inner = outer[tokenKey]
      return inner
        ? (JSON.parse(inner) as {
            token: string
            isAdmin: boolean
            address: string
            chainId: number
          })
        : null
    } catch {
      return null
    }
  }, key)
  expect(token, "admin API token persisted by the app's login").not.toBeNull()
  return token!
}

/** Connect the wallet, complete the app's login ceremony if needed, and wait for the panel. */
const openAdminPanel = async (page: Page, accountIndex = ADMIN_INDEX) => {
  await connectAs(page, accountIndex)
  await page.goto("/admin")
  await ensureConnected(page, ANVIL_ACCOUNTS[accountIndex] as Address)

  // The "Admin Panel" heading belongs to the AuthWrapper FALLBACK, so it is only on the page
  // while the session is incomplete — never assert it here; wait for whichever state applies.
  const login = page.getByRole("button", { name: "Login", exact: true })
  // The Invite button only renders once the invitations query has resolved, so it doubles as the
  // "panel is usable" signal.
  const invite = page.getByRole("button", { name: "Invite Borrower" })
  await expect(login.or(invite).first()).toBeVisible({ timeout: 60_000 })
  if (await login.isVisible()) {
    await login.click()
  }
  await expect(invite).toBeVisible({ timeout: 90_000 })
  return (await adminBearerFrom(page)).token
}

const openPendingInvitations = async (page: Page) => {
  await page.getByRole("button", { name: "Pending Invitations" }).click()
  await expect(
    page.getByRole("button", { name: "Invite Borrower" }),
  ).toBeVisible({ timeout: 60_000 })
  await sortGridDescending(page, "Invited")
}

const openRegisteredBorrowers = async (page: Page) => {
  await page.getByRole("button", { name: "Registered Borrowers" }).click()
  await expect(page.locator(".MuiDataGrid-row").first()).toBeVisible({
    timeout: 60_000,
  })
  await sortGridDescending(page, "Invited At")
}

/** react-hook-form validates these fields on BLUR — fill then Tab, or Confirm never enables. */
const fillAndBlur = async (field: Locator, value: string) => {
  await expect(field).toBeVisible({ timeout: 30_000 })
  await field.fill(value)
  await field.press("Tab")
}

/** Pick an option from one of the profile form's MUI Autocompletes (the popper is portalled to
 *  the body, so options are queried on the page, not inside the dialog). */
const pickAutocomplete = async (
  page: Page,
  field: Locator,
  optionName: string,
) => {
  await expect(field).toBeEnabled({ timeout: 30_000 })
  // Clear first: React's input value tracker swallows a fill() that does not change the value, so
  // re-typing an already-selected option (ADM-10, where the form prefills) would never open the
  // listbox. "" → optionName is always a real change.
  await field.fill("")
  await field.fill(optionName)
  const option = page
    .getByRole("option", { name: optionName, exact: true })
    .first()
  await expect(option).toBeVisible({ timeout: 30_000 })
  await option.click()
  await expect(field).toHaveValue(optionName, { timeout: 15_000 })
}

type InviteInput = {
  address: Address
  name: string
  alias: string
  description: string
  /** Legal name the form is expected to prefill with before typing starts. Set it whenever the
   *  address ALREADY has a profile (ADM-10): EditProfileForm resets every field from the fetched
   *  profile, so typing before that lands is silently overwritten. */
  prefilledName?: string
}

/** Drive the panel's "Invite Borrower" modal end to end. Returns the POST /api/invite response. */
const inviteThroughPanel = async (page: Page, input: InviteInput) => {
  const dialog = page.getByRole("dialog")
  await page.getByRole("button", { name: "Invite Borrower" }).click()
  await expect(dialog.getByText("Invite New Borrower")).toBeVisible({
    timeout: 30_000,
  })
  await expect(
    dialog.getByText("Enter borrower's details to send them an invitation."),
  ).toBeVisible()

  // The profile form is keyed on the address and only mounts once one is entered.
  await dialog.getByLabel("Wallet Address").fill(input.address)

  const legalName = dialog.getByPlaceholder("Full name of legal entity.")
  await expect(legalName).toBeVisible({ timeout: 30_000 })
  // Let the profile fetch settle first — its reset would otherwise wipe what we type.
  await expect(legalName).toHaveValue(input.prefilledName ?? "", {
    timeout: 60_000,
  })
  await fillAndBlur(legalName, input.name)
  await fillAndBlur(
    dialog.getByPlaceholder("Name by which borrower might be more well known."),
    input.alias,
  )
  await fillAndBlur(
    dialog.getByPlaceholder("Description of your business operations", {
      exact: false,
    }),
    input.description,
  )
  await fillAndBlur(
    dialog.getByPlaceholder("Year that the borrowing entity was created."),
    INVITE_FOUNDED,
  )
  await fillAndBlur(
    dialog.getByPlaceholder("Enter Location"),
    INVITE_ADDRESS_LINE,
  )
  // getByLabel would also match the field's aria-labelled tooltip icon (strict-mode violation);
  // the combobox role pins the input itself.
  await pickAutocomplete(
    page,
    dialog.getByRole("combobox", { name: "Country" }),
    INVITE_COUNTRY,
  )
  // The entity-form selector only renders once a country is chosen.
  await pickAutocomplete(
    page,
    dialog.getByRole("combobox", { name: "Entity Legal Form" }),
    INVITE_ENTITY_KIND,
  )

  const confirm = dialog.getByRole("button", { name: "Confirm", exact: true })
  await expect(confirm).toBeEnabled({ timeout: 30_000 })
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/invite") && res.request().method() === "POST",
      { timeout: 60_000 },
    ),
    confirm.click(),
  ])
  return response
}

/** Close a modal that is showing one of the FinalModals (success/error) states. */
const dismissModal = async (page: Page) => {
  const dialog = page.getByRole("dialog")
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden({ timeout: 30_000 })
}

/**
 * Click the panel's Register control and wait for the archcontroller to reflect it.
 *
 * Returns whether the APP's own path registered the borrower. On main it cannot (M3 — see the
 * header): `useRegisterTestnetBorrower` routes through the SDK manifest's superseded
 * MockArchControllerOwner and the send reverts `Unauthorized()`. The caller asserts the outcome
 * against the variant, so neither a regression on v2.5 nor a fix on main can land silently.
 */
const registerThroughPanel = async (
  page: Page,
  name: string,
  account: Address,
) => {
  const row = gridRow(page, name)
  await expect(row).toBeVisible({ timeout: 60_000 })
  const register = cell(row, "registerColumn").getByRole("button", {
    name: /register/i,
  })
  // The control exists only now that the borrower has signed (ADM-12's positive control).
  await expect(register).toBeVisible({ timeout: 60_000 })
  // `useRegisterTestnetBorrower` reports through `toastRequest` (react-hot-toast), whose toasts
  // auto-dismiss after a few seconds — long before the chain poll below finishes. Record the DOM
  // instead of reading a live node, or the outcome message is simply gone by the time we look.
  await installToastRecorder(page)
  await register.click()
  // Bounded: an anvil registration confirms in seconds, and on main the send never lands at all
  // (M3), so a long poll would only burn wall time twice per run.
  const registered = await expect
    .poll(() => isRegisteredOnChain(account), { timeout: 60_000 })
    .toBe(true)
    .then(() => true)
    .catch(() => false)
  const toasts = (await recordedToasts(page)).filter((text) =>
    /borrower|register/i.test(text),
  )
  return { registered, toasts: [...new Set(toasts)] }
}

test.describe.serial("admin panel (ADM-01…13)", () => {
  test.setTimeout(420_000)

  test("setup: clean slate for the admin identity and its two borrowers", async () => {
    // Signature ceremonies (login, ToU acceptance) are bounded against the SERVER wall clock;
    // the registration transaction is chain-side. Keep the two from drifting apart.
    await syncChainTimeToWallClock()
    const chainNow = await chain.blockTimestamp()
    const wallNow = Math.floor(Date.now() / 1000)

    for (const account of [BORROWER_A, BORROWER_B]) {
      deleteBorrowerRows(account)
      if (await isRegisteredOnChain(account)) {
        await deregisterBorrowerOnChain(account)
        await syncSubgraph()
      }
    }
    seedAdminAccount(ADMIN)

    expect(adminAccountCount(ADMIN), "seeded AdminAccount row").toBe(1)
    expect(
      adminAccountCount(STRANGER),
      "the negative-control wallet must NOT be an admin",
    ).toBe(0)
    for (const account of [BORROWER_A, BORROWER_B]) {
      expect(
        borrowerRowCounts(account),
        `clean DB rows for ${account}`,
      ).toEqual({
        borrower: 0,
        invitation: 0,
        signatures: 0,
        legacySignatures: 0,
      })
      expect(await isRegisteredOnChain(account)).toBe(false)
      expect((await inviteHead(account)).status).toBe(404)
    }
    attachAgreement("setup clean slate", {
      admin: ADMIN,
      borrowerA: BORROWER_A,
      borrowerB: BORROWER_B,
      chainLeadSeconds: chainNow - wallNow,
      archController: ARCH_CONTROLLER,
      ...(await manifestOwnerEvidence(BORROWER_A)),
    })
  })

  test("ADM-01: admin login renders the panel; a non-admin wallet is refused", async ({
    page,
    browser,
  }) => {
    // Negative control first, in its own context: the gate must be the AdminAccount row, not the
    // mere possession of a session. Logging in writes nothing to the DB.
    const strangerContext = await browser.newContext()
    try {
      const strangerPage = await strangerContext.newPage()
      await connectAs(strangerPage, STRANGER_INDEX)
      await strangerPage.goto(`${APP_URL}/admin`)
      await ensureConnected(strangerPage, STRANGER)
      const strangerLogin = strangerPage.getByRole("button", {
        name: "Login",
        exact: true,
      })
      await expect(strangerLogin).toBeVisible({ timeout: 60_000 })
      await expect(
        strangerPage.getByText(
          "Log in with your wallet to access the admin panel.",
        ),
      ).toBeVisible()
      await strangerLogin.click()
      await expect(
        strangerPage.getByText(
          "This account does not have admin access on the selected network.",
        ),
      ).toBeVisible({ timeout: 60_000 })
      await expect(
        strangerPage.getByRole("button", { name: "Invite Borrower" }),
      ).toHaveCount(0)
    } finally {
      await strangerContext.close()
    }

    await connectAs(page, ADMIN_INDEX)
    await page.goto("/admin")
    await ensureConnected(page, ADMIN)

    await step(page, "pre-login gate", async () => {
      await expect(page.getByText("Admin Panel", { exact: true })).toBeVisible({
        timeout: 60_000,
      })
      await expect(
        page.getByText("Log in with your wallet to access the admin panel."),
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Invite Borrower" }),
      ).toHaveCount(0)
    })

    await step(page, "wallet-signature login", async () => {
      await page.getByRole("button", { name: "Login", exact: true }).click()
      // Panel content replaces the gate once the JWT lands.
      await expect(
        page.getByRole("button", { name: "Invite Borrower" }),
      ).toBeVisible({ timeout: 90_000 })
      await expect(
        page.getByRole("button", { name: "Pending Invitations" }),
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Registered Borrowers" }),
      ).toBeVisible()
      // "dashboard renders with existing borrower list": the grid is populated from the DB.
      await expect(page.locator(".MuiDataGrid-row").first()).toBeVisible({
        timeout: 60_000,
      })
    })

    const issued = await adminBearerFrom(page)
    expect(issued.isAdmin, "JWT minted with admin authority").toBe(true)
    expect(issued.address).toBe(ADMIN.toLowerCase())
    expect(issued.chainId).toBe(CHAIN_ID)
    const invitations = await adminInvitations(issued.token)
    expect(
      invitations.length,
      "admin API serves the borrower list",
    ).toBeGreaterThan(0)

    await step(page, "registered borrowers section", async () => {
      await openRegisteredBorrowers(page)
      await expect(page.locator(".MuiDataGrid-row").first()).toBeVisible()
    })
    attachAgreement("ADM-01 admin session", {
      admin: ADMIN,
      isAdmin: issued.isAdmin,
      chainId: issued.chainId,
      pendingInvitations: invitations.length,
      adminAccountRows: adminAccountCount(ADMIN),
    })
  })

  test("ADM-02: inviting Borrower A creates the invitation and lists it as unsigned", async ({
    page,
  }) => {
    const bearer = await openAdminPanel(page)

    const response = await step(page, "invite Borrower A", async () =>
      inviteThroughPanel(page, {
        address: BORROWER_A,
        name: BORROWER_A_NAME,
        alias: BORROWER_A_ALIAS,
        description: INVITE_DESCRIPTION_A,
      }),
    )
    expect(response.status(), "POST /api/invite").toBe(200)

    await step(page, "invitation-sent confirmation", async () => {
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Invitation Sent")).toBeVisible({
        timeout: 60_000,
      })
      await expect(
        dialog.getByText("The invitation has been sent to the borrower."),
      ).toBeVisible()
      await expect(dialog.locator('[data-tx-status="success"]')).toBeVisible()
      await dismissModal(page)
    })

    await step(
      page,
      "row appears as invited, unsigned, unregistered",
      async () => {
        await openPendingInvitations(page)
        const row = gridRow(page, BORROWER_A_NAME)
        await expect(row).toBeVisible({ timeout: 60_000 })
        await expect(cell(row, "name")).toHaveText(BORROWER_A_NAME)
        await expect(cell(row, "alias")).toHaveText(BORROWER_A_ALIAS)
        await expect(cell(row, "address")).toContainText(
          `${BORROWER_A.slice(0, 6).toLowerCase()}...${BORROWER_A.slice(
            -4,
          ).toLowerCase()}`,
        )
        await expect(cell(row, "registeredOnChain")).toHaveText("No")
        await expect(cell(row, "timeSigned")).toHaveText("N/A")
        // "Invited" renders a relative time ("a few seconds ago").
        await expect(cell(row, "timeInvited")).toContainText(/ago$/)
      },
    )

    // Server side: exactly the two rows POST /api/invite writes, stamped with THIS admin.
    const rows = borrowerRowCounts(BORROWER_A)
    expect(rows).toEqual({
      borrower: 1,
      invitation: 1,
      signatures: 0,
      legacySignatures: 0,
    })
    const stored = borrowerRow(BORROWER_A)
    expect(stored.name).toBe(BORROWER_A_NAME)
    expect(stored.alias).toBe(BORROWER_A_ALIAS)
    expect(stored.description).toBe(INVITE_DESCRIPTION_A)
    expect(stored.founded).toBe(INVITE_FOUNDED)
    expect(stored.jurisdiction).toBe(INVITE_JURISDICTION)
    expect(stored.entityKind).toBe(INVITE_ENTITY_KIND_CODE)
    expect(stored.physicalAddress).toBe(INVITE_ADDRESS_LINE)
    expect(stored.registeredOnChain).toBe("f")
    expect(stored.inviter, "invitation attributed to the admin").toBe(
      ADMIN.toLowerCase(),
    )
    // "delivered/retrievable": no mailer exists in this build — the invitation is retrievable by
    // the invited wallet (the borrower-side journey itself is BON-02).
    expect(await inviteHead(BORROWER_A)).toEqual({
      status: 200,
      signed: "false",
    })
    const apiRow = await adminInvitationFor(bearer, BORROWER_A)
    expect(apiRow?.hasSignedServiceAgreement).toBe(false)
    expect(apiRow?.registeredOnChain).toBe(false)
    attachAgreement("ADM-02 invitation", {
      dbRows: rows,
      stored,
      adminApiRow: apiRow,
      inviteHead: await inviteHead(BORROWER_A),
    })
  })

  test("ADM-10: a second invitation for the same address is refused", async ({
    page,
  }) => {
    const bearer = await openAdminPanel(page)
    const before = await adminInvitationFor(bearer, BORROWER_A)

    // The modal prefills from the now-existing profile, so a field must differ for the form's
    // dirty check to release Confirm — the legal name, so `name` is present in the payload and
    // the request reaches the duplicate check rather than failing DTO validation.
    const response = await step(page, "re-invite the same wallet", async () =>
      inviteThroughPanel(page, {
        address: BORROWER_A,
        name: `${BORROWER_A_NAME} DUP`,
        alias: BORROWER_A_ALIAS,
        description: INVITE_DESCRIPTION_A,
        prefilledName: BORROWER_A_NAME,
      }),
    )
    expect(response.status(), "duplicate POST /api/invite").toBe(400)
    expect((await response.json()).error).toContain("already exists")

    await step(page, "panel surfaces the failure", async () => {
      const dialog = page.getByRole("dialog")
      await expect(
        dialog.getByText("An error occurred while sending the invitation."),
      ).toBeVisible({ timeout: 60_000 })
      await dismissModal(page)
    })

    // Nothing was written: still one invitation, still the original name.
    expect(borrowerRowCounts(BORROWER_A).invitation).toBe(1)
    expect(borrowerRow(BORROWER_A).name).toBe(BORROWER_A_NAME)
    const after = await adminInvitationFor(bearer, BORROWER_A)
    expect(after?.name).toBe(BORROWER_A_NAME)
    expect(after?.timeInvited).toBe(before?.timeInvited)
    attachAgreement("ADM-10 duplicate invite", {
      status: response.status(),
      nameBefore: before?.name,
      nameAfter: after?.name,
      invitationRows: borrowerRowCounts(BORROWER_A).invitation,
    })
  })

  test("ADM-12: no registration control before the borrower accepts", async ({
    page,
  }) => {
    const bearer = await openAdminPanel(page)
    await openPendingInvitations(page)

    await step(page, "unsigned row offers no Register action", async () => {
      const row = gridRow(page, BORROWER_A_NAME)
      await expect(row).toBeVisible({ timeout: 60_000 })
      await expect(cell(row, "timeSigned")).toHaveText("N/A")
      // registerColumn renders nothing at all until timeSigned is set.
      await expect(cell(row, "registerColumn").getByRole("button")).toHaveCount(
        0,
      )
      await expect(cell(row, "registerColumn")).toHaveText("")
      // The cancel action stays available — the panel is not stuck.
      await expect(
        cell(row, "cancelColumn").getByRole("button", { name: "Cancel" }),
      ).toBeVisible()
    })

    // No inconsistent state: nothing on-chain, nothing signed.
    expect(await isRegisteredOnChain(BORROWER_A)).toBe(false)
    expect(await subgraphIsRegistered(BORROWER_A)).toBe(false)
    expect(borrowerRowCounts(BORROWER_A).signatures).toBe(0)
    const apiRow = await adminInvitationFor(bearer, BORROWER_A)
    expect(apiRow?.hasSignedServiceAgreement).toBe(false)
    expect((await inviteHead(BORROWER_A)).signed).toBe("false")
    attachAgreement("ADM-12 registration gated on acceptance", {
      adminApiRow: apiRow,
      onChain: await isRegisteredOnChain(BORROWER_A),
    })
  })

  test("ADM-03: the panel reflects Borrower A's acceptance", async ({
    page,
  }) => {
    const bearer = await openAdminPanel(page)

    // The borrower's own acceptance ceremony is runsheet page 2 (BON-02/03) and is not repeated
    // here: this drives the same product APIs with a real wallet signature so the ADMIN side has
    // something to reflect.
    const accepted = await acceptInvitationAsBorrower(BORROWER_A, bearer)

    const status = await touStatus(BORROWER_A)
    expect(status.accepted?.version).toBe(accepted.version)
    expect(status.accepted?.organizationName).toBe(BORROWER_A_NAME)
    expect(status.accepted?.acceptedAt).toBe(accepted.timeSigned)
    expect(borrowerRowCounts(BORROWER_A)).toEqual({
      borrower: 1,
      invitation: 1,
      signatures: 1,
      legacySignatures: 1,
    })
    expect(await inviteHead(BORROWER_A)).toEqual({
      status: 200,
      signed: "true",
    })

    const apiRow = await adminInvitationFor(bearer, BORROWER_A)
    expect(apiRow?.hasSignedServiceAgreement, "admin API shows signed").toBe(
      true,
    )
    expect(apiRow?.timeSigned).not.toBeNull()
    expect(
      Math.abs(Date.parse(apiRow!.timeSigned!) - accepted.timeSigned),
      "acceptance timestamp served to the panel",
    ).toBeLessThan(1_000)

    await step(page, "refreshed panel shows Accepted + timestamp", async () => {
      // Fresh navigation = the refresh the runsheet asks for.
      await page.goto("/admin")
      await expect(
        page.getByRole("button", { name: "Invite Borrower" }),
      ).toBeVisible({ timeout: 90_000 })
      await openPendingInvitations(page)
      const row = gridRow(page, BORROWER_A_NAME)
      await expect(row).toBeVisible({ timeout: 60_000 })
      const signedCell = cell(row, "timeSigned")
      await expect(signedCell).not.toHaveText("N/A", { timeout: 60_000 })
      await expect(signedCell).toContainText(/ago$/)
      // The exact acceptance time is the cell's hover title.
      const title = await signedCell
        .locator("[title]")
        .first()
        .getAttribute("title")
      expect(title, "acceptance timestamp title").toBeTruthy()
      // Still not registered — acceptance alone does not whitelist.
      await expect(cell(row, "registeredOnChain")).toHaveText("No")
      attachAgreement("ADM-03 acceptance in the panel", {
        signedCellTitle: title,
        adminApiRow: apiRow,
        touStatus: status,
      })
    })
  })

  test("ADM-04: the panel registers Borrower A on the archcontroller", async ({
    page,
  }) => {
    const bearer = await openAdminPanel(page)
    await openPendingInvitations(page)
    expect(await isRegisteredOnChain(BORROWER_A)).toBe(false)

    const evidence = await manifestOwnerEvidence(BORROWER_A)
    const outcome = await step(
      page,
      "send the registration transaction",
      async () => registerThroughPanel(page, BORROWER_A_NAME, BORROWER_A),
    )
    attachAgreement("ADM-04 panel Register button (KNOWN-ISSUES M3)", {
      registeredByThePanel: outcome.registered,
      toasts: outcome.toasts,
      ...evidence,
    })
    // The APP's own registration path. It cannot work here: the SDK 3.1.17 manifest's
    // MockArchControllerOwner is not the ArchController's owner any more, so the send reverts
    // Unauthorized() (KNOWN-ISSUES M3). Asserted so a main-side fix cannot land unnoticed.
    expect(
      outcome.registered,
      "the panel's Register button cannot reach the ArchController owner on SDK 3.1.17 (KNOWN-ISSUES M3)",
    ).toBe(false)

    if (!outcome.registered) {
      // M3 workaround (fixture, not coverage): register through the chain's real owner so the
      // panel's RECONCILIATION half below still has something to reconcile.
      expect(evidence.manifestIsOwner, "M3 is the reason it failed").toBe(false)
      expect(evidence.manifestPathReverts, "M3 revert observed").not.toBeNull()
      await registerBorrowerOnChain(BORROWER_A)
      expect(await isRegisteredOnChain(BORROWER_A)).toBe(true)
    }

    await syncSubgraph()
    await expect
      .poll(() => subgraphIsRegistered(BORROWER_A), { timeout: 90_000 })
      .toBe(true)

    await step(page, "panel moves the borrower to Registered", async () => {
      // The next poll of GET /api/invite reconciles registeredOnChain and drops the row.
      await expect(gridRow(page, BORROWER_A_NAME)).toHaveCount(0, {
        timeout: 90_000,
      })
      await openRegisteredBorrowers(page)
      const row = gridRow(page, BORROWER_A_NAME)
      await expect(row).toBeVisible({ timeout: 60_000 })
      await expect(cell(row, "registeredOnChain")).toHaveText("Yes")
      await expect(cell(row, "timeSigned")).not.toHaveText("N/A")
      await expect(
        cell(row, "chainId").getByRole("button", { name: "Edit" }),
      ).toBeVisible()
    })

    expect(borrowerRow(BORROWER_A).registeredOnChain).toBe("t")
    expect(
      await adminInvitationFor(bearer, BORROWER_A),
      "registered borrowers leave the pending-invitations feed",
    ).toBeUndefined()
    expect((await inviteHead(BORROWER_A)).status).toBe(404)
    attachAgreement("ADM-04 registration", {
      onChain: await isRegisteredOnChain(BORROWER_A),
      subgraph: await subgraphIsRegistered(BORROWER_A),
      dbRegisteredFlag: borrowerRow(BORROWER_A).registeredOnChain,
      inviteHead: await inviteHead(BORROWER_A),
    })
  })

  test("ADM-05: the same invite → accept → register cycle for Borrower B", async ({
    page,
  }) => {
    const bearer = await openAdminPanel(page)

    const response = await step(page, "invite Borrower B", async () =>
      inviteThroughPanel(page, {
        address: BORROWER_B,
        name: BORROWER_B_NAME,
        alias: BORROWER_B_ALIAS,
        description: INVITE_DESCRIPTION_B,
      }),
    )
    expect(response.status(), "POST /api/invite (B)").toBe(200)
    await expect(page.getByText("Invitation Sent")).toBeVisible({
      timeout: 60_000,
    })
    await dismissModal(page)

    expect(borrowerRowCounts(BORROWER_B)).toEqual({
      borrower: 1,
      invitation: 1,
      signatures: 0,
      legacySignatures: 0,
    })
    expect(borrowerRow(BORROWER_B).inviter).toBe(ADMIN.toLowerCase())
    expect(await inviteHead(BORROWER_B)).toEqual({
      status: 200,
      signed: "false",
    })

    const accepted = await acceptInvitationAsBorrower(BORROWER_B, bearer)
    expect((await touStatus(BORROWER_B)).accepted?.organizationName).toBe(
      BORROWER_B_NAME,
    )
    expect((await inviteHead(BORROWER_B)).signed).toBe("true")

    const outcome = await step(
      page,
      "register Borrower B from the panel",
      async () => {
        await page.goto("/admin")
        await expect(
          page.getByRole("button", { name: "Invite Borrower" }),
        ).toBeVisible({ timeout: 90_000 })
        await openPendingInvitations(page)
        const row = gridRow(page, BORROWER_B_NAME)
        await expect(row).toBeVisible({ timeout: 60_000 })
        await expect(cell(row, "timeSigned")).not.toHaveText("N/A")
        return registerThroughPanel(page, BORROWER_B_NAME, BORROWER_B)
      },
    )
    // Same M3 failure as ADM-04.
    expect(
      outcome.registered,
      "the panel's Register button cannot reach the ArchController owner on SDK 3.1.17 (KNOWN-ISSUES M3)",
    ).toBe(false)
    if (!outcome.registered) await registerBorrowerOnChain(BORROWER_B)
    expect(await isRegisteredOnChain(BORROWER_B)).toBe(true)

    await syncSubgraph()
    await expect
      .poll(() => subgraphIsRegistered(BORROWER_B), { timeout: 90_000 })
      .toBe(true)

    await step(page, "Borrower B appears as registered", async () => {
      await openRegisteredBorrowers(page)
      const row = gridRow(page, BORROWER_B_NAME)
      await expect(row).toBeVisible({ timeout: 60_000 })
      await expect(cell(row, "registeredOnChain")).toHaveText("Yes")
    })
    attachAgreement("ADM-05 borrower B", {
      acceptedVersion: accepted.version,
      registeredByThePanel: outcome.registered,
      toasts: outcome.toasts,
      onChain: await isRegisteredOnChain(BORROWER_B),
      subgraph: await subgraphIsRegistered(BORROWER_B),
      dbRow: borrowerRow(BORROWER_B),
    })
  })
})
