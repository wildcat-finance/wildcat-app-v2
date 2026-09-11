/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { expect, type Locator, type Page } from "@playwright/test"
import { formatUnits, parseUnits, type Hex } from "viem"

import { erc4626Abi, marketExtrasAbi } from "../lib/abis"
import * as chain from "../lib/chain"
import {
  ANVIL_ACCOUNTS,
  APP_URL,
  advanceTime,
  faucet,
  gql,
  pins,
  type Address,
} from "../lib/env"
import { ensureConnected } from "../lib/page"
import * as subgraph from "../lib/subgraph"

export const CHAIN_ID = 11155111

/** pins.markets is typed narrowly in lib/env; the pin file carries the full lender-flow set. */
export const pinnedMarkets = (
  pins as unknown as {
    markets: {
      openTerm: string
      periodic: string
      mla: string
      noMla: string
      fixedTerm: string
      wrapperMarket: string
      wrapper: string
      transferOpen: string
      transferDisabled: string
      transferRestricted: string
    }
  }
).markets

export const account0 = ANVIL_ACCOUNTS[0] as Address
export const account1 = ANVIL_ACCOUNTS[1] as Address
export const account2 = ANVIL_ACCOUNTS[2] as Address

/** Fixed generous gas, mirroring lib/chain: estimation runs against the pre-time-travel block. */
const GAS = 5_000_000n

/** Market extras + wrapper ERC-4626 views — centralized in lib/abis.ts; re-exported for specs. */
export { erc4626Abi, marketExtrasAbi }

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

export const marketTotalAssets = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketExtrasAbi,
    functionName: "totalAssets",
  })

export const marketTotalDebts = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketExtrasAbi,
    functionName: "totalDebts",
  })

export const marketTotalSupply = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketExtrasAbi,
    functionName: "totalSupply",
  })

export const marketMaxTotalSupply = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketExtrasAbi,
    functionName: "maxTotalSupply",
  })

export const marketScaledBalance = (market: Address, owner: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketExtrasAbi,
    functionName: "scaledBalanceOf",
    args: [owner],
  })

export const unpaidBatchExpiries = async (market: Address) =>
  (
    await chain.publicClient.readContract({
      address: market,
      abi: marketExtrasAbi,
      functionName: "getUnpaidBatchExpiries",
    })
  ).map(Number)

export const wrapperShares = (wrapper: Address, owner: Address) =>
  chain.publicClient.readContract({
    address: wrapper,
    abi: erc4626Abi,
    functionName: "balanceOf",
    args: [owner],
  })

export const wrapperConvertToAssets = (wrapper: Address, shares: bigint) =>
  chain.publicClient.readContract({
    address: wrapper,
    abi: erc4626Abi,
    functionName: "convertToAssets",
    args: [shares],
  })

export const wrapperMaxWithdraw = (wrapper: Address, owner: Address) =>
  chain.publicClient.readContract({
    address: wrapper,
    abi: erc4626Abi,
    functionName: "maxWithdraw",
    args: [owner],
  })

// ---------- chain writes (anvil signs for its own accounts) ----------

export const transferMarketTokens = async (
  from: Address,
  market: Address,
  to: Address,
  amount: bigint,
) =>
  waitTx(
    await chain.walletFor(from).writeContract({
      address: market,
      abi: marketExtrasAbi,
      functionName: "transfer",
      args: [to, amount],
      gas: GAS,
    }),
    { functionName: "transfer", args: [to, amount] },
  )

/** Queue the lender's ENTIRE live balance (balance-independent primitive; no stale-read dust). */
export const queueFullWithdrawal = async (from: Address, market: Address) => {
  const { result: expiry, request } = await chain.publicClient.simulateContract(
    {
      account: from,
      address: market,
      abi: marketExtrasAbi,
      functionName: "queueFullWithdrawal",
    },
  )
  await waitTx(
    await chain.walletFor(from).writeContract({ ...request, gas: GAS }),
    { functionName: "queueFullWithdrawal" },
  )
  return Number(expiry)
}

/** Anyone can repay market debt; available liquidity then services the unpaid FIFO queue. */
export const repayAndProcessUnpaidBatches = async (
  from: Address,
  market: Address,
  amount: bigint,
  maxBatches: bigint,
) =>
  waitTx(
    await chain.walletFor(from).writeContract({
      address: market,
      abi: marketExtrasAbi,
      functionName: "repayAndProcessUnpaidWithdrawalBatches",
      args: [amount, maxBatches],
      gas: GAS,
    }),
    {
      functionName: "repayAndProcessUnpaidWithdrawalBatches",
      args: [amount, maxBatches],
    },
  )

/** eth_call simulation only — nothing is sent, so revert checks leave no trace on the shared fork. */
export const simulateMarketWrite = async (params: {
  account: Address
  market: Address
  functionName: "transfer" | "repayAndProcessUnpaidWithdrawalBatches"
  args: readonly unknown[]
}): Promise<{ reverted: boolean; message?: string }> => {
  try {
    await chain.publicClient.simulateContract({
      account: params.account,
      address: params.market,
      abi: marketExtrasAbi,
      functionName: params.functionName,
      // viem cannot narrow args for a union of function names; the ABI still checks at runtime.
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

export const simulateDeposit = async (params: {
  account: Address
  market: Address
  amount: bigint
}): Promise<{ reverted: boolean; message?: string }> => {
  try {
    await chain.publicClient.simulateContract({
      account: params.account,
      address: params.market,
      abi: chain.marketAbi,
      functionName: "depositUpTo",
      args: [params.amount],
    })
    return { reverted: false }
  } catch (error) {
    return {
      reverted: true,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

// ---------- state hygiene ----------

/**
 * Claim any leftover withdrawal batches this lender has on the market (previous runs).
 * Unpaid batches are only claimable for their paid portion; anything still owed stays in the
 * FIFO unpaid queue and is handled by `settleUnpaidBatches`.
 */
export const selfCleanWithdrawals = async (
  account: Address,
  market: Address,
) => {
  for (const oldExpiry of await subgraph.openWithdrawalExpiries(
    market,
    account,
  )) {
    const now = await chain.blockTimestamp()
    if (now <= oldExpiry) await advanceTime(oldExpiry - now + 1)
    await chain.updateState(account, market)
    const available = await chain.getAvailableWithdrawalAmount(
      market,
      account,
      oldExpiry,
    )
    if (available > 0n)
      await chain.executeWithdrawal(account, market, account, oldExpiry)
  }
}

/**
 * Clear the market's unpaid withdrawal batch queue by repaying the outstanding deficit from
 * `funder` (any address may repay). Leaves at most `bufferUnits` of excess liquidity behind.
 */
export const settleUnpaidBatches = async (
  funder: Address,
  market: Address,
  token: Address,
  decimals: number,
  bufferUnits = "2",
) => {
  const unpaid = await unpaidBatchExpiries(market)
  if (unpaid.length === 0) return
  const assets = await marketTotalAssets(market)
  const debts = await marketTotalDebts(market)
  const deficit = debts > assets ? debts - assets : 0n
  const amount = deficit + parseUnits(bufferUnits, decimals)
  faucet(funder, amount, token)
  await chain.approve(funder, token, market, amount)
  await repayAndProcessUnpaidBatches(
    funder,
    market,
    amount,
    BigInt(unpaid.length + 1),
  )
}

// ---------- subgraph helpers ----------

/** Find the single open (incomplete) withdrawal batch this lender has on the market. */
export const findOpenBatchExpiry = async (
  market: Address,
  account: Address,
  cycle: number,
) => {
  const ts = await chain.blockTimestamp()
  const candidates = await gql<{ withdrawalBatches: { expiry: string }[] }>(
    `{ withdrawalBatches(where: { market: "${market}", expiry_gte: ${
      ts - cycle * 4
    } }, orderBy: expiry, orderDirection: desc, first: 10) { expiry } }`,
  )
  const found: number[] = []
  for (const b of candidates.withdrawalBatches) {
    const st = await subgraph.lenderWithdrawalStatus(
      market,
      Number(b.expiry),
      account,
    )
    // A status can stay formally incomplete over a few wei of scale-factor rounding after a
    // full claim; only a materially-outstanding request counts as "open" here.
    const remaining = st
      ? BigInt(st.totalNormalizedRequests) -
        BigInt(st.normalizedAmountWithdrawn)
      : 0n
    if (st && !st.isCompleted && remaining > 100n) found.push(Number(b.expiry))
  }
  expect(found.length, "exactly one open batch for this lender").toBe(1)
  return found[0]
}

export type TransferConfig = {
  transferRequiresAccess: boolean
  transfersDisabled: boolean
  depositRequiresAccess: boolean
  minimumDeposit: string | null
}

export const transferConfig = async (market: Address) => {
  const r = await gql<{
    market: { hooksConfig: TransferConfig | null } | null
  }>(
    `{ market(id: "${market}") { hooksConfig {
      transferRequiresAccess transfersDisabled depositRequiresAccess minimumDeposit } } }`,
  )
  return r.market?.hooksConfig ?? null
}

export type PeriodicConfig = {
  firstWithdrawalWindowStart: number
  periodDuration: number
  withdrawalWindowDuration: number
  periodicTermClosed: boolean
  fixedTermEndTime: number
}

export const hooksTimingConfig = async (market: Address) => {
  const r = await gql<{
    market: { hooksConfig: PeriodicConfig | null } | null
  }>(
    `{ market(id: "${market}") { hooksConfig {
      firstWithdrawalWindowStart periodDuration withdrawalWindowDuration periodicTermClosed fixedTermEndTime } } }`,
  )
  return r.market?.hooksConfig ?? null
}

export const marketApr = async (market: Address) => {
  const r = await gql<{ market: { annualInterestBips: number } | null }>(
    `{ market(id: "${market}") { annualInterestBips } }`,
  )
  expect(r.market, "market exists on the fork subgraph").not.toBeNull()
  return BigInt(r.market!.annualInterestBips)
}

// ---------- fixed-term fixture resolution (LEN-35) ----------

/** Anvil account #3 — the borrower the page-3 creation suite deploys E2E markets as. */
const E2E_BORROWER = "0x90f79bf6eb2c4f870365e785982e1f101e93b906"

export type FixedTermFixture = {
  market: Address
  name: string
  fixedTermEndTime: number
  asset: Address
  decimals: number
  cycle: number
  minimumDeposit: bigint
  /** Where it came from — reported so a run says which market it actually proved. */
  source: "e2e" | "pinned"
}

/**
 * The fixed-term market the LEN-35 pair runs on, freshest fixture first.
 *
 * LEN-35's two halves pull in opposite directions: the lock must be asserted while the term is
 * still OPEN, and the post-maturity half must travel past it — one way, permanently, on a fork
 * every other suite shares. So the fixture is CHOSEN at run time rather than pinned:
 *
 *   1. a market the page-3 suite deployed for THIS board (MKT-04): guaranteed unmatured, and its
 *      weeks-long term keeps the final phase's one-way jump small;
 *   2. otherwise `pins.markets.fixedTerm`, the harness's long-lived fixed-term market.
 *
 * The board-deployed fixed-term arm (arm 1) CAN fire on main: MKT-04 deploys `E2E MC4 …` under
 * anvil #3 through main's own factory, with the maturity set, so it never hits M5's undefined-
 * `fixedTermEndTime` crash — and main's subgraph indexes it like any other market. Whether arm 1
 * actually fires depends on whether the page-3 suite has run this board; when it has not (or the
 * market it deployed no longer qualifies), this branch falls back to the pinned fixture (arm 2),
 * which is the honest fallback rather than a borrowed one.
 *
 * Only those two sources. The fork carries dozens of real pre-fork fixed-term markets whose
 * deposit access, MLA state and borrower rows nobody has verified; picking one at random would
 * turn a lock assertion into a fixture lottery. Markets already closed, already matured, or
 * maturing inside `marginSeconds` are rejected — a lock that expires mid-test proves nothing.
 * Returns `null` when nothing qualifies, so the caller can skip with an honest reason.
 *
 * `allowMatured` inverts that last rule for the ONE caller that wants the opposite: the
 * post-maturity half in `e2e/zz-final-phase/`. An already-matured market is not a degraded
 * fixture there, it is the ideal one — the jump it needs is zero. Without this, re-running the
 * final phase on a fork it has already advanced would skip past the fixture it just matured and
 * travel to the NEXT one, so every re-run cost another leap of chain time. Because candidates
 * are sorted by ascending maturity, "already matured" sorts first automatically and the cheapest
 * jump is always chosen.
 */
export const resolveFixedTermFixture = async (
  nowSeconds: number,
  marginSeconds = 3_600,
  allowMatured = false,
): Promise<FixedTermFixture | null> => {
  type Row = {
    id: string
    name: string
    isClosed: boolean
    withdrawalBatchDuration: number
    asset: { address: string; decimals: number }
    hooks: { kind: string } | null
    hooksConfig: {
      fixedTermEndTime: number | null
      minimumDeposit: string | null
      periodDuration: number | null
    } | null
  }
  const FIELDS = `id name isClosed withdrawalBatchDuration
      asset { address decimals }
      hooks { kind }
      hooksConfig { fixedTermEndTime minimumDeposit periodDuration }`
  const { markets: e2e } = await gql<{ markets: Row[] }>(
    `{ markets(first: 100, where: { borrower: "${E2E_BORROWER}" }) { ${FIELDS} } }`,
  )
  const { market: pinned } = await gql<{ market: Row | null }>(
    `{ market(id: "${pinnedMarkets.fixedTerm.toLowerCase()}") { ${FIELDS} } }`,
  )

  const usable = (m: Row) =>
    !m.isClosed &&
    m.hooks?.kind === "FixedTerm" &&
    (m.hooksConfig?.periodDuration ?? 0) === 0 &&
    (m.hooksConfig?.fixedTermEndTime ?? 0) > 0 &&
    (allowMatured ||
      (m.hooksConfig?.fixedTermEndTime ?? 0) > nowSeconds + marginSeconds)

  const toFixture = (m: Row, source: "e2e" | "pinned"): FixedTermFixture => ({
    market: m.id.toLowerCase() as Address,
    name: m.name,
    fixedTermEndTime: Number(m.hooksConfig!.fixedTermEndTime),
    asset: m.asset.address as Address,
    decimals: m.asset.decimals,
    cycle: Number(m.withdrawalBatchDuration),
    minimumDeposit: BigInt(m.hooksConfig?.minimumDeposit ?? "0"),
    source,
  })

  // Soonest qualifying maturity wins: it is the cheapest one-way jump for the final phase.
  const [freshest] = e2e
    .filter(usable)
    .sort(
      (a, b) =>
        (a.hooksConfig?.fixedTermEndTime ?? 0) -
        (b.hooksConfig?.fixedTermEndTime ?? 0),
    )
  if (freshest) return toFixture(freshest, "e2e")
  if (pinned && usable(pinned)) return toFixture(pinned, "pinned")
  return null
}

// ---------- schedule math (mirrors src/utils/periodicWithdrawalWindow.ts) ----------

export const periodicTiming = (cfg: PeriodicConfig, nowSec: number) => {
  const start = cfg.firstWithdrawalWindowStart
  const period = cfg.periodDuration
  const windowDuration = cfg.withdrawalWindowDuration
  if (nowSec < start)
    return {
      isOpen: false,
      currentWindowEnd: undefined,
      nextWindowStart: start,
    }
  const into = (nowSec - start) % period
  const currentPeriodStart = nowSec - into
  const isOpen = into < windowDuration
  return {
    isOpen,
    currentWindowEnd: isOpen ? currentPeriodStart + windowDuration : undefined,
    nextWindowStart: currentPeriodStart + period,
  }
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** Mirrors formatPeriodicWithdrawalWindowStart: dayjs "D MMM YYYY, HH:mm [UTC]". */
export const formatWindowStart = (ts: number) => {
  const d = new Date(ts * 1000)
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mm = String(d.getUTCMinutes()).padStart(2, "0")
  return `${d.getUTCDate()} ${
    MONTHS[d.getUTCMonth()]
  } ${d.getUTCFullYear()}, ${hh}:${mm} UTC`
}

// ---------- amounts ----------

/** Format a raw amount for a UI amount field, rounded DOWN to `places` decimals. */
export const formatAmountForInput = (
  raw: bigint,
  decimals: number,
  places = 5,
) => {
  const s = formatUnits(raw, decimals)
  const [whole, frac = ""] = s.split(".")
  const cut = frac.slice(0, places).replace(/0+$/, "")
  return cut.length > 0 ? `${whole}.${cut}` : whole
}

export const absDiff = (a: bigint, b: bigint) => (a > b ? a - b : b - a)

// ---------- UI flows ----------

/**
 * ToU / acknowledgement API routes bound the client-sent timeSigned against the SERVER wall clock,
 * while other specs time travel the chain — so these signature helpers navigate with the browser's
 * real wall clock (plain page.goto; NO chain-clock alignment).
 */
export const ensureTouSigned = async (
  page: Page,
  account: Address,
  connectMarket: string,
) => {
  const slaUrl = `${APP_URL}/api/sla/${account}?chainId=${CHAIN_ID}&party=Lender`
  const touState = async () =>
    ((await (await fetch(slaUrl)).json()) as { state: string }).state
  if ((await touState()) === "signedCurrent") return
  await page.goto(`/lender/market/${connectMarket.toLowerCase()}`)
  await ensureConnected(page, account)
  await page.goto("/lender/agreement")
  const sign = page.getByRole("button", { name: /^sign/i }).first()
  await expect(sign).toBeVisible({ timeout: 30_000 })
  await sign.click()
  await expect.poll(touState, { timeout: 60_000 }).toBe("signedCurrent")
}

/** First deposit into a no-MLA market requires a signed acknowledgement (wall-clock page). */
export const ensureNoMlaAcknowledged = async (
  page: Page,
  account: Address,
  market: string,
) => {
  const ackUrl = `${APP_URL}/api/mla/${market.toLowerCase()}/acknowledgement?chainId=${CHAIN_ID}&lenderAddress=${account.toLowerCase()}`
  // The two variants answer "not acknowledged" differently: v2.5 returns 200 `null` (deliberately
  // nullable so the legal gate's presence check is not a console error), main returns 404
  // `{error}`. A body-only null check therefore reads main's 404 body as a RECORD and makes this
  // helper a silent no-op — which is why the acknowledgement modal reappeared at the first UI
  // deposit on main. Require a 2xx AND a body that is neither null nor an error envelope.
  const acknowledged = async () => {
    const res = await fetch(ackUrl)
    if (!res.ok) return false
    const body = (await res.json().catch(() => null)) as {
      error?: string
    } | null
    return body !== null && body.error === undefined
  }
  if (await acknowledged()) return
  await page.goto(`/lender/market/${market.toLowerCase()}`)
  await ensureConnected(page, account)
  await page
    .getByRole("button", { name: /^deposit$/i })
    .first()
    .click()
  const acknowledge = page.getByRole("button", { name: /^acknowledge$/i })
  await expect(acknowledge).toBeVisible({ timeout: 30_000 })
  await expect(acknowledge).toBeEnabled({ timeout: 30_000 })
  await acknowledge.click()
  await expect.poll(acknowledged, { timeout: 60_000 }).toBe(true)
  await page.keyboard.press("Escape")
}

/**
 * Switch the market page's content section via the left sidebar.
 *
 * The lender market page OWNS the selection: an effect re-dispatches
 * setSection(STATUS | TRANSACTIONS) every time the access inputs settle —
 * src/app/[locale]/lender/market/[address]/page.tsx:201-211 — and the sidebar
 * collapses to skeletons whenever that page pushes isLoading into the routing
 * slice (page.tsx:197-199 -> components/Sidebar/LenderMarketSidebar/index.tsx:
 * 39-41, 69-89). Under test-mode polling (2 s live / 3 s indexed,
 * src/config/polling.ts) that lands every couple of seconds, so a single
 * fire-and-forget click can be undone before the section renders. Pass `until`
 * — a locator only the target section renders — and the click is retried until
 * the choice sticks.
 */
export const openSection = async (
  page: Page,
  name: RegExp,
  until?: Locator,
) => {
  const item = page.getByRole("button", { name }).first()
  if (!until) {
    await item.click()
    return
  }
  await expect(async () => {
    await item.click({ timeout: 15_000 })
    await expect(until.first()).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 120_000 })
}

export const openDepositDialog = async (page: Page) => {
  await page
    .getByRole("button", { name: /^deposit$/i })
    .first()
    .click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  // Some markets front the amount form with a borrower-history gate screen; pass through it
  // so callers can always rely on the amount textbox being reachable.
  const textbox = dialog.getByRole("textbox").first()
  const formVisible = await textbox
    .waitFor({ state: "visible", timeout: 10_000 })
    .then(() => true)
    .catch(() => false)
  if (!formVisible) {
    const gate = dialog.getByRole("checkbox")
    if (await gate.count()) {
      await gate.first().check()
      await dialog
        .getByRole("button", { name: /deposit anyway|continue/i })
        .click()
    }
  }
  await expect(textbox).toBeVisible({ timeout: 30_000 })
  return dialog
}

/**
 * Drive an open deposit dialog (amount already filled) through gate/approve/deposit to success.
 * Mirrors the fork smoke's flow; the durable success signal is asserted by the caller on chain.
 */
export const submitDepositDialog = async (
  page: Page,
  dialog: ReturnType<Page["getByRole"]>,
) => {
  // Borrower-history gate (only for some markets): acknowledge and continue.
  const gate = dialog.getByRole("checkbox")
  if (await gate.count()) {
    await gate.first().check()
    await dialog
      .getByRole("button", { name: /deposit anyway|continue/i })
      .click()
  }
  const approve = dialog.getByRole("button", { name: /^approve$/i })
  const deposit = dialog.getByRole("button", { name: /^deposit$/i })
  await expect(approve.or(deposit).first()).toBeEnabled({ timeout: 60_000 })
  if (await approve.count()) {
    await expect(approve).toBeEnabled({ timeout: 60_000 })
    await approve.click()
    await expect(
      dialog.getByRole("button", { name: /^approved$/i }),
    ).toBeVisible({ timeout: 90_000 })
  }
  await expect(deposit).toBeEnabled({ timeout: 60_000 })
  await deposit.click()
  await expect(page.getByText("Transaction Successful!")).toBeVisible({
    timeout: 120_000,
  })
}

/** Full deposit-through-UI convenience used where the amount needs no special handling. */
export const depositThroughUi = async (page: Page, amountUnits: string) => {
  const dialog = await openDepositDialog(page)
  await dialog.getByRole("textbox").first().fill(amountUnits)
  await submitDepositDialog(page, dialog)
}
