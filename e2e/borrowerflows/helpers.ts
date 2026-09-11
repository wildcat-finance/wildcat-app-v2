/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { expect, type Locator, type Page } from "@playwright/test"
import { getDeploymentAddress } from "@wildcatfi/wildcat-sdk"
import { parseAbi } from "viem"

import * as chain from "../lib/chain"
import {
  ANVIL_ACCOUNTS,
  APP_URL,
  dbExec,
  FORK_RPC,
  gql,
  pins,
  syncSubgraph,
  type Address,
} from "../lib/env"
import { connectAs, ensureConnected } from "../lib/page"
import { attachAgreement } from "../lib/step"

export const CHAIN_ID = 11155111

/** Anvil account #3: the borrower for pages 3/4 (registered on demand — see ensureBorrowerRegistered). */
export const borrower = ANVIL_ACCOUNTS[3] as Address
export const coLender = ANVIL_ACCOUNTS[1] as Address
export const stranger = ANVIL_ACCOUNTS[2] as Address

// ---------- the main-variant borrower: a real, pre-fork Sepolia account ----------

/**
 * MAIN ONLY. The borrower whose markets the borrower-ops suite drives on the live app.
 *
 * `main`'s borrower market page cannot render a market the fork itself created: `useGetMarket`
 * gates the whole page on `/api/market/get`, and that route builds its Apollo client from the
 * SDK's hardcoded production `SubgraphUrls` instead of the `getServerSubgraphClient` it imports —
 * so it asks GOLDSKY whether the market exists and answers `{chainId: null, market: null}` for
 * anything deployed after the fork block (KNOWN-ISSUES [main-variant] M6/M7). The fixture
 * therefore has to be a borrower whose markets existed on real Sepolia BEFORE the fork block.
 *
 * `pins.json.borrower.address` names one that owns four open pre-2.5 markets at the pin
 * (see that file). Nobody holds its key, so the suite drives it through anvil impersonation
 * (`chain.ensureImpersonated` + the connector's `anvil-impersonate-address`): transactions work,
 * message signing does not.
 */
export const MAIN_OPS_BORROWER = (pins.borrower?.address ??
  "0xe9aee885af757ff7f632000769046876814926e6") as Address

/** The borrower the OPS suite acts as: the impersonated pre-fork account. */
export const opsBorrower: Address = MAIN_OPS_BORROWER

/** What to hand `connectAs` for that borrower — its address. */
export const opsBorrowerConnect: Address = MAIN_OPS_BORROWER

/** Connect the page as the ops borrower (impersonating it on the node first). */
export const connectAsOpsBorrower = (page: Page) =>
  connectAs(page, opsBorrowerConnect)

export const OPEN_ACCESS_ROLE_PROVIDER = getDeploymentAddress(
  CHAIN_ID,
  "OpenAccessRoleProvider",
).toLowerCase()

export const BORROWER_LEGAL_NAME = "E2E Market Creation Ltd"

// ---------- chain fixture: borrower registration ----------

export const ARCH_CONTROLLER =
  "0xC003f20F2642c76B81e5e1620c6D8cdEE826408f" as const
const archAbi = parseAbi([
  "function isRegisteredBorrower(address account) view returns (bool)",
  "function registerBorrower(address borrower)",
  "function owner() view returns (address)",
])

/**
 * Testnet MockArchControllerOwner: lets any account (self-)register a borrower, and IS the
 * ArchController's owner, so removeBorrower has to be sent from it.
 *
 * Read from the chain, never from the SDK deployment manifest. SDK 3.1.17 (the main variant) still
 * names 0xa476920a…, which Sepolia has since superseded — that address is not the owner any more
 * and every call routed through it reverts. `owner()` is the ground truth in both variants; at the
 * pinned fork block it answers 0x981f1Fb406bD7a8385f9373c08Ab4c832Ed0d508.
 */
let cachedArchOwner: Address | undefined
export const archControllerOwner = async (): Promise<Address> => {
  cachedArchOwner ??= (await chain.publicClient.readContract({
    address: ARCH_CONTROLLER,
    abi: archAbi,
    functionName: "owner",
  })) as Address
  return cachedArchOwner
}

/**
 * A fork reset rolls the chain back to the PIN block, which predates account #3's borrower
 * registration — never assume it survives; (re-)register idempotently.
 */
export const ensureBorrowerRegistered = async () => {
  const registered = await chain.publicClient.readContract({
    address: ARCH_CONTROLLER,
    abi: archAbi,
    functionName: "isRegisteredBorrower",
    args: [borrower],
  })
  if (registered) return
  const hash = await chain.walletFor(borrower).writeContract({
    address: await archControllerOwner(),
    abi: archAbi,
    functionName: "registerBorrower",
    args: [borrower],
    gas: 500_000n,
  })
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  chain.recordTx(receipt, {
    functionName: "registerBorrower",
    args: [borrower],
  })
  if (receipt.status !== "success")
    throw new Error(`registerBorrower reverted (${hash})`)
  await syncSubgraph()
}

// ---------- DB fixtures ----------

/**
 * The app requires a `Borrower` profile row for (a) the borrower-party ToU signing ceremony
 * (organizationName) and (b) the MLA template fill-in (legal name / jurisdiction / entity kind).
 * Fixture only — mirrors rows the production invite flow would create.
 */
export const seedBorrowerProfile = () => {
  const addr = borrower.toLowerCase()
  dbExec(
    `insert into "Borrower"
       ("chainId", address, name, alias, jurisdiction, "physicalAddress", "entityKind", email,
        "registeredOnChain", "removedFromArchController")
     select ${CHAIN_ID}, '${addr}', '${BORROWER_LEGAL_NAME}', 'E2E MC', 'DE',
        'Teststrasse 1, 10115 Berlin', '6QQB', 'e2e-mc@example.com', true, false
     where not exists
       (select 1 from "Borrower" where "chainId"=${CHAIN_ID} and address='${addr}')`,
  )
}

/**
 * Fill in the profile fields the MLA template and the borrower-party ToU ceremony read, WITHOUT
 * renaming a borrower that already has a row.
 *
 * The main-variant fixture borrower is a real dev-DB account: it arrives with a name (LEN-14 seeds
 * one for the no-MLA market) but no jurisdiction / address / entity kind. Overwriting its name
 * would move the goalposts for the suites that already assert against it, so only empty columns
 * are filled.
 */
export const seedBorrowerProfileFields = (account: Address) => {
  const addr = account.toLowerCase()
  dbExec(
    `insert into "Borrower"
       ("chainId", address, name, alias, jurisdiction, "physicalAddress", "entityKind", email,
        "registeredOnChain", "removedFromArchController")
     select ${CHAIN_ID}, '${addr}', '${BORROWER_LEGAL_NAME}', 'E2E Ops', 'DE',
        'Teststrasse 1, 10115 Berlin', '6QQB', 'e2e-ops@example.com', true, false
     where not exists
       (select 1 from "Borrower" where "chainId"=${CHAIN_ID} and address='${addr}');
     update "Borrower" set
        name = coalesce(nullif(name, ''), '${BORROWER_LEGAL_NAME}'),
        alias = coalesce(nullif(alias, ''), 'E2E Ops'),
        jurisdiction = coalesce(nullif(jurisdiction, ''), 'DE'),
        "physicalAddress" = coalesce(nullif("physicalAddress", ''), 'Teststrasse 1, 10115 Berlin'),
        "entityKind" = coalesce(nullif("entityKind", ''), '6QQB'),
        email = coalesce(nullif(email, ''), 'e2e-ops@example.com'),
        "registeredOnChain" = true,
        "removedFromArchController" = false
      where "chainId"=${CHAIN_ID} and address='${addr}'`,
  )
}

/**
 * Record a borrower-party acceptance of the CURRENT ToU version directly in the DB.
 *
 * This is the fallback for an IMPERSONATED borrower: `/borrower/agreement` asks the wallet to
 * `personal_sign`, and anvil answers "No Signer available" for an account it holds no key for
 * (see `chain.ensureImpersonated`). The row is byte-shaped like the one the API writes; only the
 * signature itself is a placeholder, and nothing in the app re-verifies a stored signature — the
 * gate reads `ServiceAgreementSignature` by (chainId, address, party, serviceAgreementId).
 *
 * Idempotent. Fixture only; never used on v2.5, where the ceremony is driven through the UI.
 */
export const seedBorrowerTouSignature = (account: Address) => {
  const addr = account.toLowerCase()
  dbExec(
    `insert into "ServiceAgreementSignature"
       ("chainId", address, signer, party, "serviceAgreementId", signature, kind, "timeSigned",
        "organizationName", "signedMessage")
     select ${CHAIN_ID}, '${addr}', '${addr}', 'Borrower', s.id,
        '0xe2e0000000000000000000000000000000000000000000000000000000000000' ||
        '000000000000000000000000000000000000000000000000000000000000001b',
        'ECDSA', now(), b.name, 'e2e fixture: impersonated borrower cannot personal_sign'
       from "ServiceAgreement" s
       left join "Borrower" b on b."chainId"=${CHAIN_ID} and b.address='${addr}'
      where s."isCurrent" = true
        and not exists (
          select 1 from "ServiceAgreementSignature" g
           where g."chainId"=${CHAIN_ID} and g.address='${addr}'
             and g.party='Borrower' and g."serviceAgreementId"=s.id
        )`,
  )
}

/** Remove the seeded borrower ToU acceptance (used to restore the pre-run state). */
export const clearBorrowerTouSignature = (account: Address) => {
  const addr = account.toLowerCase()
  dbExec(
    `delete from "ServiceAgreementSignature"
      where "chainId"=${CHAIN_ID} and address='${addr}' and party='Borrower'`,
  )
}

/**
 * Record a borrower MLA REFUSAL for a market, so the borrower market page leaves its
 * "Select MLA Settings" lead banner (which hides every borrower section until an MLA choice
 * exists). Same signing constraint as the ToU: the impersonated borrower cannot sign, so the
 * choice is seeded. No-op when the market already carries an MLA record or a refusal.
 */
export const seedMlaRefusal = (market: string, account: Address) => {
  const m = market.toLowerCase()
  const addr = account.toLowerCase()
  dbExec(
    `insert into "RefusalToAssignMla"
       ("chainId", market, address, signer, signature, "timeSigned", kind)
     select ${CHAIN_ID}, '${m}', '${addr}', '${addr}',
        '0xe2e0000000000000000000000000000000000000000000000000000000000000' ||
        '000000000000000000000000000000000000000000000000000000000000001b',
        now(), 'ECDSA'
      where not exists (select 1 from "RefusalToAssignMla" where "chainId"=${CHAIN_ID} and market='${m}')
        and not exists (select 1 from "MasterLoanAgreement" where "chainId"=${CHAIN_ID} and market='${m}')`,
  )
}

/** Markets that already carry an MLA record or a refusal (either unblocks the market page). */
export const marketsWithMlaChoice = (markets: string[]) => {
  if (markets.length === 0) return new Set<string>()
  const list = markets.map((m) => `'${m.toLowerCase()}'`).join(",")
  const rows = dbExec(
    `select market from "RefusalToAssignMla" where "chainId"=${CHAIN_ID} and market in (${list})
     union
     select market from "MasterLoanAgreement" where "chainId"=${CHAIN_ID} and market in (${list})`,
  )
  return new Set(
    rows
      .split("\n")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean),
  )
}

// ---------- API oracles ----------

export const borrowerTouState = async (account: Address = borrower) => {
  const res = await fetch(
    `${APP_URL}/api/sla/${account}?chainId=${CHAIN_ID}&party=Borrower`,
  )
  expect(res.ok, `GET /api/sla Borrower: ${res.status}`).toBe(true)
  return ((await res.json()) as { state: string }).state
}

/**
 * Wallet-gated borrower routes (NO_WALLET_RESTRICTED_PATHS in useNetworkGate) race wagmi's
 * reconnect: on a deep link the guard sees no address yet and bounces to "/" → /lender — where the
 * lender ToU gate can then swallow the ceremony entirely (candidate app defect: a deep-linked
 * agreement page is lost during wallet reconnection). Connect first, then renavigate.
 */
export const gotoGatedBorrowerPath = async (
  page: Page,
  path: string,
  account: Address = borrower,
) => {
  await page.goto(path)
  await ensureConnected(page, account)
  if (!page.url().includes(path)) await page.goto(path)
  await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")), {
    timeout: 15_000,
  })
  // LATE bounce: the guard can still fire a few seconds after load (post-hydration re-evaluation
  // with a momentarily-undefined address). Give it its window, then re-check once.
  await page.waitForTimeout(2_500)
  if (!page.url().includes(path)) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")), {
      timeout: 15_000,
    })
  }
}

/**
 * Borrower-party ToU acceptance (wall-clock ceremony: the API bounds timeSigned against the
 * server clock, so this page is navigated plainly — no chain-clock alignment).
 * A registered borrower with no pending invitation gets the first-acceptance
 * "Sign Terms of Use" button on /borrower/agreement.
 */
export const ensureBorrowerTouSigned = async (page: Page) => {
  if ((await borrowerTouState()) === "signedCurrent") return
  // KNOWN-ISSUES #1 (app defect, deliberately NOT patched on this branch): the no-wallet guard can
  // bounce this deep link to /lender/agreement at any moment before the click, where a
  // similarly-labeled button signs the LENDER ToU instead. Full outer retry: navigate, verify we
  // are STILL on the borrower ceremony right before clicking, and require the borrower state to
  // actually flip — otherwise renavigate and try again.
  const sign = page
    .getByRole("button", { name: /^sign (and continue|terms of use)$/i })
    .first()
  for (let attempt = 0; ; attempt += 1) {
    await gotoGatedBorrowerPath(page, "/borrower/agreement")
    await expect(sign).toBeVisible({ timeout: 60_000 })
    // Enabling needs wagmi's async walletClient; a mount can miss it — renavigate re-runs the hook.
    const enabled = await expect(sign)
      .toBeEnabled({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false)
    if (!enabled) {
      if (attempt >= 4) throw new Error("ToU sign button never enabled")
      continue
    }
    if (!page.url().includes("/borrower/agreement")) continue // bounced since nav — retry
    await sign.click()
    const flipped = await expect
      .poll(borrowerTouState, { timeout: 30_000 })
      .toBe("signedCurrent")
      .then(() => true)
      .catch(() => false)
    if (flipped) break
    if (attempt >= 4)
      throw new Error(
        "borrower ToU signing did not stick after retries — deep-link bounce likely signed the LENDER ceremony (KNOWN-ISSUES #1)",
      )
  }
}

/**
 * Ensure the ops borrower can PROVE acceptance of the current ToU.
 *
 * The ops borrower is impersonated and cannot `personal_sign`, so the acceptance is seeded and
 * only its API oracle is asserted — the ceremony itself stays covered by page 2's onboarding
 * suite (anvil accounts).
 */
export const ensureOpsBorrowerTouSigned = async () => {
  if ((await borrowerTouState(opsBorrower)) === "signedCurrent") return
  seedBorrowerTouSignature(opsBorrower)
  expect(
    await borrowerTouState(opsBorrower),
    "seeded borrower ToU acceptance visible through /api/sla",
  ).toBe("signedCurrent")
}

// ---------- chain oracles ----------

/** v2.5 WildcatMarket views used to audit freshly deployed markets. */
export const newMarketAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function asset() view returns (address)",
  "function borrower() view returns (address)",
  "function annualInterestBips() view returns (uint256)",
  "function delinquencyFeeBips() view returns (uint256)",
  "function reserveRatioBips() view returns (uint256)",
  "function delinquencyGracePeriod() view returns (uint256)",
  "function withdrawalBatchDuration() view returns (uint256)",
  "function maxTotalSupply() view returns (uint256)",
])

export const erc20MetaAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
])

const read = <T>(address: Address, functionName: string) =>
  chain.publicClient.readContract({
    address,
    abi: newMarketAbi,
    functionName: functionName as never,
  }) as unknown as Promise<T>

export const readNewMarket = async (market: Address) => ({
  name: await read<string>(market, "name"),
  symbol: await read<string>(market, "symbol"),
  asset: (await read<string>(market, "asset")) as Address,
  borrower: await read<string>(market, "borrower"),
  annualInterestBips: await read<bigint>(market, "annualInterestBips"),
  delinquencyFeeBips: await read<bigint>(market, "delinquencyFeeBips"),
  reserveRatioBips: await read<bigint>(market, "reserveRatioBips"),
  delinquencyGracePeriod: await read<bigint>(market, "delinquencyGracePeriod"),
  withdrawalBatchDuration: await read<bigint>(
    market,
    "withdrawalBatchDuration",
  ),
  maxTotalSupply: await read<bigint>(market, "maxTotalSupply"),
})

/** The market's ERC-4626 wrapper on the V2.1 wrapper factory, or the zero address. */
export const wrapperForMarket = async (market: Address): Promise<Address> => {
  // Local requires: the SDK's contracts are ethers-based; the rest of the suite is on viem.
  /* eslint-disable global-require, @typescript-eslint/no-var-requires */
  const { ethers } = require("ethers")
  const { getWrapperFactoryContract } = require("@wildcatfi/wildcat-sdk")
  /* eslint-enable global-require, @typescript-eslint/no-var-requires */
  const provider = new ethers.providers.JsonRpcProvider(FORK_RPC)
  const factory = getWrapperFactoryContract(CHAIN_ID, provider)
  const wrapper: string = await factory.wrapperForMarket(market)
  return wrapper.toLowerCase() as Address
}

export const erc20Meta = async (token: Address) => ({
  name: (await chain.publicClient.readContract({
    address: token,
    abi: erc20MetaAbi,
    functionName: "name",
  })) as string,
  symbol: (await chain.publicClient.readContract({
    address: token,
    abi: erc20MetaAbi,
    functionName: "symbol",
  })) as string,
  decimals: (await chain.publicClient.readContract({
    address: token,
    abi: erc20MetaAbi,
    functionName: "decimals",
  })) as number,
})

export const getCode = (address: Address) =>
  chain.publicClient.getBytecode({ address })

// ---------- subgraph oracles ----------

export type NewMarketRow = {
  id: string
  name: string
  symbol: string
  annualInterestBips: number
  delinquencyFeeBips: number
  reserveRatioBips: number
  delinquencyGracePeriod: number
  withdrawalBatchDuration: number
  asset: { address: string; name: string; symbol: string; decimals: number }
  hooks: { id: string; name: string; kind: string } | null
  hooksConfig: {
    depositRequiresAccess: boolean
    queueWithdrawalRequiresAccess: boolean
    transferRequiresAccess: boolean
    transfersDisabled: boolean
    minimumDeposit: string | null
    fixedTermEndTime: number | null
    allowClosureBeforeTerm: boolean | null
    allowTermReduction: boolean | null
    firstWithdrawalWindowStart: number | null
    periodDuration: number | null
    withdrawalWindowDuration: number | null
  } | null
}

const MARKET_FIELDS = `
  id name symbol
  annualInterestBips delinquencyFeeBips reserveRatioBips
  delinquencyGracePeriod withdrawalBatchDuration
  asset { address name symbol decimals }
  hooks { id name kind }
  hooksConfig {
    depositRequiresAccess queueWithdrawalRequiresAccess transferRequiresAccess
    transfersDisabled minimumDeposit
    fixedTermEndTime allowClosureBeforeTerm allowTermReduction
    firstWithdrawalWindowStart periodDuration withdrawalWindowDuration
  }`

export const borrowerMarkets = async (owner: Address = borrower) =>
  (
    await gql<{ markets: NewMarketRow[] }>(
      `{ markets(first: 100, where: { borrower: "${owner.toLowerCase()}" }) { ${MARKET_FIELDS} } }`,
    )
  ).markets

export const borrowerMarketIds = async (owner: Address = borrower) =>
  (await borrowerMarkets(owner)).map((m) => m.id)

export const subgraphMarket = async (id: string) =>
  (
    await gql<{ market: NewMarketRow | null }>(
      `{ market(id: "${id.toLowerCase()}") { ${MARKET_FIELDS} } }`,
    )
  ).market

export type HooksInstanceRow = {
  id: string
  name: string
  kind: string
  markets: { id: string }[]
  providers: {
    providerAddress: string
    isPullProvider: boolean
    isApproved: boolean
  }[]
} | null

export const hooksInstance = async (id: string) =>
  (
    await gql<{ hooksInstance: HooksInstanceRow }>(
      `{ hooksInstance(id: "${id.toLowerCase()}") {
        id name kind markets { id } providers { providerAddress isPullProvider isApproved } } }`,
    )
  ).hooksInstance

/** Does the policy carry an active non-access-list pull provider (i.e. lender self-onboarding)? */
export const hasOpenAccessProvider = (
  instance: NonNullable<HooksInstanceRow>,
) =>
  instance.providers.some(
    (p) =>
      p.isPullProvider &&
      p.providerAddress.toLowerCase() === OPEN_ACCESS_ROLE_PROVIDER,
  )

// ---------- create-market form driving ----------

/**
 * Deepest container holding both the given (exact) label text and a control of the given role.
 * The create-market forms wrap every control in an InputLabel/HorizontalInputLabel box, and
 * several controls share placeholder-derived accessible names ("Please Select", "0 - 100"),
 * so label-scoped lookup is the only stable addressing scheme without new testids.
 */
export const controlIn = (
  page: Page,
  label: string,
  role: "combobox" | "textbox" | "checkbox",
) =>
  page
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ has: page.getByRole(role) })
    .last()
    .getByRole(role)
    .first()

export const selectField = async (
  page: Page,
  label: string,
  option: string | RegExp,
) => {
  await controlIn(page, label, "combobox").click()
  const item = page.getByRole("option", { name: option }).first()
  await expect(item).toBeVisible({ timeout: 30_000 })
  await item.click()
}

export const fillField = async (page: Page, label: string, value: string) => {
  const control = controlIn(page, label, "textbox")
  await control.fill(value)
  // react-hook-form validates the numeric fields onBlur; make that deterministic.
  await control.blur().catch(() => undefined)
}

export const setSwitch = async (page: Page, label: string, on: boolean) => {
  const control = controlIn(page, label, "checkbox")
  if ((await control.isChecked()) !== on) await control.click()
}

/** MUI section-based date/datetime fields consume plain digit keystrokes section by section. */
export const typeDateDigits = async (input: Locator, digits: string) => {
  await input.click()
  // VERIFY: MUI DateField section entry — digits fill DD→MM→YYYY(→HH→mm) in order.
  await input.pressSequentially(digits, { delay: 50 })
}

export const nextButton = (page: Page) =>
  page.getByRole("button", { name: "Next", exact: true })

export const clickNext = async (page: Page) => {
  await expect(nextButton(page)).toBeEnabled({ timeout: 30_000 })
  await nextButton(page).click()
}

export const deployButton = (page: Page) =>
  page.getByRole("button", { name: "Deploy Market" })

/**
 * Return to the Confirmation step from an earlier one.
 *
 * The sidebar is a CHAIN: each form enables only the step after it (`MarketPolicyForm` -> BASIC,
 * `MLAForm` -> MLA, …), so stepping back re-runs that form's effect and leaves Confirmation
 * disabled — clicking it waits on "element is not enabled" until the test times out (measured:
 * MKT-10 burning its full 540 s). The way forward is Next.
 */
export const gotoConfirmation = async (page: Page) => {
  for (
    let i = 0;
    i < 6 &&
    !(await deployButton(page)
      .isVisible()
      .catch(() => false));
    i += 1
  ) {
    // eslint-disable-next-line no-await-in-loop
    await clickNext(page)
  }
  await expect(deployButton(page)).toBeVisible({ timeout: 30_000 })
}

export const gotoCreateMarket = async (page: Page) => {
  // Wall-clock page on purpose: the ToU/MLA APIs bound timeSigned against the server clock.
  // Enter via the dashboard CTA (client-side nav): a DEEP LINK server-renders the wizard, the
  // hydration mismatch remounts the app ~10s in, and the no-wallet guard race then bounces the
  // browser to /lender mid-interaction (observed in the MKT-01 trace at t=105s).
  // After a fork reset the CTA appears only once the subgraph has indexed the borrower's fresh
  // registration and the dashboard has refetched — sync and poll with reloads.
  await syncSubgraph()
  const cta = page.getByRole("button", { name: "+ Create New Market" })
  await expect(async () => {
    await gotoGatedBorrowerPath(page, "/borrower")
    await expect(cta).toBeVisible({ timeout: 20_000 })
    await expect(cta).toBeEnabled({ timeout: 10_000 })
  }).toPass({ timeout: 180_000 })
  await cta.click()
  // The CTA click can land pre-hydration (Link-wrapped Button on head); with the wagmi cookie
  // pre-seed a direct deep link is bounce-safe, so fall back to it rather than re-clicking.
  const navigated = await page
    .waitForURL(/\/borrower\/create-market/, { timeout: 10_000 })
    .then(() => true)
    .catch(() => false)
  if (!navigated) await page.goto("/borrower/create-market")
  await expect(page).toHaveURL(/\/borrower\/create-market/, {
    timeout: 30_000,
  })
  // The sidebar step button concatenates its number ("1Market Policy").
  await expect(
    page.getByRole("button", { name: /Market Policy/ }).first(),
  ).toBeVisible({ timeout: 60_000 })
}

export type CreateMarketConfig = {
  policy:
    | { kind: "new"; name: string }
    | { kind: "existing"; name: string | RegExp }
  implementation: "Standard" | "Revolving"
  /** Ignored (auto-derived) when reusing an existing policy. */
  term?: "Open Term Loan" | "Fixed Term Loan" | "Periodic Term Loan"
  access?: "Lender Self-Onboarding" | "Borrower Operated Allowlist"
  fixedTerm?: {
    dateDigits: string // DDMMYYYY
    earlyTermination?: boolean
    maturityReduction?: boolean
  }
  periodic?: {
    unit: "Days" | "Hours" | "Minutes"
    startDigits: string // DDMMYYYYHHmm
    period: string // in the chosen unit
    window: string // in the chosen unit
  }
  namePrefix: string
  symbolPrefix: string
  asset: { address: string; name: string; symbol: string }
  financial: {
    capacity: string
    apr: string
    penalty: string
    reserve: string
    commitmentFee?: string
    grace: string
    cycle: string
    minimumDeposit?: string
  }
  deployWrapper?: boolean
}

export const fillPolicyStep = async (page: Page, cfg: CreateMarketConfig) => {
  const newPolicy = cfg.policy.kind === "new"
  /**
   * MAIN ONLY — field ORDER is load-bearing here. See KNOWN-ISSUES [main-variant] M8.
   *
   * `useNewMarketHooksData` picks the hooks template in a `useEffect` that READS `marketType` but
   * lists only `[hooksData, policyValue]` as its dependencies. `marketType` defaults to `""`, and
   * the effect's test is `marketType === "standard" ? OpenTerm : FixedTerm` — so the moment
   * "Create New Policy" is chosen the template latches to **FixedTermHooks**, and picking
   * "Open Term Loan" afterwards never re-runs the effect. The deploy then goes through
   * `FixedTermHooksTemplate.previewDeployMarket` with no maturity and dies on
   * `invalid BigNumber value (value=undefined)` — M5, for an OPEN TERM market.
   *
   * The type select is enabled while no policy is chosen (`disableFields` is false for
   * `policyWatch === ""`), so setting the type FIRST makes the effect read the right value when it
   * does fire. That is a workaround for an app defect, not a preference: `mainflows/
   * market-creation-order.spec.ts` MKT-M01 drives the natural order and asserts it still fails.
   */
  if (newPolicy) {
    await selectField(page, "Market Type", cfg.term ?? "Open Term Loan")
  }
  await selectField(
    page,
    "Market Policy",
    cfg.policy.kind === "new" ? "Create New Policy" : cfg.policy.name,
  )
  if (cfg.policy.kind === "new") {
    await fillField(page, "Policy Name", cfg.policy.name)
  }
  // There is ONE select here: "Market Type" IS the term (Open Term Loan / Fixed Term Loan) —
  // there is no implementation axis because there are no revolving markets, and no "Market Term"
  // field. The whole group is disabled once an existing policy is picked, so only touch it for a
  // new policy.
  if (newPolicy) {
    await selectField(
      page,
      "Access Control",
      cfg.access ?? "Lender Self-Onboarding",
    )
  }
  if (cfg.fixedTerm) {
    // DesktopDatePicker text field is labeled with the date-format hint.
    const input = page.getByRole("textbox", { name: /e\.g\. 25\/12\/2024$/ })
    await typeDateDigits(input, cfg.fixedTerm.dateDigits)
    await setSwitch(
      page,
      "Permit Early Termination",
      !!cfg.fixedTerm.earlyTermination,
    )
    await setSwitch(
      page,
      "Permit Maturity Reduction",
      !!cfg.fixedTerm.maturityReduction,
    )
  }
  if (cfg.periodic) {
    await page
      .getByRole("button", { name: cfg.periodic.unit, exact: true })
      .click()
    const start = page.getByRole("textbox", {
      name: /e\.g\. 25\/12\/2024 14:30 UTC/,
    })
    await typeDateDigits(start, cfg.periodic.startDigits)
    await fillField(page, "Withdrawal Period", cfg.periodic.period)
    await fillField(page, "Withdrawal Window", cfg.periodic.window)
  }
}

export const fillBasicStep = async (page: Page, cfg: CreateMarketConfig) => {
  // The Autocomplete input carries role=combobox; paste the address, pick the resolved option.
  const assetInput = controlIn(page, "Underlying Asset", "combobox")
  await assetInput.click()
  await assetInput.fill(cfg.asset.address)
  await page
    .getByRole("option", { name: new RegExp(cfg.asset.name, "i") })
    .first()
    .click()
  // Wait for the lens metadata round-trip (the preview lines render from tokenAsset).
  await expect(page.getByText(/Underlying Asset Address: 0x/i)).toContainText(
    new RegExp(cfg.asset.address, "i"),
    { timeout: 30_000 },
  )
  await fillField(page, "Market Token Name", cfg.namePrefix)
  await fillField(page, "Market Token Symbol", cfg.symbolPrefix)
}

export const fillFinancialStep = async (
  page: Page,
  cfg: CreateMarketConfig,
) => {
  const aprLabel =
    cfg.implementation === "Revolving" ? "Utilization APR" : "Base APR"
  await fillField(page, "Maximum Borrowing Capacity", cfg.financial.capacity)
  await fillField(page, aprLabel, cfg.financial.apr)
  await fillField(page, "Penalty APR", cfg.financial.penalty)
  await fillField(page, "Reserve Ratio", cfg.financial.reserve)
  if (cfg.financial.commitmentFee !== undefined) {
    await fillField(page, "Commitment Fee", cfg.financial.commitmentFee)
  }
  await fillField(page, "Grace Period Duration", cfg.financial.grace)
  await fillField(page, "Withdrawal Cycle Duration", cfg.financial.cycle)
  if (cfg.financial.minimumDeposit !== undefined) {
    await fillField(page, "Minimum Deposit", cfg.financial.minimumDeposit)
  }
}

export const fillWrapperStep = async (page: Page, cfg: CreateMarketConfig) => {
  await setSwitch(
    page,
    "Deploy wrapper contract for this market",
    !!cfg.deployWrapper,
  )
}

export const chooseMla = async (
  page: Page,
  mla: "refusal" | { template: string },
) => {
  const option =
    mla === "refusal"
      ? page.getByRole("radio", { name: /Don.t Use/ })
      : page.getByRole("radio", { name: mla.template })
  await expect(option).toBeVisible({ timeout: 30_000 })
  await option.check()
  // Next stays disabled while templates load; clickNext waits for enabled.
}

/** Walk the whole wizard up to (and including landing on) the Confirmation step. */
export const walkToConfirmation = async (
  page: Page,
  cfg: CreateMarketConfig,
  mla: "refusal" | { template: string },
) => {
  await fillPolicyStep(page, cfg)
  await clickNext(page) // -> Basic Market Setup (fillBasicStep waits for the asset field)
  await fillBasicStep(page, cfg)
  await clickNext(page) // -> Basic Market Terms (fillFinancialStep waits for the capacity field)
  await fillFinancialStep(page, cfg)
  await clickNext(page) // -> Lender Restrictions (defaults kept)
  // Wait for the step to mount before clicking its own Next (the sidebar shares step titles,
  // so a step-unique control is the only reliable mount signal).
  await expect(controlIn(page, "Restrict Withdrawals", "checkbox")).toBeVisible(
    { timeout: 30_000 },
  )
  await clickNext(page) // -> Wrapper (fillWrapperStep waits for the switch)
  await fillWrapperStep(page, cfg)
  await clickNext(page) // -> Loan Agreement (chooseMla waits for the radio group)
  await chooseMla(page, mla)
  await clickNext(page) // -> Confirmation
  await expect(deployButton(page)).toBeVisible({ timeout: 30_000 })
}

/** Value line of a ConfirmationFormItem ("LABEL\nVALUE"). */
export const reviewValue = async (page: Page, label: string) => {
  const box = page
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .last()
  const lines = (await box.innerText())
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  return lines[lines.length - 1] ?? ""
}

export const signMlaRefusal = async (page: Page) => {
  const sign = page.getByRole("button", { name: "Sign MLA Refusal" })
  await expect(sign).toBeEnabled({ timeout: 30_000 })
  // Head gates signing on async deploy readiness (signing-draft machine, 5ec10f25): a click that
  // lands before the deployable hooks template / signer resolve error-toasts "Market signing is
  // not ready. Please try again." WITHOUT signing, and the button stays enabled. Do what the
  // toast says — retry — and require the deploy gate (same readiness + a signature) to open.
  for (let attempt = 0; ; attempt += 1) {
    if (await sign.isEnabled().catch(() => false)) {
      await sign.click({ timeout: 5_000 }).catch(() => undefined)
    }
    const unlocked = await expect(deployButton(page))
      .toBeEnabled({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false)
    if (unlocked) return
    if (attempt >= 3)
      throw new Error(
        "Deploy Market never unlocked after signing the MLA refusal",
      )
  }
}

/** Open the signing MLA modal ("Sign"), sign inside it, wait for deploy to unlock. */
export const signMlaThroughModal = async (page: Page) => {
  const open = page.getByRole("button", { name: "Sign", exact: true })
  const signMla = page.getByRole("button", { name: "Sign MLA", exact: true })
  await expect(open).toBeEnabled({ timeout: 60_000 })
  // Same readiness gate as signMlaRefusal (5ec10f25): a too-early "Sign MLA" click error-toasts
  // and leaves the modal open, so retry the whole open->sign sequence until deploy unlocks.
  for (let attempt = 0; ; attempt += 1) {
    if (await open.isEnabled().catch(() => false)) {
      await open.click({ timeout: 5_000 }).catch(() => undefined)
      await expect(signMla)
        .toBeVisible({ timeout: 15_000 })
        .catch(() => undefined)
    }
    if (await signMla.isVisible().catch(() => false)) {
      await expect(signMla).toBeEnabled({ timeout: 60_000 })
      await signMla.click({ timeout: 5_000 }).catch(() => undefined)
    }
    const unlocked = await expect(deployButton(page))
      .toBeEnabled({ timeout: 40_000 })
      .then(() => true)
      .catch(() => false)
    if (unlocked) return
    if (attempt >= 2)
      throw new Error("Deploy Market never unlocked after signing the MLA")
  }
}

// ---------- deploy observation ----------

type ToastWindow = Window & {
  e2eToastLog?: string[]
  e2eToastObserver?: MutationObserver
}

/** Record every DOM node added under body — deploy step toasts are transient (react-hot-toast). */
export const installToastRecorder = (page: Page) =>
  page.evaluate(() => {
    const w = window as ToastWindow
    if (w.e2eToastObserver) {
      w.e2eToastLog = []
      return
    }
    w.e2eToastLog = []
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          const text = node.textContent ?? ""
          if (text.trim()) w.e2eToastLog!.push(text.trim())
        })
        // Toast promise updates swap text in place (pending -> success).
        if (mutation.type === "characterData") {
          const text = mutation.target.textContent ?? ""
          if (text.trim()) w.e2eToastLog!.push(text.trim())
        }
      })
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    w.e2eToastObserver = observer
  })

export const recordedToasts = (page: Page) =>
  page.evaluate(() => (window as ToastWindow).e2eToastLog ?? [])

/**
 * react-hot-toast pauses a toast's dismissal timer while the pointer hovers it, and on head the
 * bottom-center toast stack overlaps the deploy dialog's exit button (create-market layout
 * rework, c60933ab). A click that keeps re-hovering the toast deadlocks: the toast never expires
 * and keeps intercepting pointer events (observed: 8 min of click retries on MKT-02). Park the
 * pointer away and let the stack drain before clicking anything near the bottom-center.
 */
export const drainToasts = async (page: Page) => {
  await page.mouse.move(1, 1)
  await expect(page.locator('div[role="status"]'))
    .toHaveCount(0, { timeout: 30_000 })
    .catch(() => undefined)
}

export type DeployOutcome = {
  market: Address
  hooks: string
  indexingLagMs: number
  toasts: string[]
}

/**
 * Capture what a failing deploy actually said.
 *
 * `useDeployV2Market` surfaces nothing but a generic "Oops! Something went wrong!" modal; its only
 * diagnostic is `onError(error) { console.log(error) }`. KNOWN-ISSUES [main-variant] M5 was filed
 * from that bare line — `invalid BigNumber value (value=undefined)` — with no frame to blame it
 * on. Resolving the console argument as a real Error object gives the STACK, which names the call
 * that received the undefined, and page errors / failed requests bracket it.
 *
 * Listeners only; no app code is touched.
 */
export type DeployDiagnostics = {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
}

const describeConsoleArg = (handle: {
  evaluate: (fn: (v: unknown) => string) => Promise<string>
}) =>
  handle
    .evaluate((v: unknown) => {
      if (v instanceof Error)
        return `${v.name}: ${v.message}\n${v.stack ?? "<no stack>"}`
      if (v && typeof v === "object") {
        try {
          return JSON.stringify(v)
        } catch {
          return Object.prototype.toString.call(v)
        }
      }
      return String(v)
    })
    .catch(() => "<console argument no longer resolvable>")

export const captureDeployDiagnostics = (page: Page) => {
  const settled: Promise<void>[] = []
  const diagnostics: DeployDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  }
  const onConsole = (msg: {
    type: () => string
    text: () => string
    args: () => { evaluate: (fn: (v: unknown) => string) => Promise<string> }[]
  }) => {
    if (!/^(error|warning|log)$/.test(msg.type())) return
    settled.push(
      (async () => {
        const parts = await Promise.all(msg.args().map(describeConsoleArg))
        const text = parts.join(" ").trim() || msg.text()
        // The mutation logs its own successes too; keep only what reads like a failure.
        if (/error|invalid|failed|undefined|revert/i.test(text))
          diagnostics.consoleErrors.push(`[${msg.type()}] ${text}`)
      })(),
    )
  }
  const onPageError = (error: Error) =>
    diagnostics.pageErrors.push(`${error.message}\n${error.stack ?? ""}`)
  const onResponse = (res: { status: () => number; url: () => string }) => {
    if (res.status() >= 400)
      diagnostics.failedRequests.push(`${res.status()} ${res.url()}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = page as any
  p.on("console", onConsole)
  p.on("pageerror", onPageError)
  p.on("response", onResponse)
  return {
    diagnostics,
    stop: async () => {
      p.off("console", onConsole)
      p.off("pageerror", onPageError)
      p.off("response", onResponse)
      await Promise.all(settled)
      return diagnostics
    },
  }
}

/**
 * Click Deploy Market on the confirmation step and wait through the staged deploy to the
 * success dialog, then resolve the new market from the fork subgraph (diff against `before`).
 */
export const deployAndAwait = async (
  page: Page,
  before: Set<string>,
): Promise<DeployOutcome> => {
  await installToastRecorder(page)
  // The signing toast can still cover the footer Deploy button — same hover-pause trap as
  // closeSuccessDialog (see drainToasts).
  await drainToasts(page)
  const capture = captureDeployDiagnostics(page)
  await deployButton(page).click()
  try {
    await expect(page.getByText("Market created!")).toBeVisible({
      timeout: 200_000,
    })
  } catch (error) {
    // M5 evidence: the app's only error surface plus everything the page said while failing.
    attachAgreement("deploy failure diagnostics", {
      ...(await capture.stop()),
      toasts: await recordedToasts(page),
      modal: await page
        .getByRole("dialog")
        .innerText()
        .catch(() => ""),
    })
    throw error
  }
  await capture.stop()
  const deployedAt = Date.now()
  let market: string | undefined
  await expect
    .poll(
      async () => {
        await syncSubgraph()
        const ids = await borrowerMarketIds()
        market = ids.find((id) => !before.has(id))
        return market
      },
      { timeout: 120_000, message: "new market indexed by the fork subgraph" },
    )
    .toBeTruthy()
  const row = await subgraphMarket(market!)
  expect(row, "indexed market row").not.toBeNull()
  const toasts = await recordedToasts(page)
  return {
    market: market as Address,
    hooks: row!.hooks?.id ?? "",
    indexingLagMs: Date.now() - deployedAt,
    toasts,
  }
}

/** Leave the success dialog via its only exit and land on the borrower overview. */
export const closeSuccessDialog = async (page: Page) => {
  await drainToasts(page)
  await page.getByRole("button", { name: "Go To Market Overview" }).click()
  await page.waitForURL(/\/borrower(\/)?$/, { timeout: 30_000 })
}

// ---------- date helpers (chain-aware) ----------

export const pad2 = (n: number) => String(n).padStart(2, "0")

/** DDMMYYYY digits for the fixed-term date picker, `days` ahead of the later of wall/chain time. */
export const fixedTermDateDigits = async (days: number) => {
  const chainNow = await chain.blockTimestamp()
  const base = Math.max(Date.now(), chainNow * 1000)
  const d = new Date(base + days * 86_400_000)
  return {
    digits: `${pad2(d.getUTCDate())}${pad2(
      d.getUTCMonth() + 1,
    )}${d.getUTCFullYear()}`,
    // The picker stores 00:00 UTC of the chosen calendar day.
    expectedUnix:
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000,
  }
}

/** DDMMYYYYHHmm digits for the periodic first-window picker, `minutes` ahead of wall/chain time. */
export const periodicStartDigits = async (minutes: number) => {
  const chainNow = await chain.blockTimestamp()
  const base = Math.max(Date.now(), chainNow * 1000)
  const d = new Date(base + minutes * 60_000)
  return {
    digits:
      `${pad2(d.getUTCDate())}${pad2(
        d.getUTCMonth() + 1,
      )}${d.getUTCFullYear()}` +
      `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}`,
    expectedUnix:
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
      ) / 1000,
  }
}
