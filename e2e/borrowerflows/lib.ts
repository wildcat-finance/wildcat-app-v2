/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { expect, type Locator, type Page } from "@playwright/test"
import type { Hex } from "viem"

import {
  accessListProviderAbi,
  borrowerMarketAbi,
  erc20TransferAbi,
  fixedTermHooksAbi,
  hooksExtrasAbi,
  hooksProviderAdminAbi,
} from "../lib/abis"
import * as chain from "../lib/chain"
import { APP_URL, gql, type Address } from "../lib/env"
import * as journal from "../lib/journal"
import { alignBrowserClockToChain, ensureConnected } from "../lib/page"

/** Anvil default account #3 — registered on-chain as a borrower on the fork. */
export const BORROWER = "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as Address
export const CHAIN_ID = 11155111

/** Fixed generous gas, mirroring lib/chain (estimation understates post-time-travel work). */
const GAS = 5_000_000n

// ---------- ABIs (v2.5 WildcatMarket borrower surface + hooks + provider) ----------
// Centralized in lib/abis.ts (shared with the report-time tx decoder); re-exported for specs.

export {
  accessListProviderAbi,
  borrowerMarketAbi,
  erc20TransferAbi,
  fixedTermHooksAbi,
  hooksExtrasAbi,
  hooksProviderAdminAbi,
}

const waitTx = async (hash: Hex, meta?: chain.TxMeta) => {
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  chain.recordTx(receipt, meta)
  if (receipt.status !== "success")
    throw new Error(
      `transaction ${hash} reverted (block ${receipt.blockNumber})`,
    )
  return receipt
}

// ---------- chain reads ----------

export const marketApr = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "annualInterestBips",
  })

export const marketReserveRatio = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "reserveRatioBips",
  })

export const marketMaxTotalSupply = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "maxTotalSupply",
  })

export const marketBorrowable = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "borrowableAssets",
  })

export const marketIsClosed = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "isClosed",
  })

export const marketScaleFactor = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "scaleFactor",
  })

export const storedLenderStatus = (hooks: Address, lender: Address) =>
  chain.publicClient.readContract({
    address: hooks,
    abi: hooksExtrasAbi,
    functionName: "getPreviousLenderStatus",
    args: [lender],
  })

/**
 * The FixedTermHooks record for a market, read from the hooks instance itself. Use this — not the
 * subgraph's `hooksConfig` — whenever a maturity change has to be PROVEN: the indexed copy only
 * catches up after `syncSubgraph()`, and asserting against it alone cannot distinguish "the write
 * landed" from "the indexer is behind".
 */
export const fixedTermHookedMarket = (hooks: Address, market: Address) =>
  chain.publicClient.readContract({
    address: hooks,
    abi: fixedTermHooksAbi,
    functionName: "getHookedMarket",
    args: [market],
  })

/** Current on-chain maturity (unix seconds) of a fixed-term market. */
export const fixedTermEndTimeOnChain = async (
  hooks: Address,
  market: Address,
) => Number((await fixedTermHookedMarket(hooks, market)).fixedTermEndTime)

/** MarketConstraintHooks mapping; returns [originalAprBips, originalRRBips, expiry]. */
export const tempExcessReserveRatio = (hooks: Address, market: Address) =>
  chain.publicClient.readContract({
    address: hooks,
    abi: hooksExtrasAbi,
    functionName: "temporaryExcessReserveRatio",
    args: [market],
  })

export const providerIsMember = (provider: Address, lender: Address) =>
  chain.publicClient.readContract({
    address: provider,
    abi: accessListProviderAbi,
    functionName: "isMember",
    args: [lender],
  })

/** Chain-side unblock (borrower = hooks administrator) — arrange hygiene for re-runs of the
 *  removal test, whose UI flow leaves the scratch member hooks-blocked. */
export const unblockFromDeposits = async (hooks: Address, lender: Address) =>
  waitTx(
    await chain.walletFor(BORROWER).writeContract({
      address: hooks,
      abi: hooksExtrasAbi,
      functionName: "unblockFromDeposits",
      args: [lender],
      gas: GAS,
    }),
    { functionName: "unblockFromDeposits", args: [lender] },
  )

/** BaseAccessControls.getLenderStatus(...).isBlockedFromDeposits — the hooks-level kill switch
 *  head's UI uses for lender removal (a borrower can always block at the hooks even for
 *  providers they don't administer; provider membership records persist by design). */
export const lenderBlockedFromDeposits = async (
  hooks: Address,
  lender: Address,
) =>
  (
    await chain.publicClient.readContract({
      address: hooks,
      abi: hooksExtrasAbi,
      functionName: "getLenderStatus",
      args: [lender],
    })
  ).isBlockedFromDeposits

// ---------- chain writes (anvil signs for its own accounts) ----------

export const borrowOnChain = async (market: Address, amount: bigint) =>
  waitTx(
    await chain.walletFor(BORROWER).writeContract({
      address: market,
      abi: borrowerMarketAbi,
      functionName: "borrow",
      args: [amount],
      gas: GAS,
    }),
    { functionName: "borrow", args: [amount] },
  )

export const repayOnChain = async (
  from: Address,
  market: Address,
  amount: bigint,
) =>
  waitTx(
    await chain.walletFor(from).writeContract({
      address: market,
      abi: borrowerMarketAbi,
      functionName: "repay",
      args: [amount],
      gas: GAS,
    }),
    { functionName: "repay", args: [amount] },
  )

export const collectFeesOnChain = async (from: Address, market: Address) =>
  waitTx(
    await chain.walletFor(from).writeContract({
      address: market,
      abi: borrowerMarketAbi,
      functionName: "collectFees",
      gas: GAS,
    }),
    { functionName: "collectFees" },
  )

/** Direct ERC-20 transfer (third-party repayment path — anyone can push assets in). */
export const erc20Transfer = async (
  from: Address,
  token: Address,
  to: Address,
  amount: bigint,
) =>
  waitTx(
    await chain.walletFor(from).writeContract({
      address: token,
      abi: erc20TransferAbi,
      functionName: "transfer",
      args: [to, amount],
      gas: GAS,
    }),
    { functionName: "transfer", args: [to, amount] },
  )

export const setMaxTotalSupplyOnChain = async (target: Address, cap: bigint) =>
  waitTx(
    await chain.walletFor(BORROWER).writeContract({
      address: target,
      abi: borrowerMarketAbi,
      functionName: "setMaxTotalSupply",
      args: [cap],
      gas: GAS,
    }),
    { functionName: "setMaxTotalSupply", args: [cap] },
  )

/** Chain-side allowlist fallback: borrower-administered AccessListRoleProvider.addMembers. */
export const addAccessListMembers = async (
  provider: Address,
  lenders: Address[],
) =>
  waitTx(
    await chain.walletFor(BORROWER).writeContract({
      address: provider,
      abi: accessListProviderAbi,
      functionName: "addMembers",
      args: [lenders],
      gas: GAS,
    }),
    { functionName: "addMembers", args: [lenders] },
  )

/**
 * Provider-side membership REVOCATION (`removeMembers`, administrator-only).
 *
 * Distinct from the app's "remove lender" flow (BOP-03b/BOP-05), which is a HOOKS-level
 * `blockFromDeposits` and leaves provider membership intact. This is the other mechanism named
 * in the v2.5 provider checkpoint: the provider stops vouching for the account, and WHEN that
 * bites depends entirely on the hook's TTL for that provider (see setRoleProviderTimeToLive).
 */
export const removeAccessListMembers = async (
  provider: Address,
  lenders: Address[],
) =>
  waitTx(
    await chain.walletFor(BORROWER).writeContract({
      address: provider,
      abi: accessListProviderAbi,
      functionName: "removeMembers",
      args: [lenders],
      gas: GAS,
    }),
    { functionName: "removeMembers", args: [lenders] },
  )

/**
 * The hook's cache window for one provider, decoded from the packed `RoleProvider` word
 * (lib/abis.ts#hooksProviderAdminAbi). TTL 0 = the pull credential is NOT cacheable, so every
 * credential-gated call re-asks the provider; TTL > 0 = answers are cached for that many seconds.
 */
export const roleProviderTimeToLive = async (
  hooks: Address,
  provider: Address,
) =>
  Number(
    (await chain.publicClient.readContract({
      address: hooks,
      abi: hooksProviderAdminAbi,
      functionName: "getRoleProvider",
      args: [provider],
    })) >> 224n,
  )

/**
 * Re-attach an already-approved provider with a new TTL (hooks administrator only). On an
 * approved provider `addRoleProvider` updates ONLY the time-to-live and emits RoleProviderUpdated
 * — membership, provider address and attachments are untouched
 * (v2.5-protocol/src/access/BaseAccessControls.sol:256-259,:316-329).
 */
export const setRoleProviderTimeToLive = async (
  hooks: Address,
  provider: Address,
  timeToLive: number,
) =>
  waitTx(
    await chain.walletFor(BORROWER).writeContract({
      address: hooks,
      abi: hooksProviderAdminAbi,
      functionName: "addRoleProvider",
      args: [provider, timeToLive],
      gas: GAS,
    }),
    { functionName: "addRoleProvider", args: [provider, timeToLive] },
  )

/**
 * BaseAccessControls.getLenderStatus — the LIVE view (:474), which re-asks the last provider and
 * then every pull provider before answering. `getPreviousLenderStatus` (storedLenderStatus above)
 * is the raw cached record and cannot distinguish "cached and still valid" from "expired but
 * refreshable"; this one can, because a lender who can no longer obtain a credential comes back
 * with `lastApprovalTimestamp === 0`.
 */
export const liveLenderStatus = (hooks: Address, lender: Address) =>
  chain.publicClient.readContract({
    address: hooks,
    abi: hooksExtrasAbi,
    functionName: "getLenderStatus",
    args: [lender],
  })

export const simulateFrom = async (params: {
  account: Address
  address: Address
  functionName: "depositUpTo" | "queueWithdrawal"
  args: readonly unknown[]
}): Promise<{ reverted: boolean; message?: string }> => {
  try {
    await chain.publicClient.simulateContract({
      account: params.account,
      address: params.address,
      abi: chain.marketAbi,
      functionName: params.functionName,
      // viem cannot narrow args for a union of function names; the ABI checks at runtime.
      args: params.args as never,
    })
    return { reverted: false }
  } catch (error) {
    return {
      reverted: true,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

// ---------- subgraph reads (fork subgraph, v2.5 schema; query roots validated live) ----------

export type BorrowerMarketRow = {
  id: string
  name: string
  symbol: string
  isClosed: boolean
  isDelinquent: boolean
  isIncurringPenalties: boolean
  scaledTotalSupply: string
  marketKind: string
  totalDeposited: string
  totalBorrowed: string
  totalRepaid: string
  totalAssets: string
  annualInterestBips: number
  reserveRatioBips: number
  maxTotalSupply: string
  protocolFeeBips: number
  pendingProtocolFees: string
  createdAt: number
  withdrawalBatchDuration: number
  originalAnnualInterestBips: number
  originalReserveRatioBips: number
  temporaryReserveRatioExpiry: number
  temporaryReserveRatioActive: boolean
  asset: { address: string; decimals: number; symbol: string }
  hooks: { id: string; kind: string; name: string } | null
  hooksConfig: {
    depositRequiresAccess: boolean
    minimumDeposit: string | null
    useOnDeposit: boolean
    fixedTermEndTime: number
    allowClosureBeforeTerm: boolean
    allowTermReduction: boolean
    allowForceBuyBacks: boolean
    periodDuration: number
    withdrawalWindowDuration: number
  } | null
}

const MARKET_FIELDS = `
  id name symbol isClosed isDelinquent isIncurringPenalties marketKind
  scaledTotalSupply totalDeposited totalBorrowed totalRepaid totalAssets
  annualInterestBips reserveRatioBips maxTotalSupply protocolFeeBips pendingProtocolFees
  createdAt withdrawalBatchDuration
  originalAnnualInterestBips originalReserveRatioBips
  temporaryReserveRatioExpiry temporaryReserveRatioActive
  asset { address decimals symbol }
  hooks { id kind name }
  hooksConfig {
    depositRequiresAccess minimumDeposit useOnDeposit fixedTermEndTime
    allowClosureBeforeTerm allowTermReduction allowForceBuyBacks
    periodDuration withdrawalWindowDuration
  }`

/** All markets deployed by the account-#3 borrower (oldest first). */
export const borrowerMarkets = async () =>
  (
    await gql<{ markets: BorrowerMarketRow[] }>(
      `{ markets(where: { borrower: "${BORROWER.toLowerCase()}" }, orderBy: createdAt, orderDirection: asc, first: 50) { ${MARKET_FIELDS} } }`,
    )
  ).markets

export const marketRow = async (id: string) =>
  (
    await gql<{ market: BorrowerMarketRow | null }>(
      `{ market(id: "${id.toLowerCase()}") { ${MARKET_FIELDS} } }`,
    )
  ).market

export const lenderHooksAccess = async (hooks: string, lender: string) =>
  (
    await gql<{
      lenderHooksAccesses: {
        id: string
        isBlockedFromDeposits: boolean
        lastApprovalTimestamp: number
        lastProvider: { id: string } | null
      }[]
    }>(
      `{ lenderHooksAccesses(where: { hooks: "${hooks.toLowerCase()}", lender: "${lender.toLowerCase()}" }) {
        id isBlockedFromDeposits lastApprovalTimestamp lastProvider { id } } }`,
    )
  ).lenderHooksAccesses[0] ?? null

export const accessGrantedRecords = async (hooks: string, lender: string) =>
  (
    await gql<{
      accountAccessGranteds: { id: string; credentialTimestamp: number }[]
    }>(
      `{ accountAccessGranteds(where: { hooks: "${hooks.toLowerCase()}", account_: { lender: "${lender.toLowerCase()}" } }, first: 20) { id credentialTimestamp } }`,
    )
  ).accountAccessGranteds

export const accessRevokedRecords = async (hooks: string, lender: string) =>
  (
    await gql<{ accountAccessRevokeds: { id: string }[] }>(
      `{ accountAccessRevokeds(where: { hooks: "${hooks.toLowerCase()}", account_: { lender: "${lender.toLowerCase()}" } }, first: 20) { id } }`,
    )
  ).accountAccessRevokeds

/** Borrower-administered access-list role providers of a hooks instance. */
export const accessListProviders = async (hooks: string) =>
  (
    await gql<{
      roleProviders: {
        providerAddress: string
        isApproved: boolean
        providerInstance: { kind: string; administrator: string | null }
      }[]
    }>(
      `{ roleProviders(where: { hooks: "${hooks.toLowerCase()}", isApproved: true }) {
        providerAddress isApproved providerInstance { kind administrator } } }`,
    )
  ).roleProviders.filter(
    (p) =>
      p.providerInstance?.kind === "ACCESS_LIST" &&
      p.providerInstance?.administrator?.toLowerCase() ===
        BORROWER.toLowerCase(),
  )

/** Indexed copy of one hooks↔provider attachment (TTL / approval / pull-provider slot). */
export const roleProviderRow = async (hooks: string, provider: string) =>
  (
    await gql<{
      roleProviders: {
        providerAddress: string
        timeToLive: string
        isApproved: boolean
        isPullProvider: boolean
        providerInstance: { kind: string; administrator: string | null }
      }[]
    }>(
      `{ roleProviders(where: { hooks: "${hooks.toLowerCase()}", providerAddress: "${provider.toLowerCase()}" }) {
        providerAddress timeToLive isApproved isPullProvider providerInstance { kind administrator } } }`,
    )
  ).roleProviders[0] ?? null

export const latestBorrowRecords = async (market: string, first = 5) =>
  (
    await gql<{
      borrows: { assetAmount: string; transactionHash: string }[]
    }>(
      `{ borrows(where: { market: "${market.toLowerCase()}" }, orderBy: eventIndex, orderDirection: desc, first: ${first}) { assetAmount transactionHash } }`,
    )
  ).borrows

export const latestRepayRecords = async (market: string, first = 5) =>
  (
    await gql<{
      debtRepaids: { assetAmount: string; from: string }[]
    }>(
      `{ debtRepaids(where: { market: "${market.toLowerCase()}" }, orderBy: eventIndex, orderDirection: desc, first: ${first}) { assetAmount from } }`,
    )
  ).debtRepaids

export const latestAprRecords = async (market: string, first = 5) =>
  (
    await gql<{
      annualInterestBipsUpdateds: {
        oldAnnualInterestBips: number
        newAnnualInterestBips: number
      }[]
    }>(
      `{ annualInterestBipsUpdateds(where: { market: "${market.toLowerCase()}" }, orderBy: blockTimestamp, orderDirection: desc, first: ${first}) { oldAnnualInterestBips newAnnualInterestBips } }`,
    )
  ).annualInterestBipsUpdateds

export const latestReserveRatioRecords = async (market: string, first = 5) =>
  (
    await gql<{
      reserveRatioBipsUpdateds: {
        oldReserveRatioBips: number
        newReserveRatioBips: number
      }[]
    }>(
      `{ reserveRatioBipsUpdateds(where: { market: "${market.toLowerCase()}" }, orderBy: blockTimestamp, orderDirection: desc, first: ${first}) { oldReserveRatioBips newReserveRatioBips } }`,
    )
  ).reserveRatioBipsUpdateds

export const latestCapacityRecords = async (market: string, first = 5) =>
  (
    await gql<{
      maxTotalSupplyUpdateds: {
        oldMaxTotalSupply: string
        newMaxTotalSupply: string
      }[]
    }>(
      `{ maxTotalSupplyUpdateds(where: { market: "${market.toLowerCase()}" }, orderBy: blockTimestamp, orderDirection: desc, first: ${first}) { oldMaxTotalSupply newMaxTotalSupply } }`,
    )
  ).maxTotalSupplyUpdateds

/** Expiry of the most recent withdrawal batch on a market (mined value, not the simulated one). */
export const latestWithdrawalBatchExpiry = async (market: string) => {
  const { withdrawalBatches } = await gql<{
    withdrawalBatches: { expiry: string }[]
  }>(
    `{ withdrawalBatches(where: { market: "${market.toLowerCase()}" }, orderBy: expiry, orderDirection: desc, first: 1) { expiry } }`,
  )
  return Number(withdrawalBatches[0]?.expiry ?? 0)
}

export const marketClosedRecords = async (market: string) =>
  (
    await gql<{ marketCloseds: { id: string; transactionHash: string }[] }>(
      `{ marketCloseds(where: { market: "${market.toLowerCase()}" }) { id transactionHash } }`,
    )
  ).marketCloseds

export const feesCollectedRecords = async (market: string) =>
  (
    await gql<{
      feesCollecteds: { feesCollected: string; feeRecipient: string | null }[]
    }>(
      `{ feesCollecteds(where: { market: "${market.toLowerCase()}" }, orderBy: blockTimestamp, orderDirection: desc, first: 5) { feesCollected feeRecipient } }`,
    )
  ).feesCollecteds

// ---------- borrower ToU (wall-clock signature API; mirror lenderflows.ensureTouSigned) ----------

// Review finding: this file had its own unguarded deep-link copy that could sign the LENDER ToU
// (the /borrower/agreement bounce) — delegate to the hardened helpers.ts ceremony instead.
export { ensureBorrowerTouSigned, gotoGatedBorrowerPath } from "./helpers"

// ---------- page helpers ----------

/** Pages whose Playwright clock is already installed (clock.install throws on a second call). */
const clockInstalled = new WeakSet<Page>()

/** Borrower market page with the browser clock aligned to chain time (installed once per page). */
export const gotoBorrowerMarket = async (page: Page, market: string) => {
  if (!clockInstalled.has(page)) {
    await alignBrowserClockToChain(page)
    clockInstalled.add(page)
  }
  const path = `/borrower/market/${market.toLowerCase()}`
  await page.goto(path)
  // /borrower/market/* is wallet-gated: a deep link races wagmi's reconnect and bounces to
  // /lender (KNOWN-ISSUES #1). Connect, then renavigate — and re-check once after the guard's
  // late post-hydration window.
  if (!page.url().includes(path)) {
    await ensureConnected(page, BORROWER)
    await page.goto(path)
  }
  await page.waitForTimeout(2_500)
  if (!page.url().includes(path)) await page.goto(path)
}

/** Switch the borrower market page's content section via the left sidebar. */
export const openBorrowerSection = async (page: Page, name: RegExp) => {
  await page.getByRole("button", { name }).first().click()
}

/** Read a data-testid anchor that carries a raw value in data-value. */
export const readAnchor = async (page: Page, testId: string) => {
  const el = page.getByTestId(testId)
  await expect(el).toBeVisible({ timeout: 30_000 })
  return {
    text: (await el.innerText()).trim(),
    raw: BigInt((await el.getAttribute("data-value")) ?? "0"),
  }
}

/** Borrower tx modals keep the SuccessModal mounted (data-tx-status=success is reliable here). */
export const waitBorrowerTxSuccess = (page: Page, timeout = 120_000) =>
  expect(page.locator('[data-tx-status="success"]').first()).toBeVisible({
    timeout,
  })

export const closeDialog = async (page: Page) => {
  const dialog = page.getByRole("dialog")
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.press("Escape")
    const hidden = await dialog
      .waitFor({ state: "hidden", timeout: 7_000 })
      .then(() => true)
      .catch(() => false)
    if (hidden) return
    // Some success views ignore Escape — try an explicit close control, then the backdrop.
    const closeBtn = dialog.getByRole("button", { name: /close|×|x$/i }).first()
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click()
    else await page.mouse.click(8, 8)
  }
  await expect(dialog).toBeHidden({ timeout: 10_000 })
}

/**
 * Borrow through the UI. The opener and the dialog footer both say "Borrow";
 * scope the second click to the dialog.
 */
export const borrowThroughUi = async (
  page: Page,
  amountUnits: string,
  opts?: { token?: Address; expectDelta?: bigint },
) => {
  const balBefore = opts?.token
    ? await chain.erc20Balance(opts.token, BORROWER)
    : 0n
  await page
    .getByRole("button", { name: /^borrow$/i })
    .first()
    .click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  await dialog.getByRole("textbox").first().fill(amountUnits)
  await dialog.getByRole("button", { name: /^borrow$/i }).click()
  const confirm = dialog.getByRole("button", { name: /^confirm$/i })
  await expect(confirm).toBeEnabled({ timeout: 30_000 })
  await confirm.click()
  await waitBorrowerTxSuccess(page)
  // DEFECT GUARD: the app's success modal does NOT check receipt.status — a borrow that reverts
  // (observed: OutOfGas from a stale gas estimate) still shows "Transaction Successful!".
  // Verify the funds actually moved so a silent revert fails loudly here.
  if (opts?.token && opts.expectDelta) {
    const received =
      (await chain.erc20Balance(opts.token, BORROWER)) - balBefore
    if (received < opts.expectDelta / 2n)
      throw new Error(
        `app showed tx success but the borrow reverted on-chain (received ${received}, expected ~${opts.expectDelta}) — defect: success modal ignores receipt.status`,
      )
  }
  await closeDialog(page)
}

/**
 * Open the Repay dialog from the Borrow & Repay section.
 * Returns the dialog locator (form step).
 */
export const openRepayDialog = async (page: Page) => {
  await page
    .getByRole("button", { name: /^repay$/i })
    .first()
    .click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  return dialog
}

/** Drive an open repay dialog (amount/tab already set) through approve → repay → success. */
export const submitRepayDialog = async (page: Page, dialog: Locator) => {
  const approve = dialog.getByRole("button", { name: /^approve$/i })
  const approved = dialog.getByRole("button", { name: /^approved$/i })
  const repay = dialog.getByRole("button", { name: /^repay$/i })
  // The Approve second-button disables itself once the allowance is sufficient. For duration-
  // based repayments the required amount CREEPS UP as interest accrues, so a just-mined approval
  // can immediately fall short again ("Approved" flips back to "Approve") — approve in a loop
  // until Repay actually enables.
  await expect(approve.or(approved).first()).toBeVisible({ timeout: 30_000 })
  for (let attempt = 0; ; attempt += 1) {
    if (await approve.isEnabled().catch(() => false)) await approve.click()
    try {
      await expect(repay).toBeEnabled({ timeout: 30_000 })
      break
    } catch (err) {
      if (attempt >= 4) throw err
    }
  }
  await repay.click()
  await waitBorrowerTxSuccess(page)
  await closeDialog(page)
}

/**
 * Adjust APR through the modal: fill percent → Confirm → acknowledge-lenders checkbox → Adjust.
 * Callers assert the on-chain/subgraph outcome.
 */
export const adjustAprThroughUi = async (page: Page, aprPercent: string) => {
  await page
    .getByRole("button", { name: /^adjust base apr$/i })
    .first()
    .click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  await dialog.getByRole("textbox").first().fill(aprPercent)
  await dialog.getByRole("button", { name: /^confirm$/i }).click()
  await dialog.getByRole("checkbox").check()
  const adjust = dialog.getByRole("button", { name: /^adjust$/i })
  await expect(adjust).toBeEnabled({ timeout: 30_000 })
  await adjust.click()
  await waitBorrowerTxSuccess(page)
  await closeDialog(page)
}

/**
 * DEFECT-5 fallback (this pin only): the app can send an APR tx with a short gas limit, revert
 * OutOfGas, and still show "Transaction Successful!" (KNOWN-ISSUES #5; fixed upstream by
 * ef28a128). After a UI APR flow, verify the on-chain effect; when the tx was eaten, record the
 * occurrence and apply the same change chain-side (the hook processes the identical path). After
 * the migration this fallback firing AT ALL is a regression signal.
 */
/** Reruns/dead-ends can leave an ACTIVE temp-ratio peg; restoring the pegged original APR routes
 * the hook's canCancel path (mapping cleared, original ratio restored) — call before any test
 * whose maths assume a fresh peg state. */
export const clearAprPeg = async (hooks: Address, market: Address) => {
  const [origApr] = await tempExcessReserveRatio(hooks, market)
  if (Number(origApr) !== 0) await setAprOnChain(market, BigInt(origApr))
}

/** DEFECT-5 fallback for market termination (same OOG-behind-success-modal class): approve a
 * dust buffer for outstanding fees, then closeMarket with generous gas. */
export const ensureMarketClosed = async (
  market: Address,
  token: Address,
  decimalsForDust: number,
) => {
  if (await marketIsClosed(market)) return
  journal.record({
    kind: "data",
    name: "defect-5 fallback (closeMarket)",
    data: { market },
  })
  const dust = 10n ** BigInt(decimalsForDust) // 1 unit covers accrued fee dust
  await chain.approve(BORROWER, token, market, dust * 100n)
  const hash = await chain.walletFor(BORROWER).writeContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "closeMarket",
    gas: 5_000_000n,
  })
  await waitTx(hash, { functionName: "closeMarket" })
}

/** DEFECT-5 fallback for capacity changes (same OOG-behind-success-modal class). */
export const ensureCapacityApplied = async (
  market: Address,
  expectedCap: bigint,
) => {
  if ((await marketMaxTotalSupply(market)) === expectedCap) return
  journal.record({
    kind: "data",
    name: "defect-5 fallback (capacity)",
    data: { market, expectedCap: expectedCap.toString() },
  })
  await setMaxTotalSupplyOnChain(market, expectedCap)
}

export const setAprOnChain = async (market: Address, bips: bigint) => {
  const rr = await marketReserveRatio(market)
  const hash = await chain.walletFor(BORROWER).writeContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "setAnnualInterestAndReserveRatioBips",
    args: [Number(bips), Number(rr)],
    gas: 5_000_000n,
  })
  await waitTx(hash)
}

export const ensureAprApplied = async (
  market: Address,
  expectedBips: bigint,
) => {
  if ((await marketApr(market)) === expectedBips) return
  journal.record({
    kind: "data",
    name: "defect-5 fallback (APR)",
    data: {
      market,
      expectedBips: expectedBips.toString(),
      note: "UI APR tx reverted (OOG) behind a success modal — applied chain-side",
    },
  })
  await setAprOnChain(market, expectedBips)
}

/** DEFECT-5 fallback for the post-expiry ratio reset: any setter call routes the hook's Expired
 * path; verify the ratio actually reset, else re-drive it chain-side. */
export const ensureRatioReset = async (market: Address, expectedRr: bigint) => {
  if ((await marketReserveRatio(market)) === expectedRr) return
  journal.record({
    kind: "data",
    name: "defect-5 fallback (ratio reset)",
    data: { market, expectedRr: expectedRr.toString() },
  })
  const apr = await marketApr(market)
  const hash = await chain.walletFor(BORROWER).writeContract({
    address: market,
    abi: borrowerMarketAbi,
    functionName: "setAnnualInterestAndReserveRatioBips",
    args: [Number(apr), Number(expectedRr)],
    gas: 5_000_000n,
  })
  await waitTx(hash)
}

// ---------- policy (lender management) helpers ----------

/** Policy page is wall-clock safe (no batch-expiry classification); plain navigation. */
export const gotoPolicyLenders = async (page: Page, hooksAddress: string) => {
  await page.goto(`/borrower/policy?policy=${encodeURIComponent(hooksAddress)}`)
  await ensureConnected(page, BORROWER)
  await page.getByRole("tab", { name: /^lenders$/i }).click()
}

/** True when the policy's Lenders tab shows the self-onboarding notice (no allowlist to edit). */
export const policyLendersTabIsSelfOnboard = async (page: Page) => {
  // Either the notice or the +Add Lender button renders once loading settles.
  const notice = page.getByText(/lenders onboard themselves/i)
  const addButton = page.getByRole("button", { name: /add lender/i })
  await expect(notice.or(addButton).first()).toBeVisible({ timeout: 30_000 })
  return notice.isVisible()
}

/** Add one lender (address + optional display name) through the AddModal (list-only; not submitted). */
export const addLenderThroughUi = async (
  page: Page,
  address: string,
  name?: string,
) => {
  await page.getByRole("button", { name: /add lender/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  const inputs = dialog.getByRole("textbox")
  await inputs.nth(0).fill(address)
  // Head (0fbe365c): the tab lists EXISTING on-chain allowlist members and the modal rejects
  // duplicates ("already added — use Edit Lender List") as soon as the address is entered —
  // check BEFORE touching the name field (the error state can drop it from the form).
  const duplicate = dialog.getByText(/already added/i)
  const add = dialog.getByRole("button", { name: /^add$/i })
  await expect(add.or(duplicate).first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(750) // debounce: the duplicate check runs after address entry settles
  if (await duplicate.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    return "already-member"
  }
  if (name) await inputs.nth(1).fill(name)
  await expect(add).toBeEnabled({ timeout: 15_000 })
  await add.click()
  await expect(dialog).toBeHidden({ timeout: 15_000 })
  return "staged"
}

/** Submit staged lender edits: Submit → confirmation dialog → Confirm → success popup. */
export const submitLenderEdits = async (page: Page) => {
  await page.getByRole("button", { name: /^submit$/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  await dialog.getByRole("button", { name: /^confirm$/i }).click()
  await expect(page.getByText(/lenders were edited/i)).toBeVisible({
    timeout: 120_000,
  })
  await closeDialog(page)
}

/** Subgraph: is the account an indexed member of the role provider (ACCESS_LIST edits)? */
export const providerMembershipIndexed = async (
  provider: string,
  account: string,
) =>
  (
    await gql<{ roleProviderMembers: { isMember: boolean }[] }>(
      `{ roleProviderMembers(where: { provider: "${provider.toLowerCase()}", account: "${account.toLowerCase()}" }) { isMember } }`,
    )
  ).roleProviderMembers.some((m) => m.isMember)

/** A lender row in the edit-lenders DataGrid (rows carry data-id = lender address). */
export const lenderRow = (page: Page, address: string) =>
  // data-id carries the CHECKSUMMED address — match case-insensitively (CSS4 "i" flag).
  page.locator(`[data-id="${address}" i]`)

/** Click the strike-through (delete) cross of a lender row (last cell's icon button). */
export const strikeLenderRow = async (page: Page, address: string) => {
  const row = lenderRow(page, address)
  await expect(row).toBeVisible({ timeout: 30_000 })
  // VERIFY: the delete cross is the only button in the row's LAST cell; the address cell's
  // copy/link buttons live in the middle cell.
  await row.locator(".MuiDataGrid-cell").last().locator("button").click()
}
