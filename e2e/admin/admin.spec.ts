/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { getDeploymentAddress } from "@wildcatfi/wildcat-sdk"
import { parseAbi } from "viem"

import { getLoginSignatureMessage } from "../../src/config/api"
import { buildServiceAgreementMessage } from "../../src/utils/serviceAgreementMessage"
import { formatServiceAgreementVersionLabel } from "../../src/utils/serviceAgreementVersions"
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
 * registration, borrower detail management, negative cases.
 * Runsheet: wildcat-uat/runsheet/uat_1 Admin.tsv.
 *
 * ── Coverage map (every runsheet row) ─────────────────────────────────────────────────
 *  ADM-01 Admin login .............. implemented — real wallet-signature login through the UI,
 *                                    plus the negative control (a non-admin wallet is refused).
 *  ADM-02 Add borrower ............. implemented — Borrower A invited through the panel's
 *                                    "Invite Borrower" modal; row + DB row + invite API asserted.
 *  ADM-03 Invitation status ........ implemented — the ADMIN side: after Borrower A accepts, the
 *                                    panel's Signed column and GET /api/invite flip. The BORROWER
 *                                    side of the ceremony is page 2 (BON-02/03) and is NOT
 *                                    duplicated: the acceptance is driven through the app's own
 *                                    public APIs with a real anvil wallet signature.
 *  ADM-04 Whitelist tx ............. implemented — the panel's Register button sends
 *                                    MockArchControllerOwner.registerBorrower; chain + subgraph +
 *                                    panel state asserted.
 *  ADM-05 Repeat for B ............. implemented — ADM-02→04 repeated for Borrower B (anvil #8).
 *  ADM-06 Add details .............. implemented — the Registered Borrowers "Edit" modal completes
 *                                    the profile (email); admin render + API + public profile.
 *  ADM-07 Edit details ............. implemented — description/founded changed again; propagation
 *                                    to the public profile is reload-polled (KNOWN-ISSUES #10).
 *  ADM-08 ToU signature view ....... implemented — the Terms of Use block on Borrower A's profile
 *                                    (accepted version + version id + acceptance time + current
 *                                    live version + acceptance certificate), cross-checked against
 *                                    the signature row (signer address) in the app DB.
 *  ADM-09 History .................. test.fixme — no history/audit surface exists in this build.
 *  ADM-10 Duplicate invite ......... implemented — a second invite for the same address is refused
 *                                    by POST /api/invite (400) and surfaced as the error modal.
 *  ADM-11 Revoke / deregister ...... test.fixme — no deregistration surface in this build.
 *  ADM-12 Invite before acceptance . implemented — before acceptance the row carries NO Register
 *                                    control; it appears only once the borrower has signed.
 *  ADM-13 ToU version bump ......... test.fixme — no ToU publishing surface in the admin panel.
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
 *  logging in writes nothing). #0–#2 (lenders), #3 (pages 3/4 borrower), #4 (page-2 Borrower B)
 *  and #5 (page-2 PRISTINE wallet) are never touched by this suite.
 *
 * ── State hygiene ────────────────────────────────────────────────────────────────────
 *  Setup (not afterAll — a crashed run must still leave a re-runnable fork) deletes the
 *  AdminAccount row and every onboarding row for #7/#8, and de-registers them on-chain via
 *  anvil impersonation of the MockArchControllerOwner. Nothing is seeded for any account another
 *  suite owns. The suite writes real invitations through the panel, so its rows are exactly the
 *  rows the setup deletes on the next run.
 *
 * ── Documented gaps in this build (not test defects) ──────────────────────────────────
 *  • The invite modal renders an Email field but InviteBorrowerModal.handleSubmit never sends it —
 *    email is only settable afterwards through the Edit modal (that is where ADM-06 sets it).
 *  • The admin profile forms pass `hideExternalLinks`, so website/twitter/telegram/linkedin/
 *    additional URLs are borrower-editable only (the "URL" half of ADM-07 is BON-08's).
 *  • No invitation email is sent anywhere in this build (no mailer): "delivered/retrievable" in
 *    ADM-02 is asserted as retrievable — HEAD /api/invite for the borrower's wallet.
 *
 * ── Concurrency ──────────────────────────────────────────────────────────────────────
 *  Sends chain transactions (borrower registration) — must not run beside another Playwright
 *  process. No time travel.
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

type ProfileResponse = {
  profile: {
    address: string
    name?: string
    alias?: string
    description?: string
    founded?: string
    email?: string
    jurisdiction?: string
    entityKind?: string
    entityKindName?: string
    physicalAddress?: string
    registeredOnChain: boolean
  } | null
}

const profileApi = async (account: Address) => {
  const res = await fetch(
    `${APP_URL}/api/profiles/${account.toLowerCase()}?chainId=${CHAIN_ID}`,
  )
  expect(res.ok, `GET /api/profiles/[address]: ${res.status}`).toBe(true)
  return ((await res.json()) as ProfileResponse).profile
}

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

/** Self-clean: undo a previous run's registration. The ArchController owner is the mock
 *  contract, so impersonate it (anvil) for the removeBorrower call. */
const deregisterBorrowerOnChain = async (account: Address) => {
  await rpc("anvil_impersonateAccount", [MOCK_ARCH_OWNER])
  // 10 ETH so the impersonated contract address can pay gas.
  await rpc("anvil_setBalance", [MOCK_ARCH_OWNER, "0x8AC7230489E80000"])
  const hash = await chain.walletFor(MOCK_ARCH_OWNER).writeContract({
    address: ARCH_CONTROLLER,
    abi: archAbi,
    functionName: "removeBorrower",
    args: [account],
    gas: GAS,
  })
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  chain.recordTx(receipt, {
    functionName: "removeBorrower",
    args: [account],
  })
  expect(receipt.status, `removeBorrower ${account}`).toBe("success")
  await rpc("anvil_stopImpersonatingAccount", [MOCK_ARCH_OWNER])
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

const signatureRow = (account: Address) => {
  const a = account.toLowerCase()
  return {
    signer: dbValue(
      `select signer from "ServiceAgreementSignature" where "chainId"=${CHAIN_ID} and address='${a}' and party='Borrower'`,
    ),
    organizationName: dbValue(
      `select "organizationName" from "ServiceAgreementSignature" where "chainId"=${CHAIN_ID} and address='${a}' and party='Borrower'`,
    ),
    version: dbValue(
      `select s.version from "ServiceAgreement" s
         join "ServiceAgreementSignature" g on g."serviceAgreementId"=s.id
        where g."chainId"=${CHAIN_ID} and g.address='${a}' and g.party='Borrower'`,
    ),
  }
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

  // The app signs the login with the browser's dayjs() clock; the server's /api/auth/login rejects
  // any timeSigned STRICTLY ahead of ITS wall clock ("Invalid signature", 400) with zero future
  // tolerance (config/api.ts getLoginSignatureMessage + LOGIN_SIGNATURE_MAX_AGE_SECONDS). A small
  // host skew — the Next server process a second or two behind the browser — therefore 400s an
  // otherwise-valid signature and leaves the "Admin Panel · Login" fallback up (observed on the
  // final board's ADM-04). A fresh click re-signs with a later timestamp the server has since
  // caught up to, so retry the ceremony a few times rather than hanging the full 90s on one bad
  // second. When the session is already complete the Invite button is up and we never click.
  for (let attempt = 0; ; attempt += 1) {
    if (await invite.isVisible().catch(() => false)) break
    if (await login.isVisible().catch(() => false)) {
      await login.click().catch(() => {})
    }
    const appeared = await invite
      .waitFor({ state: "visible", timeout: attempt < 4 ? 20_000 : 90_000 })
      .then(() => true)
      .catch(() => false)
    if (appeared || attempt >= 4) break
    // Give the server wall clock a moment to advance past the rejected timeSigned before re-signing.
    await page.waitForTimeout(1_500)
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

/** Read a ParametersItem ("<label>\n<value>") from a profile page. */
const readParameter = async (page: Page, label: string) => {
  const item = page
    .getByTestId("parameters-item")
    .filter({ hasText: label })
    .first()
  await expect(item).toBeVisible({ timeout: 60_000 })
  return (await item.innerText()).replace(label, "").trim()
}

/** "06-Sep-2026 22:37" (UTC, DATE_FORMAT_WITH_TIME) → epoch ms. */
const parseUtcDisplayTimestamp = (text: string) =>
  Date.parse(`${text.replace(/-/g, " ")} GMT`)

/**
 * KNOWN-ISSUES #10: GET /api/profiles/[address] is served `public, s-maxage=300,
 * stale-while-revalidate=600`, so the refetch right after a save can be answered with the
 * PRE-edit body and nothing refetches again. Reload-poll and report how stale it was.
 */
const reloadUntilVisible = async (
  page: Page,
  locator: Locator,
  maxReloads = 4,
) => {
  let reloads = 0
  for (;;) {
    try {
      await expect(locator).toBeVisible({ timeout: 20_000 })
      return reloads
    } catch (error) {
      if (reloads >= maxReloads) throw error
      reloads += 1
      await page.reload()
    }
  }
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

    await step(page, "send the registration transaction", async () => {
      const row = gridRow(page, BORROWER_A_NAME)
      await expect(row).toBeVisible({ timeout: 60_000 })
      const register = cell(row, "registerColumn").getByRole("button", {
        name: /register/i,
      })
      // The control exists only now that the borrower has signed (ADM-12's positive control).
      await expect(register).toBeVisible({ timeout: 60_000 })
      await register.click()
      await expect
        .poll(() => isRegisteredOnChain(BORROWER_A), { timeout: 180_000 })
        .toBe(true)
    })

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

    await step(page, "register Borrower B from the panel", async () => {
      await page.goto("/admin")
      await expect(
        page.getByRole("button", { name: "Invite Borrower" }),
      ).toBeVisible({ timeout: 90_000 })
      await openPendingInvitations(page)
      const row = gridRow(page, BORROWER_B_NAME)
      await expect(row).toBeVisible({ timeout: 60_000 })
      await expect(cell(row, "timeSigned")).not.toHaveText("N/A")
      await cell(row, "registerColumn")
        .getByRole("button", { name: /register/i })
        .click()
      await expect
        .poll(() => isRegisteredOnChain(BORROWER_B), { timeout: 180_000 })
        .toBe(true)
    })

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
      onChain: await isRegisteredOnChain(BORROWER_B),
      subgraph: await subgraphIsRegistered(BORROWER_B),
      dbRow: borrowerRow(BORROWER_B),
    })
  })

  test("ADM-06: the admin completes Borrower A's profile", async ({ page }) => {
    const email = `e2e-admin-a-${stamp}@example.com`
    await openAdminPanel(page)
    await openRegisteredBorrowers(page)

    await step(page, "edit modal prefills the stored profile", async () => {
      const row = gridRow(page, BORROWER_A_NAME)
      await expect(row).toBeVisible({ timeout: 60_000 })
      await cell(row, "chainId").getByRole("button", { name: "Edit" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Edit Borrower Profile")).toBeVisible({
        timeout: 30_000,
      })
      // Every admin-editable field renders the value the invitation stored.
      await expect(
        dialog.getByPlaceholder("Full name of legal entity."),
      ).toHaveValue(BORROWER_A_NAME, { timeout: 60_000 })
      await expect(
        dialog.getByPlaceholder(
          "Name by which borrower might be more well known.",
        ),
      ).toHaveValue(BORROWER_A_ALIAS)
      await expect(
        dialog.getByPlaceholder("Description of your business operations", {
          exact: false,
        }),
      ).toHaveValue(INVITE_DESCRIPTION_A)
      await expect(
        dialog.getByPlaceholder("Year that the borrowing entity was created."),
      ).toHaveValue(INVITE_FOUNDED)
      await expect(
        dialog.getByRole("combobox", { name: "Country" }),
      ).toHaveValue(INVITE_COUNTRY)
      await expect(
        dialog.getByRole("combobox", { name: "Entity Legal Form" }),
      ).toHaveValue(INVITE_ENTITY_KIND)
      await expect(dialog.getByPlaceholder("Enter Location")).toHaveValue(
        INVITE_ADDRESS_LINE,
      )
      // The one profile field the invite modal renders but never submits (documented gap).
      await expect(dialog.getByPlaceholder("example@domain.com")).toHaveValue(
        "",
      )
    })

    const updateResponse = await step(
      page,
      "set the missing email",
      async () => {
        const dialog = page.getByRole("dialog")
        await fillAndBlur(dialog.getByPlaceholder("example@domain.com"), email)
        const confirm = dialog.getByRole("button", {
          name: "Confirm",
          exact: true,
        })
        await expect(confirm).toBeEnabled({ timeout: 30_000 })
        const [response] = await Promise.all([
          page.waitForResponse(
            (res) =>
              res.url().includes("/api/profiles/updates") &&
              res.request().method() === "POST",
            { timeout: 60_000 },
          ),
          confirm.click(),
        ])
        await expect(dialog).toBeHidden({ timeout: 60_000 })
        return response
      },
    )
    expect(updateResponse.status(), "POST /api/profiles/updates").toBe(200)

    // Stored: the complete profile, admin-set fields included.
    const stored = borrowerRow(BORROWER_A)
    expect(stored).toMatchObject({
      name: BORROWER_A_NAME,
      alias: BORROWER_A_ALIAS,
      description: INVITE_DESCRIPTION_A,
      founded: INVITE_FOUNDED,
      email,
      jurisdiction: INVITE_JURISDICTION,
      entityKind: INVITE_ENTITY_KIND_CODE,
      physicalAddress: INVITE_ADDRESS_LINE,
      registeredOnChain: "t",
    })
    const profile = await profileApi(BORROWER_A)
    expect(profile).toMatchObject({
      name: BORROWER_A_NAME,
      alias: BORROWER_A_ALIAS,
      description: INVITE_DESCRIPTION_A,
      founded: INVITE_FOUNDED,
      email,
      jurisdiction: INVITE_JURISDICTION,
      entityKind: INVITE_ENTITY_KIND_CODE,
      entityKindName: INVITE_ENTITY_KIND,
      physicalAddress: INVITE_ADDRESS_LINE,
      registeredOnChain: true,
    })

    await step(page, "public profile renders the same values", async () => {
      await page.goto(
        `/profile/borrower/${BORROWER_A.toLowerCase()}?chainId=${CHAIN_ID}`,
      )
      await expect(page.getByText(INVITE_DESCRIPTION_A)).toBeVisible({
        timeout: 60_000,
      })
      expect(await readParameter(page, "Legal Name")).toBe(BORROWER_A_NAME)
      expect(await readParameter(page, "Alias/Trading Name")).toBe(
        BORROWER_A_ALIAS,
      )
      expect(await readParameter(page, "Entity Legal Form")).toBe(
        INVITE_ENTITY_KIND,
      )
    })
    attachAgreement("ADM-06 completed profile", { stored, profile })
  })

  test("ADM-07: admin edits persist and propagate to the public profile", async ({
    page,
  }) => {
    const description = `Edited by the page-1 admin suite at ${new Date().toISOString()} (run ${stamp}).`
    const founded = "2021"
    await openAdminPanel(page)
    await openRegisteredBorrowers(page)

    const updateResponse = await step(
      page,
      "change description and founded",
      async () => {
        const row = gridRow(page, BORROWER_A_NAME)
        await expect(row).toBeVisible({ timeout: 60_000 })
        await cell(row, "chainId").getByRole("button", { name: "Edit" }).click()
        const dialog = page.getByRole("dialog")
        const descriptionField = dialog.getByPlaceholder(
          "Description of your business operations",
          { exact: false },
        )
        // Wait for the prefill or the fetch-triggered reset would overwrite the new value.
        await expect(descriptionField).toHaveValue(INVITE_DESCRIPTION_A, {
          timeout: 60_000,
        })
        await fillAndBlur(descriptionField, description)
        await fillAndBlur(
          dialog.getByPlaceholder(
            "Year that the borrowing entity was created.",
          ),
          founded,
        )
        const confirm = dialog.getByRole("button", {
          name: "Confirm",
          exact: true,
        })
        await expect(confirm).toBeEnabled({ timeout: 30_000 })
        const [response] = await Promise.all([
          page.waitForResponse(
            (res) =>
              res.url().includes("/api/profiles/updates") &&
              res.request().method() === "POST",
            { timeout: 60_000 },
          ),
          confirm.click(),
        ])
        await expect(dialog).toBeHidden({ timeout: 60_000 })
        return response
      },
    )
    expect(updateResponse.status()).toBe(200)

    await expect
      .poll(async () => (await profileApi(BORROWER_A))?.description, {
        timeout: 60_000,
      })
      .toBe(description)
    expect(borrowerRow(BORROWER_A).founded).toBe(founded)

    await step(page, "admin re-open shows the edited values", async () => {
      // EditProfileForm is refetchOnMount:false, so re-opening the modal in the same page could
      // redisplay a stale cache entry (KNOWN-ISSUES #10). Remount from a fresh navigation, and
      // allow one retry before calling it a failure.
      for (let attempt = 0; ; attempt += 1) {
        await page.goto("/admin")
        await expect(
          page.getByRole("button", { name: "Invite Borrower" }),
        ).toBeVisible({ timeout: 90_000 })
        await openRegisteredBorrowers(page)
        const row = gridRow(page, BORROWER_A_NAME)
        await cell(row, "chainId").getByRole("button", { name: "Edit" }).click()
        const dialog = page.getByRole("dialog")
        const descriptionField = dialog.getByPlaceholder(
          "Description of your business operations",
          { exact: false },
        )
        await expect(descriptionField).not.toHaveValue("", { timeout: 60_000 })
        if ((await descriptionField.inputValue()) === description) {
          await expect(
            dialog.getByPlaceholder(
              "Year that the borrowing entity was created.",
            ),
          ).toHaveValue(founded)
          await dismissModal(page)
          break
        }
        expect(
          attempt,
          "admin edit modal kept showing the pre-edit description",
        ).toBeLessThan(1)
        await dismissModal(page)
      }
    })

    let reloads = 0
    await step(page, "public profile picks the edit up", async () => {
      await page.goto(
        `/profile/borrower/${BORROWER_A.toLowerCase()}?chainId=${CHAIN_ID}`,
      )
      // KNOWN-ISSUES #10: the profile GET is served with a public s-maxage, so the first read
      // after a save can still be the pre-edit body.
      reloads = await reloadUntilVisible(page, page.getByText(description))
      await expect(page.getByText(INVITE_DESCRIPTION_A)).toHaveCount(0)
    })
    attachAgreement("ADM-07 edit propagation (KNOWN-ISSUES #10)", {
      description,
      founded,
      reloadsUntilFreshProfile: reloads,
      staleObserved: reloads > 0,
      profile: await profileApi(BORROWER_A),
    })
  })

  test("ADM-08: Borrower A's Terms of Use signature is inspectable", async ({
    page,
  }) => {
    await openAdminPanel(page)
    const agreement = await currentAgreement()
    const status = await touStatus(BORROWER_A)
    expect(status.accepted, "acceptance recorded").not.toBeNull()

    await step(page, "open Borrower A's record", async () => {
      await page.goto(
        `/profile/borrower/${BORROWER_A.toLowerCase()}?chainId=${CHAIN_ID}`,
      )
      await expect(page.getByText("Accepted Version")).toBeVisible({
        timeout: 60_000,
      })
      // Head's KYB "How Wildcat checks this profile" modal auto-opens on first visit; while a
      // MUI Dialog is open the page behind it is aria-hidden, so every getByRole query below
      // (the download button) resolves to nothing. Dismiss via its only close affordance.
      const kybAck = page.getByRole("button", { name: /i understand/i })
      await kybAck.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {})
      if (await kybAck.isVisible().catch(() => false)) {
        await kybAck.click({ timeout: 10_000 }).catch(() => {})
        await expect(page.getByRole("dialog")).toHaveCount(0, {
          timeout: 15_000,
        })
      }
    })

    let acceptedOn = ""
    await step(page, "signed status, version and timestamp", async () => {
      const expectedLabel = formatServiceAgreementVersionLabel(
        status.accepted!.version,
      )
      expect(await readParameter(page, "Accepted Version")).toBe(expectedLabel)
      expect(await readParameter(page, "Current Live Version")).toBe(
        formatServiceAgreementVersionLabel(agreement.version),
      )
      // The raw version id is exposed via the value's MUI Tooltip, which stamps it as the
      // child's aria-label (no DOM title attribute; no hover needed — head's KYB explainer
      // modal can cover the page and intercept pointer events, so avoid pointer actions here).
      await expect(
        page.getByText(expectedLabel, { exact: true }).first(),
        "raw version id exposed as the value's accessible label",
      ).toHaveAttribute("aria-label", status.accepted!.version)

      acceptedOn = await readParameter(page, "Accepted On (UTC)")
      expect(
        Math.abs(
          parseUtcDisplayTimestamp(acceptedOn) - status.accepted!.acceptedAt,
        ),
        `displayed acceptance time "${acceptedOn}" vs stored`,
      ).toBeLessThan(120_000)

      // Signed evidence is downloadable (the certificate ZIP itself is BON-06). The ToU block
      // hydrates from its own status fetch after the profile paints — allow the full window.
      await expect(
        page.getByRole("button", { name: "Download Acceptance Certificate" }),
      ).toBeVisible({ timeout: 60_000 })
    })

    // Signing address: the record is bound to Borrower A's own wallet, both on the page (the
    // profile's Borrower Address row) and in the stored signature (signer = recovered address).
    const signature = signatureRow(BORROWER_A)
    expect(signature.signer).toBe(BORROWER_A.toLowerCase())
    expect(signature.organizationName).toBe(BORROWER_A_NAME)
    expect(signature.version).toBe(status.accepted!.version)
    expect(await readParameter(page, "Borrower Address")).toBe(
      `${BORROWER_A.slice(0, 6).toLowerCase()}...${BORROWER_A.slice(
        -4,
      ).toLowerCase()}`,
    )
    attachAgreement("ADM-08 ToU signature record", {
      displayedAcceptedOn: acceptedOn,
      status,
      signatureRow: signature,
    })
  })

  test("ADM-09: full history / audit trail for a borrower", async () => {
    test.fixme(
      true,
      "blocked: this build has no borrower history surface — the admin panel is two flat grids " +
        "(src/app/[locale]/admin/page.tsx) with no per-borrower detail view, and no endpoint " +
        "aggregates invitations + signatures + registration txs + profile edits. The evidence " +
        "exists in pieces (BorrowerInvitation.timeInvited, ServiceAgreementSignature, " +
        "Borrower.registeredBy, BorrowerProfileUpdateRequest) but nothing renders it.",
    )
  })

  test("ADM-11: revoke / deregister a borrower from the archcontroller", async () => {
    test.fixme(
      true,
      "blocked: no deregistration surface in this build — `removeBorrower` appears nowhere in " +
        "src/, and the live DB's admin-era columns (Borrower.removedFromArchController/removedAt) " +
        "are not in prisma/schema.prisma nor read by any route. Deregistration here would be a " +
        "raw chain call by the ArchController owner (a multisig in production), not an app flow; " +
        "the defaulted/deregistered market UI treatment therefore has no admin entry point.",
    )
  })

  test("ADM-13: publish a new Terms of Use version", async () => {
    test.fixme(
      true,
      "blocked: the admin panel has no ToU publishing surface — ServiceAgreement rows are seeded " +
        "outside the app. The effect of a version bump (re-sign prompts, blocked actions, " +
        "re-acceptance) is covered from the signer side by BON-09, which seeds the version " +
        "directly and restores it afterwards.",
    )
  })
})
