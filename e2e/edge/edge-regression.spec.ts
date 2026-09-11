/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits } from "viem"

import { hasOpenAccessProvider, hooksInstance } from "../borrowerflows/helpers"
import {
  borrowOnChain,
  borrowerMarkets,
  marketBorrowable,
  marketScaleFactor,
  setMaxTotalSupplyOnChain,
  type BorrowerMarketRow,
} from "../borrowerflows/lib"
import { gotoAligned, rowsIn } from "../lenderflows/helpers"
import {
  account0,
  account1,
  ensureNoMlaAcknowledged,
  ensureTouSigned,
  CHAIN_ID,
  marketDelinquency,
  marketMaxTotalSupply,
  marketScaledBalance,
  marketTotalAssets,
  marketTotalDebts,
  marketTotalSupply,
  openDepositDialog,
  openSection,
  pinnedMarkets,
  queueFullWithdrawal,
  repayAndProcessUnpaidBatches,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  unpaidBatchExpiries,
} from "../lenderflows/lib"
import { parseFormattedAmount } from "../lib/assert"
import * as chain from "../lib/chain"
import {
  APP_URL,
  FORK_GQL,
  FORK_RPC,
  advanceTime,
  faucet,
  gql,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import {
  alignBrowserClockToChain,
  connectAs,
  ensureConnected,
  openWithdrawalRequests,
  readAvailableToWithdraw,
  readOngoingAmounts,
  readWithdrawalsStatus,
} from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test, type Page } from "../lib/test"

/**
 * UAT 10 "Edge & Regression" (EDG-01…15) — the cross-cutting gap checks.
 *
 * Runsheet row -> disposition
 * ---------------------------------------------------------------------------
 * EDG-01 capacity overshoot     -> EDG-01 (here). Interest pushes totalSupply past the cap on a
 *                                  page-3 market; the protocol allows it, the UI clamps
 *                                  "Available To Deposit" to 0 and offers no deposit action.
 * EDG-02 min deposit            -> COVERED by LEN-15 ("below-minimum deposit is blocked": the
 *                                  DepositModal renders SDK_ERRORS_MAPPING.deposit
 *                                  .BelowMinimumDeposit and disables Deposit) and by BOP-19
 *                                  (chain-level revert below a freshly raised minimum). No new test.
 * EDG-03 deposit at cap         -> EDG-03 (here), UI-only, no transaction.
 * EDG-04 simultaneous requests  -> COVERED by LEN-22: three lenders queue inside ONE cycle, the
 *                                  suite asserts they land in a single batch and audits the
 *                                  pro-rata claimable of every participant against the batch's
 *                                  scaled bookkeeping. No new test.
 * EDG-05 expired batch queue    -> EDG-05 (here). LEN-22 only ever has ONE unpaid batch; this adds
 *                                  the two-batch FIFO with a partial repayment.
 * EDG-06 sanctions escrow       -> test.fixme (no sanctions oracle on this build/harness — see the
 *                                  stub's comment).
 * EDG-07 number formatting      -> EDG-07 (here). LEN-10 covers cell overlap + two amount columns
 *                                  on my-markets; this sweeps the explorer and the detail page for
 *                                  grouping/rounding/truncation/overflow.
 * EDG-08 dormant markets        -> EDG-08 (here): the Explore ("Glass Door") visibility filter.
 * EDG-09 defaulted borrower UI  -> test.fixme (depends on ADM-11 deregistration, which no suite
 *                                  automates; see the stub's comment).
 * EDG-10 indexing lag           -> EDG-10 (here). MKT-21 records deploy->index lag only.
 * EDG-11 mobile                 -> EDG-11 (here), mobile viewport describe at the bottom.
 * EDG-12 session persistence    -> EDG-12 (here).
 * EDG-13 error states           -> EDG-13 (here), via route interception (nothing is written).
 * EDG-14 docs accuracy          -> test.fixme (external site, manual docs review).
 * EDG-15 telegram bot           -> test.fixme (external service, not pointed at the fork).
 *
 * Fixtures & hygiene
 *  - Read-only rows (EDG-03/07/08/11) run against the PINNED markets and account #0.
 *  - Transaction rows (EDG-01/05/10/12) need a market we can borrow on / re-price, so they use an
 *    OPEN-TERM, OPEN-ACCESS market owned by borrower #3 (deployed by the page-3 suite). If the
 *    page-3 suite has not run on this fork they skip with a pointer, exactly like BOP-*.
 *  - Everything this suite changes is restored: the capacity change is reverted, the unpaid queue
 *    is settled and every batch claimed.
 *  - ORDERING: run this file BEFORE the final BOP-14 test (a permanent 2-week jump) or after a
 *    `dev:fork:reset` — the setup signs agreements, and the signature APIs bound `timeSigned`
 *    against the SERVER wall clock.
 */

const RAY = 10n ** 27n
const MOBILE_VIEWPORT = { width: 390, height: 844 }

/** Formatted token amount as the app writes it: grouped integer part, optional compact suffix. */
const AMOUNT_RE = /^-?\d{1,3}(,\d{3})*(\.\d+)?([KMBT])?$/
/** AprChip renders `${formatBps(bips)}%` — at most two decimals, trailing zeroes stripped. */
const APR_RE = /^\d+(\.\d{1,2})?%$/
/** Values that must never reach the DOM (formatter regressions have produced all of these). */
const BAD_TOKEN_RE =
  /\bNaN\b|\bInfinity\b|\bundefined\b|\[object [A-Za-z]+\]|\d,\d{4}/g

// Count fractional digits only: large amounts carry a magnitude suffix ("2.32B") and the
// token symbol may trail the number — neither is a decimal place.
const decimalsOf = (text: string) =>
  (text.split(".")[1] ?? "").replace(/[^0-9].*$/, "").length

/** Playwright's clock can only be installed once per page; gotoMarket would install it again.
 *  After the first install, every open RE-SYNCS the mocked clock to chain time — the suite
 *  time-travels between tests, and a page clock left behind the chain makes the app classify
 *  expired batches as still pending (claimable renders 0 forever). */
const clocked = new WeakSet<Page>()
const openMarketPage = async (page: Page, market: string) => {
  if (clocked.has(page)) {
    await page.clock.setSystemTime((await chain.blockTimestamp()) * 1000)
  }
  if (!clocked.has(page)) {
    await alignBrowserClockToChain(page)
    clocked.add(page)
  }
  await page.goto(`/lender/market/${market.toLowerCase()}`)
}

/** The page must never render a Next.js error boundary / blank body. */
const expectNoWhiteScreen = async (
  page: Page,
  label: string,
  minLength = 80,
) => {
  const body = (await page.locator("body").innerText()).trim()
  expect(
    body.length,
    `${label}: page body is not blank`,
  ).toBeGreaterThanOrEqual(minLength)
  expect(body, `${label}: no Next.js error boundary`).not.toMatch(
    /Application error|client-side exception|Internal Server Error/i,
  )
  return body
}

/**
 * Formatter blow-ups visible in rendered text. Market names come from the fork catalogue and are
 * arbitrary strings, so a hit that is only part of a market NAME is not a formatting defect.
 */
const formatterLeaks = (body: string, allowedNames: string[]) =>
  (body.match(BAD_TOKEN_RE) ?? []).filter(
    (hit) => !allowedNames.some((name) => name.includes(hit)),
  )

/** Horizontal page overflow — the "overflowing layouts" half of EDG-07/EDG-11. */
const horizontalOverflowPx = (page: Page) =>
  page.evaluate(() => {
    const el = document.documentElement
    return Math.max(0, el.scrollWidth - el.clientWidth)
  })

/**
 * Cells whose content does not fit (CSS ellipsis) — the "no truncation" half of EDG-07.
 * Probes the cell itself plus its TEXT-BEARING LEAVES: intermediate wrappers (chips, link groups)
 * are laid out by flexbox and legitimately report a wider scroll box than they paint.
 */
const truncatedCells = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const bad: string[] = []
    document.querySelectorAll(sel).forEach((node) => {
      const el = node as HTMLElement
      const probes: HTMLElement[] = [el]
      el.querySelectorAll("*").forEach((child) => {
        const leaf = child as HTMLElement
        if (leaf.childElementCount === 0 && (leaf.textContent ?? "").trim())
          probes.push(leaf)
      })
      for (const probe of probes) {
        if (probe.scrollWidth > probe.clientWidth + 2) {
          bad.push(
            `${el.getAttribute("data-field") ?? el.className}: "${
              el.textContent?.trim() ?? ""
            }"`,
          )
          break
        }
      }
    })
    return bad
  }, selector)

// ---------- subgraph oracle (Explore visibility + formatting subjects) ----------

type OracleMarket = {
  id: string
  name: string
  borrower: string
  isClosed: boolean
  isDelinquent: boolean
  isIncurringPenalties: boolean
  timeDelinquent: number
  delinquencyGracePeriod: number
  lastInterestAccruedTimestamp: number
  maxTotalSupply: string
  scaledTotalSupply: string
  scaleFactor: string
  annualInterestBips: number
  asset: { symbol: string; decimals: number }
}

const fetchMarketOracle = async () =>
  (
    await gql<{ markets: OracleMarket[] }>(
      `{ markets(first: 1000) {
        id name borrower isClosed isDelinquent isIncurringPenalties
        timeDelinquent delinquencyGracePeriod lastInterestAccruedTimestamp
        maxTotalSupply scaledTotalSupply scaleFactor annualInterestBips
        asset { symbol decimals } } }`,
    )
  ).markets

/**
 * Penalty state as the app derives it.
 *
 * The app never reads the subgraph's own `isIncurringPenalties` field: the SDK's Market does
 * not even accept it (Market.fromSubgraphMarketData, @wildcatfi/wildcat-sdk/dist/market.js:
 * 942-943) and exposes `get isIncurringPenalties() { return this.timeDelinquent >
 * this.delinquencyGracePeriod }` (market.js:302-304) over whatever timeDelinquent it last
 * ingested. For every market on the lender dashboard that value comes from a LENS read
 * (useLendersMarkets.ts:169-242 -> updateWithLiveData, market.js:782-783), and the lens sees the
 * contract's _getUpdatedState projection: the timer decays 1:1 with elapsed time while a market
 * is healthy and grows while it is delinquent.
 *
 * So the indexed flag is stale in BOTH directions and cannot be projected reliably from the
 * indexed pair either — the board's EDG-08 failure is the decay case (E2E MC20
 * 0xef2a7735… indexed at timeDelinquent 7274 > grace 3600, isIncurringPenalties:true, while
 * currentState() already reports 0, so the app correctly keeps its borrower's sibling market
 * E2E MC1 0x542fe421… in Explore), and markets whose indexed isDelinquent is stale break the
 * arithmetic in the other direction (6 of 45 candidates on the pinned fork). Read the live
 * state instead, for the handful of markets that carry any delinquency signal at all — the rest
 * sit at timeDelinquent 0 and can only decay.
 */
const livePenaltyMarkets = async (markets: OracleMarket[]) => {
  const candidates = markets.filter(
    (m) => m.isIncurringPenalties || m.isDelinquent || m.timeDelinquent > 0,
  )
  const states = await Promise.all(
    candidates.map((m) => marketDelinquency(m.id as Address)),
  )
  return new Set(
    candidates
      .filter(
        (m, i) =>
          // getMarketStatus checks isClosed FIRST, so a closed market is TERMINATED and
          // never PENALTY (utils/marketStatus.ts:17-26, 49-54).
          !states[i].isClosed &&
          states[i].timeDelinquent > m.delinquencyGracePeriod,
      )
      .map((m) => m.id.toLowerCase()),
  )
}

/** Subgraph supply (scaled * scaleFactor); lags live accrual, so only used as a lower bound. */
const indexedSupply = (m: OracleMarket) =>
  (BigInt(m.scaledTotalSupply) * BigInt(m.scaleFactor)) / RAY

/** utils/marketStatus.ts#getPenaltyBorrowers — a borrower-wide blacklist: ONE market in penalty
 *  hides every market of that borrower from Explore (ExploreMarketsTable/index.tsx:321-335). */
const penaltyBorrowersOf = (markets: OracleMarket[], inPenalty: Set<string>) =>
  new Set(
    markets
      .filter((m) => inPenalty.has(m.id.toLowerCase()))
      .map((m) => m.borrower.toLowerCase()),
  )

/** Mirror of utils/marketStatus.ts#isExploreVisible + the penalty-borrower exclusion. */
const isExploreEligible = (
  m: OracleMarket,
  penalty: Set<string>,
  inPenalty: Set<string>,
) =>
  !m.isClosed &&
  !inPenalty.has(m.id.toLowerCase()) &&
  BigInt(m.maxTotalSupply) > indexedSupply(m) &&
  !penalty.has(m.borrower.toLowerCase())

/** Latest deposit per market over the app's widest activity window (useRecentDeposits). */
const latestDepositByMarket = async (sinceSec: number) => {
  const { deposits } = await gql<{
    deposits: { blockTimestamp: string; market: { id: string } }[]
  }>(
    `{ deposits(first: 1000, orderBy: blockTimestamp, orderDirection: desc,
        where: { blockTimestamp_gte: ${sinceSec} }) { blockTimestamp market { id } } }`,
  )
  const byMarket: Record<string, number> = {}
  for (const d of deposits) {
    const id = d.market.id.toLowerCase()
    byMarket[id] = Math.max(byMarket[id] ?? 0, Number(d.blockTimestamp))
  }
  return byMarket
}

/** Sepolia activity tiers from ExploreMarketsTable/activityRanking.ts (7/30/90 days, then "never"). */
const activityTier = (
  marketId: string,
  latest: Record<string, number>,
  nowSec: number,
) => {
  const ts = latest[marketId.toLowerCase()]
  if (ts === undefined) return 3
  for (const [tier, days] of [7, 30, 90].entries()) {
    if (ts > nowSec - days * 86_400) return tier
  }
  return 3
}

test.describe.serial("edge & regression (UAT 10)", () => {
  const openTerm = pinnedMarkets.openTerm.toLowerCase() as Address
  let openTermToken: Address
  let openTermDecimals = 18

  // page-3 fixture used by every transaction row
  let edge: BorrowerMarketRow | undefined
  let edgeMarket: Address
  let edgeToken: Address
  let edgeDecimals = 18
  let edgeCycle = 0
  let edgeMinDeposit = 0n
  let edgeDeposit = 0n

  const requireEdgeMarket = () =>
    test.skip(
      !edge,
      "no open-term, open-access market owned by borrower #3 on the fork subgraph — " +
        "run the page-3 market-creation suite first",
    )

  /** Top the account's edge-market position up to `target` (respecting the minimum + the cap). */
  const ensureEdgePosition = async (account: Address, target: bigint) => {
    const balance = await chain.marketBalance(edgeMarket, account)
    if (balance >= target) return balance
    const unit = parseUnits("1", edgeDecimals)
    const room =
      (await marketMaxTotalSupply(edgeMarket)) -
      (await marketTotalSupply(edgeMarket))
    let amount = target - balance
    if (amount < edgeMinDeposit + unit) amount = edgeMinDeposit + unit
    if (amount > room) amount = room
    expect(
      amount > edgeMinDeposit,
      "edge market has room for a minimum-clearing deposit",
    ).toBe(true)
    faucet(account, amount * 2n, edgeToken)
    await chain.approve(account, edgeToken, edgeMarket, amount * 2n)
    await chain.depositUpTo(account, edgeMarket, amount)
    await syncSubgraph()
    return chain.marketBalance(edgeMarket, account)
  }

  test("setup: chain time, agreements, and the page-3 edge-market fixture", async ({
    page,
  }) => {
    test.setTimeout(420_000)
    // The app classifies time-gated state with Date.now(); never let the chain lag the wall clock.
    await syncChainTimeToWallClock()
    for (const account of [account0, account1])
      faucet(account, parseUnits("1", 18))

    const pinned = await subgraph.market(openTerm)
    expect(
      pinned,
      "pinned openTerm market exists on the fork subgraph",
    ).not.toBeNull()
    openTermToken = pinned!.asset.address as Address
    openTermDecimals = pinned!.asset.decimals

    // Edge fixture: open-term, non-revolving, borrower #3, and depositable by account #0 without
    // an allowlist entry (either the hooks do not gate deposits or the policy carries the
    // OpenAccessRoleProvider). Scan newest-first so we do not collide with the BOP suite's
    // "primary" market, which it picks oldest-first.
    //
    // The UI-deposit rows must run on an E2E market, never the PINNED openTerm one: pinned
    // markets belong to real Sepolia borrowers with no row in the sanitized app DB, and the
    // no-MLA acknowledgement modal then renders "Borrower profile is unavailable." with
    // Acknowledge permanently disabled — the lender cannot deposit through the UI at all.
    // Prefer an MLA-free candidate so ensureNoMlaAcknowledged covers the deposit gate.
    const mlaFree = async (id: string) => {
      // GET /api/mla/<market> answers {"noMLA":true} for a declined-MLA market and the full
      // MLA document otherwise (both status 200).
      const res = await fetch(`${APP_URL}/api/mla/${id}?chainId=${CHAIN_ID}`)
      const body = (await res.json().catch(() => null)) as {
        noMLA?: boolean
      } | null
      return body?.noMLA === true
    }
    const owned = await borrowerMarkets()
    const candidates = owned.filter(
      (m) =>
        !m.isClosed &&
        m.marketKind !== "REVOLVING" &&
        (m.hooksConfig?.fixedTermEndTime ?? 0) === 0 &&
        (m.hooksConfig?.periodDuration ?? 0) === 0,
    )
    let fallback: typeof edge
    for (const candidate of [...candidates].reverse()) {
      const instance = candidate.hooks
        ? await hooksInstance(candidate.hooks.id)
        : null
      const openAccess =
        candidate.hooksConfig?.depositRequiresAccess === false ||
        (instance !== null && hasOpenAccessProvider(instance))
      if (!openAccess) continue
      if (await mlaFree(candidate.id)) {
        edge = candidate
        break
      }
      fallback = fallback ?? candidate
    }
    edge = edge ?? fallback

    attachAgreement("EDG fixtures", {
      pinnedOpenTerm: openTerm,
      borrower3Markets: owned.length,
      openTermCandidates: candidates.map((m) => m.id),
      edgeMarket: edge?.id ?? null,
      edgeMarketName: edge?.name ?? null,
    })
    if (!edge) return

    edgeMarket = edge.id as Address
    edgeToken = edge.asset.address as Address
    edgeDecimals = edge.asset.decimals
    edgeCycle = Number(edge.withdrawalBatchDuration)
    edgeMinDeposit = BigInt(edge.hooksConfig?.minimumDeposit ?? "0")
    edgeDeposit = edgeMinDeposit + parseUnits("1", edgeDecimals)
    if (edgeDeposit < parseUnits("100", edgeDecimals))
      edgeDeposit = parseUnits("100", edgeDecimals)

    // Signature ceremonies run on the EDGE market (wall-clock pages): the market page offers
    // Deposit only to a lender holding the token (zero balance renders the Faucet button
    // instead), so fund first; the no-MLA acknowledgement applies only when the borrower
    // declined an MLA for this market.
    faucet(account0, edgeDeposit * 2n, edgeToken)
    await ensureTouSigned(page, account0, edgeMarket)
    if (await mlaFree(edgeMarket)) {
      await ensureNoMlaAcknowledged(page, account0, edgeMarket)
    }

    // Self-clean, in the order the conventions demand: expire pending batches first (selfClean
    // advances time), then repay & drain the unpaid FIFO, then claim what is left.
    for (const account of [account0, account1])
      await selfCleanWithdrawals(account, edgeMarket)
    await settleUnpaidBatches(account0, edgeMarket, edgeToken, edgeDecimals)
    for (const account of [account0, account1])
      await selfCleanWithdrawals(account, edgeMarket)
    await syncSubgraph()
    expect(
      await unpaidBatchExpiries(edgeMarket),
      "edge market starts with a drained unpaid queue",
    ).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // Read-only rows
  // ---------------------------------------------------------------------------

  test("EDG-03: a deposit above the remaining capacity is rejected with a clear message", async ({
    page,
  }) => {
    // The EDGE market, not the pinned one: pinned markets' real borrowers have no app-DB
    // profile, so their deposit gate (no-MLA acknowledgement) can never be completed (setup).
    requireEdgeMarket()
    test.setTimeout(300_000)
    await connectAs(page, 0)
    await openMarketPage(page, edgeMarket)
    await ensureConnected(page, account0)

    const cap = await marketMaxTotalSupply(edgeMarket)
    const supply = await marketTotalSupply(edgeMarket)
    const remaining = cap > supply ? cap - supply : 0n
    expect(
      remaining,
      "the edge market still has capacity headroom to overshoot",
    ).toBeGreaterThan(0n)

    const dialog = await openDepositDialog(page)
    const amountField = dialog.getByRole("textbox").first()
    const over = remaining + parseUnits("1", edgeDecimals)
    const overText = formatUnits(over, edgeDecimals)

    await step(
      page,
      "over-capacity tender is refused, not clamped",
      async () => {
        await amountField.fill(overText)
        // SDK_ERRORS_MAPPING.deposit.ExceedsMaximumDeposit — checked BEFORE the balance rule, so
        // this is the capacity message even on a wallet that could never fund the tender.
        await expect(
          dialog.getByText(
            "You're attempting to deposit more than the maximum capacity",
          ),
        ).toBeVisible({ timeout: 30_000 })
        await expect(
          dialog.getByRole("button", { name: /^deposit$/i }),
        ).toBeDisabled()
        // "Rejected OR auto-capped per spec": this build rejects. The input applies its own
        // display masking (long decimal tails get trimmed), so don't demand the exact typed
        // string — demand that what the field holds still EXCEEDS the remaining capacity,
        // which proves the app did not auto-clamp the tender down to the cap.
        const held = parseUnits(
          ((await amountField.inputValue()) || "0").replace(/,/g, ""),
          edgeDecimals,
        )
        expect(
          held > remaining,
          `field value ${held} still exceeds remaining ${remaining} (not clamped)`,
        ).toBe(true)
      },
    )

    await step(
      page,
      "a tender at exactly the cap clears the capacity rule",
      async () => {
        await amountField.fill(formatUnits(remaining, edgeDecimals))
        await expect(
          dialog.getByText(
            "You're attempting to deposit more than the maximum capacity",
          ),
        ).toBeHidden({ timeout: 30_000 })
      },
    )

    attachAgreement("EDG-03 capacity boundary", {
      market: edgeMarket,
      maxTotalSupply: cap,
      totalSupply: supply,
      remaining,
      tendered: over,
      decimals: edgeDecimals,
    })
    await page.keyboard.press("Escape")
  })

  test("EDG-07: number formatting across the explorer and a market detail page", async ({
    page,
  }) => {
    test.setTimeout(420_000)
    await connectAs(page, 0)
    const oracle = await fetchMarketOracle()

    await step(
      page,
      "explorer tables: grouping, rounding, truncation",
      async () => {
        await gotoAligned(page, "/lender/all-markets")
        await ensureConnected(page, account0)
        await expect(rowsIn(page, "self-onboard").first()).toBeVisible({
          timeout: 90_000,
        })

        const amounts: string[] = []
        const aprs: string[] = []
        for (const container of [
          "self-onboard",
          "manual",
          "other-terminated",
        ]) {
          for (const field of ["capacityLeft", "debt"]) {
            amounts.push(
              ...(
                await rowsIn(page, container)
                  .locator(`.MuiDataGrid-cell[data-field="${field}"]`)
                  .allInnerTexts()
              ).map((t) => t.trim()),
            )
          }
          aprs.push(
            ...(
              await rowsIn(page, container)
                .locator('.MuiDataGrid-cell[data-field="apr"]')
                .allInnerTexts()
            ).map((t) => t.trim()),
          )
        }
        expect(amounts.length, "amount cells were sampled").toBeGreaterThan(0)
        expect(aprs.length, "APR cells were sampled").toBeGreaterThan(0)

        for (const text of amounts) {
          expect(text, "grouped, dot-decimal token amount").toMatch(AMOUNT_RE)
          // The list columns pass fractionDigits: 2 to formatTokenWithCommas.
          expect(
            decimalsOf(text),
            `"${text}" rounded to 2 decimals`,
          ).toBeLessThanOrEqual(2)
        }
        for (const text of aprs) {
          expect(text, "APR chip text").toMatch(APR_RE)
          const value = parseFormattedAmount(text)
          expect(value, `APR ${text} within 0..100%`).toBeGreaterThanOrEqual(0)
          expect(value, `APR ${text} within 0..100%`).toBeLessThanOrEqual(100)
        }

        const truncated = await truncatedCells(
          page,
          '.MuiDataGrid-cell[data-field="capacityLeft"], .MuiDataGrid-cell[data-field="debt"], .MuiDataGrid-cell[data-field="apr"]',
        )
        const overflow = await horizontalOverflowPx(page)
        attachAgreement("EDG-07 explorer sample", {
          amounts: amounts.slice(0, 30),
          aprs: aprs.slice(0, 30),
          truncated,
          horizontalOverflowPx: overflow,
        })
        // The regression this row exists for: numbers clipped by their own cell, or a table that
        // pushes the page sideways.
        expect(truncated, "no numeric cell is clipped by its column").toEqual(
          [],
        )
        expect(
          overflow,
          "explorer does not scroll horizontally",
        ).toBeLessThanOrEqual(2)

        const body = await expectNoWhiteScreen(page, "all-markets")
        expect(
          formatterLeaks(
            body,
            oracle.map((m) => m.name),
          ),
          "no NaN/Infinity/undefined/[object] leaks into the explorer",
        ).toEqual([])
      },
    )

    // Largest capacity == the widest number the detail page has to render; the most precise APR
    // (bips that are not a whole percent) is the long-decimal case the runsheet asks for.
    const open = oracle.filter((m) => !m.isClosed)
    expect(open.length, "the catalogue has open markets").toBeGreaterThan(0)
    const widest = open.reduce((a, b) =>
      BigInt(b.maxTotalSupply) > BigInt(a.maxTotalSupply) ? b : a,
    )
    const preciseApr =
      open.find((m) => m.annualInterestBips % 100 !== 0) ?? widest
    const subjects = [...new Set([widest.id, preciseApr.id])]

    for (const marketId of subjects) {
      const row = open.find((m) => m.id === marketId)!
      await step(page, `detail page formatting: ${row.name}`, async () => {
        await openMarketPage(page, marketId)
        await ensureConnected(page, account0)
        // Retry the click until the section sticks: the page re-selects it
        // whenever access/loading settles — see openSection in ../lenderflows/lib.
        const parameters = page.getByText("Parameters", { exact: true })
        await openSection(page, /status and details/i, parameters)
        await expect(parameters).toBeVisible({ timeout: 90_000 })

        // CapacityBarChart header: "Capacity" label and its formatted maxTotalSupply + symbol.
        const capacityLabel = page
          .getByText("Capacity", { exact: true })
          .first()
        await expect(capacityLabel).toBeVisible({ timeout: 60_000 })
        const capacityRowText = (
          await capacityLabel.locator("xpath=..").innerText()
        )
          .replace(/\s+/g, " ")
          .trim()
        const shownCapacity = capacityRowText
          .replace(/^Capacity\s*/i, "")
          .trim()
        const numeric = shownCapacity.split(" ")[0]
        expect(numeric, `capacity "${shownCapacity}"`).toMatch(AMOUNT_RE)
        // TOKEN_FORMAT_DECIMALS = 5 on the detail page.
        expect(
          decimalsOf(numeric),
          `capacity "${numeric}" rounding`,
        ).toBeLessThanOrEqual(5)
        if (!/[KMBT]$/.test(numeric)) {
          const onChain = Number(
            formatUnits(
              await marketMaxTotalSupply(marketId as Address),
              row.asset.decimals,
            ),
          )
          expect(
            Math.abs(parseFormattedAmount(numeric) - onChain),
            `capacity "${numeric}" vs chain ${onChain}`,
          ).toBeLessThanOrEqual(Math.max(1e-5, onChain * 1e-6))
        }

        const overflow = await horizontalOverflowPx(page)
        const body = await expectNoWhiteScreen(page, `market ${marketId}`)
        attachAgreement(`EDG-07 detail ${row.name}`, {
          market: marketId,
          annualInterestBips: row.annualInterestBips,
          shownCapacity,
          horizontalOverflowPx: overflow,
        })
        expect(
          overflow,
          "market detail does not scroll horizontally",
        ).toBeLessThanOrEqual(2)
        expect(
          formatterLeaks(body, [row.name, row.asset.symbol]),
          "no NaN/Infinity/undefined/[object] leaks into the detail page",
        ).toEqual([])
      })
    }

    await step(
      page,
      "dust position renders as '< 0.00001', never as 0",
      async () => {
        await openMarketPage(page, openTerm)
        await ensureConnected(page, account0)
        // The section is redux state that survives navigation between market pages.
        await openSection(page, /deposit & withdraw/i)
        const available = await readAvailableToWithdraw(page)
        const dustCeiling = 10n ** BigInt(openTermDecimals) / 100_000n
        attachAgreement("EDG-07 dust rendering", {
          text: available.text,
          raw: available.raw,
          dustCeiling,
          isDust: available.raw > 0n && available.raw < dustCeiling,
        })
        if (available.raw > 0n && available.raw < dustCeiling) {
          // MarketActions: isTooSmallMarketBalance -> "< 0.00001" (never a rounded-down "0").
          expect(available.text).toContain("< 0.00001")
        } else if (available.raw > 0n) {
          const shown = parseFormattedAmount(available.text)
          const actual = Number(formatUnits(available.raw, openTermDecimals))
          expect(
            Math.abs(shown - actual),
            `available "${available.text}" vs raw ${actual}`,
          ).toBeLessThanOrEqual(Math.max(1e-5, actual * 1e-6))
        }
      },
    )
  })

  test("EDG-08: Explore hides terminated, penalised and full markets (Glass Door filter)", async ({
    page,
  }) => {
    test.setTimeout(300_000)
    await connectAs(page, 0)
    await gotoAligned(page, "/lender")
    await ensureConnected(page, account0)

    // The only DataGrid on the Explore page is the Top Markets table.
    const rows = page.locator(".MuiDataGrid-row[data-id]")
    await expect(page.getByText("Top Markets").first()).toBeVisible({
      timeout: 90_000,
    })
    await expect(rows.first()).toBeVisible({ timeout: 90_000 })
    const readRendered = async () =>
      (
        await rows.evaluateAll((nodes) =>
          nodes.map((n) => (n as HTMLElement).getAttribute("data-id") ?? ""),
        )
      )
        .filter(Boolean)
        .map((id) => id.toLowerCase())

    let oracle = await fetchMarketOracle()
    let rendered = await readRendered()
    let inPenalty = new Set<string>()
    let penalty = new Set<string>()
    expect(
      rendered.length,
      "Explore rendered at least one market",
    ).toBeGreaterThan(0)

    /** Rows that break isExploreVisible + the penalty-borrower exclusion, refreshing both sides. */
    const exploreViolations = async () => {
      ;[oracle, rendered] = await Promise.all([
        fetchMarketOracle(),
        readRendered(),
      ])
      inPenalty = await livePenaltyMarkets(oracle)
      penalty = penaltyBorrowersOf(oracle, inPenalty)
      const byId = new Map(oracle.map((m) => [m.id.toLowerCase(), m]))
      const bad: string[] = []
      for (const id of rendered) {
        const row = byId.get(id)
        if (!row) {
          bad.push(`${id}: Explore row is not in the catalogue`)
        } else {
          if (row.isClosed) bad.push(`${id}: terminated markets never show`)
          if (inPenalty.has(id))
            bad.push(`${id}: markets in penalty never show`)
          if (penalty.has(row.borrower.toLowerCase()))
            bad.push(`${id}: markets of a borrower in penalty never show`)
        }
        // Live check (the indexed scaleFactor lags accrual): capacity headroom must exist.
        const cap = await marketMaxTotalSupply(id as Address)
        const supply = await marketTotalSupply(id as Address)
        if (cap <= supply)
          bad.push(
            `${id}: a market at/over capacity is dormant for Explore (${supply} >= ${cap})`,
          )
      }
      return bad
    }

    await step(
      page,
      "every visible market passes isExploreVisible",
      async () => {
        // Sibling suites move markets in and out of delinquency while this runs, and the page's
        // rows are at most one live refresh behind (3 s in test mode, src/config/polling.ts).
        // Re-read BOTH sides until they agree instead of judging the app on one interleaving.
        await expect
          .poll(exploreViolations, {
            message: "Explore rows vs isExploreVisible",
            timeout: 90_000,
          })
          .toEqual([])
      },
    )

    const nowSec = await chain.blockTimestamp()
    const latest = await latestDepositByMarket(nowSec - 90 * 86_400)
    const eligible = oracle.filter((m) =>
      isExploreEligible(m, penalty, inPenalty),
    )

    // Activity ranking is observational: the rendered set is the top-N of a tier-ranked list that
    // is then re-sorted by the display criterion, so the visible ORDER carries no tier signal.
    // Record the tiers so a regression (dormant markets crowding out active ones) is visible.
    const tiers = rendered.map((id) => ({
      market: id,
      tier: activityTier(id, latest, nowSec),
      latestDeposit: latest[id] ?? null,
    }))
    attachAgreement("EDG-08 explore filter", {
      catalogue: oracle.length,
      eligible: eligible.length,
      renderedCount: rendered.length,
      rendered,
      tiers,
      penaltyMarkets: [...inPenalty],
      penaltyBorrowers: [...penalty],
      note:
        "isExploreVisible = status in {Healthy, Pending} AND maxTotalSupply > totalSupply; " +
        "markets of a borrower with any market in penalty are dropped as well " +
        "(utils/marketStatus.ts, ExploreMarketsTable). Penalty is the market's LIVE " +
        "timeDelinquent > delinquencyGracePeriod (currentState()), which is what the lens " +
        "hands the SDK — the subgraph's isIncurringPenalties flag is as-of-last-event and is " +
        "never read by the app.",
    })
  })

  // ---------------------------------------------------------------------------
  // Transaction rows (page-3 edge market)
  // ---------------------------------------------------------------------------

  test("EDG-10: the UI reflects a state-changing transaction without a reload", async ({
    page,
  }) => {
    requireEdgeMarket()
    test.setTimeout(420_000)
    await connectAs(page, 0)
    await openMarketPage(page, edgeMarket)
    await ensureConnected(page, account0)

    const depositLag = await step(
      page,
      "deposit -> balance on the open page",
      async () => {
        const before = await chain.marketBalance(edgeMarket, account0)
        const unit = parseUnits("1", edgeDecimals)
        let amount = edgeDeposit
        const room =
          (await marketMaxTotalSupply(edgeMarket)) -
          (await marketTotalSupply(edgeMarket))
        if (amount > room) amount = room
        expect(
          amount > edgeMinDeposit,
          "room for a minimum-clearing deposit",
        ).toBe(true)
        faucet(account0, amount * 2n, edgeToken)
        await chain.approve(account0, edgeToken, edgeMarket, amount * 2n)
        const t0 = Date.now()
        await chain.depositUpTo(account0, edgeMarket, amount)
        await syncSubgraph()
        // No reload: useLenderMarketAccount refetches every POLLING_INTERVAL (10 s).
        await expect
          .poll(async () => (await readAvailableToWithdraw(page)).raw, {
            timeout: 90_000,
            message: "market page reflects the new deposit without a reload",
          })
          .toBeGreaterThan(before + amount - unit)
        return Date.now() - t0
      },
    )

    const requestLag = await step(
      page,
      "withdrawal request -> ongoing row",
      async () => {
        const balance = await chain.marketBalance(edgeMarket, account0)
        const amount = balance / 4n
        expect(amount, "a position to request against").toBeGreaterThan(0n)
        const t0 = Date.now()
        await chain.queueWithdrawal(account0, edgeMarket, amount)
        await syncSubgraph()
        await openWithdrawalRequests(page)
        // Count directly (readOngoingAmounts waits internally and would throw out of the poll).
        const ongoingCells = page
          .getByTestId("withdrawals-ongoing")
          .locator('.MuiDataGrid-cell[data-field="amount"]')
        await expect
          .poll(async () => ongoingCells.count(), {
            timeout: 120_000,
            message: "ongoing withdrawal row appears without a reload",
          })
          .toBeGreaterThan(0)
        return Date.now() - t0
      },
    )

    attachAgreement("EDG-10 indexing lag", {
      depositLagMs: depositLag,
      requestLagMs: requestLag,
      runsheetTargetMs: 60_000,
      depositWithinTarget: depositLag < 60_000,
      requestWithinTarget: requestLag < 60_000,
      note:
        "Budgets: chain-derived values poll at POLLING_INTERVAL (10 s); the subgraph-derived " +
        "lender account polls at INDEXED_ACCOUNT_POLLING_INTERVAL (60 s), so the withdrawal row " +
        "can legitimately need more than the runsheet's ~1 min. Both are journaled.",
    })
    // No permanently stale view: everything landed without a reload.
    expect(
      depositLag,
      "deposit reflected well inside the runsheet budget",
    ).toBeLessThan(90_000)
    expect(
      requestLag,
      "withdrawal request reflected without a reload",
    ).toBeLessThan(120_000)
  })

  test("EDG-12: a hard refresh between request and claim recovers the full position", async ({
    page,
  }) => {
    requireEdgeMarket()
    test.setTimeout(480_000)
    await connectAs(page, 0)
    // EDG-10 leaves a pending request; make this test self-sufficient anyway.
    await ensureEdgePosition(account0, edgeDeposit)
    await openMarketPage(page, edgeMarket)
    await ensureConnected(page, account0)

    let pending = await subgraph.openWithdrawalExpiries(edgeMarket, account0)
    if (pending.length === 0) {
      const balance = await chain.marketBalance(edgeMarket, account0)
      expect(balance, "a position to request against").toBeGreaterThan(0n)
      await chain.queueWithdrawal(account0, edgeMarket, balance / 4n)
      await syncSubgraph()
      pending = await subgraph.openWithdrawalExpiries(edgeMarket, account0)
    }
    expect(
      pending.length,
      "a pending withdrawal request exists",
    ).toBeGreaterThan(0)
    const expiry = pending[pending.length - 1]

    const beforeReload = await step(
      page,
      "baseline: state once the request is on the page",
      async () => {
        await page.reload()
        await ensureConnected(page, account0)
        await openSection(page, /deposit & withdraw/i)
        const available = await readAvailableToWithdraw(page)
        const status = await readWithdrawalsStatus(page)
        await openWithdrawalRequests(page)
        const ongoing = await readOngoingAmounts(page)
        return { available, status, ongoing }
      },
    )
    expect(
      beforeReload.ongoing.length,
      "the request is listed",
    ).toBeGreaterThan(0)

    const afterReload = await step(page, "hard refresh mid-flow", async () => {
      await page.reload()
      await ensureConnected(page, account0)
      await openSection(page, /deposit & withdraw/i)
      const available = await readAvailableToWithdraw(page)
      const status = await readWithdrawalsStatus(page)
      await openWithdrawalRequests(page)
      const ongoing = await readOngoingAmounts(page)
      return { available, status, ongoing }
    })

    attachAgreement("EDG-12 refresh recovery", {
      expiry,
      before: {
        available: beforeReload.available.raw,
        claimable: beforeReload.status.claimableRaw,
        ongoing: beforeReload.ongoing,
      },
      after: {
        available: afterReload.available.raw,
        claimable: afterReload.status.claimableRaw,
        ongoing: afterReload.ongoing,
      },
    })
    // The position rebases every block, so the balance may only grow; the pending request set
    // and the claimable amount must survive the refresh exactly.
    expect(
      afterReload.available.raw >= beforeReload.available.raw,
      "position recovered after the refresh (rebase may only add)",
    ).toBe(true)
    expect(afterReload.ongoing, "pending requests recovered").toEqual(
      beforeReload.ongoing,
    )
    expect(afterReload.status.claimableRaw, "claimable state recovered").toBe(
      beforeReload.status.claimableRaw,
    )

    await step(page, "expire, refresh again, then claim", async () => {
      const now = await chain.blockTimestamp()
      if (now <= expiry) await advanceTime(expiry - now + 2)
      await chain.updateState(account0, edgeMarket)
      await syncSubgraph()
      const claimable = await chain.getAvailableWithdrawalAmount(
        edgeMarket,
        account0,
        expiry,
      )
      expect(claimable, "the expired batch paid out").toBeGreaterThan(0n)

      // The page's mocked clock was aligned to chain time BEFORE the jump; the app classifies
      // batch expiry with Date.now(), so without a re-sync the reloaded page still thinks the
      // batch is pending and renders claimable as 0 forever.
      await page.clock.setSystemTime((await chain.blockTimestamp()) * 1000)
      await page.reload()
      await ensureConnected(page, account0)
      await openSection(page, /deposit & withdraw/i)
      await expect
        .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
          timeout: 90_000,
          message: "claimable state survives the hard refresh",
        })
        .toBe(claimable)

      const tokenBefore = await chain.erc20Balance(edgeToken, account0)
      await page
        .getByRole("button", { name: /claim assets/i })
        .first()
        .click()
      await expect
        .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
          timeout: 120_000,
        })
        .toBe(0n)
      expect(
        (await chain.erc20Balance(edgeToken, account0)) - tokenBefore,
        "claim paid the recovered amount",
      ).toBe(claimable)
    })
    await syncSubgraph()
  })

  test("EDG-01: interest pushes supply past capacity — allowed on chain, deposits blocked in the UI", async ({
    page,
  }) => {
    requireEdgeMarket()
    test.setTimeout(480_000)
    const capBefore = await marketMaxTotalSupply(edgeMarket)
    await ensureEdgePosition(account0, edgeDeposit)

    const overshoot = await step(
      page,
      "cap the market at its current supply, then accrue",
      async () => {
        const supply = await marketTotalSupply(edgeMarket)
        expect(
          supply,
          "the market carries a position to accrue on",
        ).toBeGreaterThan(0n)
        // Capacity == supply: nothing is over the line yet, so only interest can push it over.
        await setMaxTotalSupplyOnChain(edgeMarket, supply)
        await advanceTime(3600)
        await chain.updateState(account0, edgeMarket)
        await syncSubgraph()
        const after = await marketTotalSupply(edgeMarket)
        const cap = await marketMaxTotalSupply(edgeMarket)
        return { supplyAtCap: supply, supplyAfter: after, cap }
      },
    )

    // Allowed by design: no revert, no forced exit, the market stays open.
    expect(
      overshoot.supplyAfter > overshoot.cap,
      `interest overshot the cap (${overshoot.supplyAfter} vs ${overshoot.cap})`,
    ).toBe(true)
    const row = await subgraph.market(edgeMarket)
    expect(row!.isClosed, "an over-capacity market is not closed").toBe(false)
    expect(
      await chain.marketBalance(edgeMarket, account0),
      "the lender keeps their position",
    ).toBeGreaterThan(0n)

    await step(
      page,
      "UI: 0 available to deposit, no deposit action",
      async () => {
        await connectAs(page, 0)
        await openMarketPage(page, edgeMarket)
        await ensureConnected(page, account0)
        await openSection(page, /deposit & withdraw/i)

        // TransactionBlock: <label box><amount box> — read the amount next to the title.
        // (The block itself only renders for an authorized lender; absence is recorded below.)
        const depositTitle = page.getByText("Available To Deposit", {
          exact: true,
        })
        const titleVisible = await depositTitle
          .first()
          .waitFor({ state: "visible", timeout: 60_000 })
          .then(() => true)
          .catch(() => false)
        let availableText: string | null = null
        if (titleVisible) {
          availableText = (
            await depositTitle
              .first()
              .locator("xpath=../following-sibling::div[1]")
              .innerText()
          )
            .replace(/\s+/g, " ")
            .trim()
          // market.maximumDeposit is a SATURATING subtraction: it clamps at 0, never negative.
          expect(
            availableText,
            "available-to-deposit is clamped, not negative",
          ).not.toMatch(/^-/)
          expect(parseFormattedAmount(availableText), "no headroom left").toBe(
            0,
          )
        }
        // MarketActions hides the whole deposit action when maximumDeposit is 0 (a testnet faucet
        // button can take its place when the wallet holds none of the mock asset).
        const depositButtons = await page
          .getByRole("button", { name: /^deposit$/i })
          .count()
        const faucetButtons = await page
          .getByRole("button", { name: /faucet|request tokens/i })
          .count()
        attachAgreement("EDG-01 over-capacity UI", {
          availableToDeposit: availableText,
          depositButtons,
          faucetButtons,
        })
        expect(
          depositButtons,
          "no deposit action while supply exceeds capacity",
        ).toBe(0)

        const overflow = await horizontalOverflowPx(page)
        const body = await expectNoWhiteScreen(
          page,
          "over-capacity market page",
        )
        expect(
          overflow,
          ">100% capacity does not break the layout",
        ).toBeLessThanOrEqual(2)
        expect(
          formatterLeaks(body, [edge!.name, edge!.asset.symbol]),
          "no formatter blow-up at >100% capacity",
        ).toEqual([])
      },
    )

    await step(page, "chain: further deposits revert", async () => {
      const probe = edgeMinDeposit + parseUnits("1", edgeDecimals)
      faucet(account1, probe * 2n, edgeToken)
      await chain.approve(account1, edgeToken, edgeMarket, probe * 2n)
      let reverted = false
      try {
        await chain.publicClient.simulateContract({
          account: account1,
          address: edgeMarket,
          abi: chain.marketAbi,
          functionName: "depositUpTo",
          args: [probe],
        })
      } catch {
        reverted = true
      }
      expect(reverted, "no new deposits while supply exceeds capacity").toBe(
        true,
      )
    })

    // Restore the capacity so the remaining tests (and any later suite) keep headroom.
    await setMaxTotalSupplyOnChain(edgeMarket, capBefore)
    await syncSubgraph()
    expect(await marketMaxTotalSupply(edgeMarket), "capacity restored").toBe(
      capBefore,
    )
    attachAgreement("EDG-01 overshoot", {
      ...overshoot,
      capRestored: capBefore,
    })
  })

  test("EDG-05: two expired unfilled batches are serviced oldest-first (FIFO)", async ({
    page,
  }) => {
    requireEdgeMarket()
    test.setTimeout(540_000)

    await step(page, "two lenders, then drain the reserves", async () => {
      await ensureEdgePosition(account0, edgeDeposit)
      await ensureEdgePosition(account1, edgeDeposit)
      const borrowable = await marketBorrowable(edgeMarket)
      if (borrowable > parseUnits("1", edgeDecimals) / 100n)
        await borrowOnChain(edgeMarket, (borrowable * 999n) / 1000n)
      await syncSubgraph()
    })

    const before = new Set(await unpaidBatchExpiries(edgeMarket))
    expect([...before], "setup left no unpaid batches").toEqual([])

    const expiryA = await step(
      page,
      "batch A: queue, expire, underpay",
      async () => {
        await queueFullWithdrawal(account0, edgeMarket)
        const queuedAt = await chain.blockTimestamp()
        await advanceTime(edgeCycle + 5)
        await chain.updateState(account0, edgeMarket)
        await syncSubgraph()
        const unpaid = await unpaidBatchExpiries(edgeMarket)
        const found = unpaid.find((e) => !before.has(e))
        expect(
          found,
          `batch A joined the unpaid queue (queued at ${queuedAt}, unpaid: ${unpaid})`,
        ).toBeDefined()
        return found!
      },
    )

    const expiryB = await step(
      page,
      "batch B: queue in a later cycle, expire",
      async () => {
        await queueFullWithdrawal(account1, edgeMarket)
        await advanceTime(edgeCycle + 5)
        await chain.updateState(account1, edgeMarket)
        await syncSubgraph()
        const unpaid = await unpaidBatchExpiries(edgeMarket)
        const found = unpaid.find((e) => e !== expiryA && !before.has(e))
        expect(
          found,
          `batch B joined the unpaid queue (unpaid: ${unpaid})`,
        ).toBeDefined()
        return found!
      },
    )

    expect(expiryB, "batch B expires after batch A").toBeGreaterThan(expiryA)
    const queue = await unpaidBatchExpiries(edgeMarket)
    expect(queue.indexOf(expiryA), "FIFO head is the oldest batch").toBe(0)
    expect(
      queue.indexOf(expiryA) < queue.indexOf(expiryB),
      `queue order ${queue} is oldest-first`,
    ).toBe(true)

    const serviced = await step(
      page,
      "partial repayment services the oldest batch first",
      async () => {
        const aBefore = await chain.getWithdrawalBatch(edgeMarket, expiryA)
        const bBefore = await chain.getWithdrawalBatch(edgeMarket, expiryB)
        const owedA = aBefore.scaledTotalAmount - aBefore.scaledAmountBurned
        expect(owedA, "batch A is genuinely short").toBeGreaterThan(0n)
        expect(
          bBefore.scaledAmountBurned < bBefore.scaledTotalAmount,
          "batch B is genuinely short too",
        ).toBe(true)

        // HALF of what batch A is still owed: a correct FIFO consumes it entirely on A and can
        // never reach B. Sized off A's own scaled deficit (not the market's), so a lopsided pair
        // of positions cannot accidentally overshoot into batch B.
        const scaleFactor = await marketScaleFactor(edgeMarket)
        const owedANormalized = (owedA * scaleFactor) / RAY
        const partial = owedANormalized / 2n
        const deficit =
          (await marketTotalDebts(edgeMarket)) -
          (await marketTotalAssets(edgeMarket))
        expect(partial, "a partial repayment amount exists").toBeGreaterThan(0n)
        faucet(account0, partial * 2n, edgeToken)
        await chain.approve(account0, edgeToken, edgeMarket, partial * 2n)
        await repayAndProcessUnpaidBatches(account0, edgeMarket, partial, 5n)
        await syncSubgraph()

        const aAfter = await chain.getWithdrawalBatch(edgeMarket, expiryA)
        const bAfter = await chain.getWithdrawalBatch(edgeMarket, expiryB)
        return { aBefore, aAfter, bBefore, bAfter, partial, deficit }
      },
    )

    expect(
      serviced.aAfter.scaledAmountBurned > serviced.aBefore.scaledAmountBurned,
      "the partial repayment went to batch A",
    ).toBe(true)
    expect(
      serviced.bAfter.scaledAmountBurned,
      "batch B untouched while batch A is still owed",
    ).toBe(serviced.bBefore.scaledAmountBurned)
    expect(
      serviced.aAfter.scaledAmountBurned <= serviced.aAfter.scaledTotalAmount,
      "batch A never over-pays",
    ).toBe(true)
    attachAgreement("EDG-05 FIFO", {
      expiryA,
      expiryB,
      queue,
      partialRepayment: serviced.partial,
      marketDeficit: serviced.deficit,
      batchA: {
        burnedBefore: serviced.aBefore.scaledAmountBurned,
        burnedAfter: serviced.aAfter.scaledAmountBurned,
        scaledTotal: serviced.aAfter.scaledTotalAmount,
      },
      batchB: {
        burnedBefore: serviced.bBefore.scaledAmountBurned,
        burnedAfter: serviced.bAfter.scaledAmountBurned,
        scaledTotal: serviced.bAfter.scaledTotalAmount,
      },
    })

    await step(
      page,
      "UI: the outstanding queue surfaces the lender's unpaid request",
      async () => {
        await connectAs(page, 0)
        await openMarketPage(page, edgeMarket)
        await ensureConnected(page, account0)
        await openWithdrawalRequests(page)
        const outstanding = page.getByTestId("withdrawals-outstanding")
        await expect(outstanding).toBeVisible({ timeout: 60_000 })
        // DetailsAccordion starts collapsed; its summary row is the clickable header.
        await outstanding
          .getByText("Outstanding", { exact: true })
          .first()
          .click()
        const dates = (
          await outstanding
            .locator('.MuiDataGrid-cell[data-field="dateSubmitted"]')
            .allInnerTexts()
        ).map((t) => t.trim())
        const amounts = (
          await outstanding
            .locator('.MuiDataGrid-cell[data-field="amount"]')
            .allInnerTexts()
        ).map((t) => t.trim())
        attachAgreement("EDG-05 outstanding table (account #0 view)", {
          dates,
          amounts,
          note:
            "The lender-side Outstanding table lists only the CONNECTED lender's owed requests, " +
            "so account #0 sees batch A alone; the FIFO ordering itself is asserted on chain above.",
        })
        // Account #0 owns batch A; the row must be listed with a non-zero owed amount.
        expect(
          amounts.length,
          "the lender's outstanding request is listed",
        ).toBeGreaterThan(0)
        for (const text of amounts)
          expect(
            parseFormattedAmount(text),
            `outstanding amount "${text}"`,
          ).toBeGreaterThan(0)
      },
    )

    await step(
      page,
      "cleanup: settle the queue and claim both batches",
      async () => {
        await settleUnpaidBatches(account0, edgeMarket, edgeToken, edgeDecimals)
        await syncSubgraph()
        expect(
          await unpaidBatchExpiries(edgeMarket),
          "unpaid queue drained",
        ).toEqual([])
        for (const [account, expiry] of [
          [account0, expiryA],
          [account1, expiryB],
        ] as const) {
          const claimable = await chain.getAvailableWithdrawalAmount(
            edgeMarket,
            account,
            expiry,
          )
          if (claimable > 0n)
            await chain.executeWithdrawal(account, edgeMarket, account, expiry)
        }
        await syncSubgraph()
      },
    )
  })

  test("EDG-13: RPC and subgraph failures degrade gracefully, with a retry path", async ({
    page,
  }) => {
    requireEdgeMarket() // the underpriced-send step drives the edge market's deposit modal
    test.setTimeout(420_000)
    await connectAs(page, 0)
    // page.unroute() identifies a route by its matcher VALUE, so the matchers must be the same
    // function objects that were registered — never re-created inline at unroute time.
    const isSubgraph = (url: URL) => url.href.startsWith(FORK_GQL)
    const isRpc = (url: URL) => url.href.startsWith(FORK_RPC)

    await step(
      page,
      "subgraph unreachable: empty state, not a white screen",
      async () => {
        await page.route(isSubgraph, (route) => route.abort("failed"))
        await gotoAligned(page, "/lender/all-markets")
        // The shell must still render: the lender nav, or the table's own empty state.
        const shell = page
          .getByTestId("lender-nav-sidebar")
          .or(page.getByText("No Markets Available").first())
        await expect(shell.first()).toBeVisible({ timeout: 90_000 })
        const body = await expectNoWhiteScreen(
          page,
          "all-markets (subgraph down)",
        )
        attachAgreement("EDG-13 subgraph down", {
          endpoint: FORK_GQL,
          showsEmptyState: /No Markets Available|Are Loading/i.test(body),
          bodyLength: body.length,
        })
        await page.unroute(isSubgraph)
      },
    )

    await step(
      page,
      "recovery: the catalogue comes back after a reload",
      async () => {
        await page.reload()
        await ensureConnected(page, account0)
        await expect(rowsIn(page, "self-onboard").first()).toBeVisible({
          timeout: 120_000,
        })
      },
    )

    await step(
      page,
      "RPC unreachable: the market page still renders",
      async () => {
        await page.route(isRpc, (route) => route.abort("failed"))
        await openMarketPage(page, openTerm)
        // With no chain data the page is mostly skeletons, so the signal here is purely
        // "no error boundary, no blank document" — hence the relaxed length floor.
        const body = await expectNoWhiteScreen(
          page,
          "market page (RPC down)",
          0,
        )
        expect(
          await page.locator("body *").count(),
          "the app shell still rendered without a chain",
        ).toBeGreaterThan(10)
        attachAgreement("EDG-13 RPC down", {
          endpoint: FORK_RPC,
          bodyLength: body.length,
        })
        await page.unroute(isRpc)
      },
    )

    await step(
      page,
      "underpriced transaction: graceful error, retry offered, nothing sent",
      async () => {
        // Fail ONLY the send methods; reads/estimates keep working so the flow reaches the send.
        await page.route(isRpc, async (route) => {
          const post = route.request().postData() ?? ""
          if (!/eth_sendTransaction|eth_sendRawTransaction/.test(post)) {
            await route.continue()
            return
          }
          let payload: unknown
          try {
            payload = JSON.parse(post)
          } catch {
            payload = { id: 1 }
          }
          const error = { code: -32000, message: "transaction underpriced" }
          const body = Array.isArray(payload)
            ? payload.map((entry) => ({
                jsonrpc: "2.0",
                id: (entry as { id?: number }).id ?? 1,
                error,
              }))
            : {
                jsonrpc: "2.0",
                id: (payload as { id?: number }).id ?? 1,
                error,
              }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(body),
          })
        })

        // The EDGE market: the pinned market's deposit gate cannot be completed (no borrower
        // profile in the app DB — see setup), so the flow would never reach the send.
        const marketRow = await subgraph.market(edgeMarket)
        const minimum = BigInt(marketRow!.hooksConfig?.minimumDeposit ?? "0")
        let amount = minimum + parseUnits("1", edgeDecimals)
        if (amount < parseUnits("10", edgeDecimals))
          amount = parseUnits("10", edgeDecimals)
        // Pre-stage funds AND allowance on chain so the modal's own action is the deposit send
        // (an approve failure surfaces as a toast, not as the deposit ErrorModal).
        faucet(account0, amount * 2n, edgeToken)
        await chain.approve(account0, edgeToken, edgeMarket, amount * 2n)
        // Market tokens rebase every block, so the "nothing landed" oracle is the SCALED balance.
        const scaledBefore = await marketScaledBalance(edgeMarket, account0)

        await openMarketPage(page, edgeMarket)
        await ensureConnected(page, account0)
        const dialog = await openDepositDialog(page)
        await dialog
          .getByRole("textbox")
          .first()
          .fill(formatUnits(amount, edgeDecimals))
        const submit = dialog.getByRole("button", { name: /^deposit$/i })
        await expect(submit).toBeEnabled({ timeout: 90_000 })
        await submit.click()

        // Graceful surface: the FinalModals ErrorModal ("Oops! Something went wrong!" + Try Again)
        // or, if the app routed it to a toast instead, a visible error toast. Either is acceptable;
        // a success modal or a white screen is not.
        const errorModal = page.getByText("Oops! Something went wrong!").first()
        const retry = page.getByRole("button", { name: "Try Again" })
        const sawModal = await errorModal
          .waitFor({ state: "visible", timeout: 120_000 })
          .then(() => true)
          .catch(() => false)
        const sawRetry = sawModal
          ? await retry.isVisible().catch(() => false)
          : false
        const toastText = sawModal
          ? null
          : await page
              .locator('div[role="status"]')
              .first()
              .innerText()
              .catch(() => null)

        attachAgreement("EDG-13 underpriced send", {
          surfacedErrorModal: sawModal,
          retryOffered: sawRetry,
          toastText,
        })
        expect(
          sawModal || !!toastText,
          "a failed send surfaces an error (modal or toast), never silence",
        ).toBe(true)
        // A toast without an error message is not an error surface — pin the content.
        if (!sawModal)
          expect(toastText ?? "", "toast carries an actual error").toMatch(
            /error|fail|underpriced|reject/i,
          )
        await expect(page.getByText("Transaction Successful!")).toBeHidden()
        await expectNoWhiteScreen(page, "deposit modal after a failed send")
        expect(
          await marketScaledBalance(edgeMarket, account0),
          "nothing was minted by the failed send",
        ).toBe(scaledBefore)

        // RECOVERY (the other half of the runsheet row): remove the injected failure and use
        // the app's own retry path — the ErrorModal's Try Again resubmits; the toast route has
        // no in-place retry (KNOWN-ISSUES #13), so there the deposit is re-driven through the
        // dialog. Success oracle: the scaled balance actually increases.
        await page.unroute(isRpc)
        if (sawModal) {
          expect(sawRetry, "the ErrorModal offers Try Again").toBe(true)
          await retry.click()
        } else {
          await page.keyboard.press("Escape")
          const dialog2 = await openDepositDialog(page)
          await dialog2
            .getByRole("textbox")
            .first()
            .fill(formatUnits(amount, edgeDecimals))
          const submit2 = dialog2.getByRole("button", { name: /^deposit$/i })
          await expect(submit2).toBeEnabled({ timeout: 90_000 })
          await submit2.click()
        }
        await expect
          .poll(() => marketScaledBalance(edgeMarket, account0), {
            timeout: 120_000,
            message: "retry after RPC recovery lands the deposit",
          })
          .toBeGreaterThan(scaledBefore)
        await page.keyboard.press("Escape")
      },
    )
  })

  // ---------------------------------------------------------------------------
  // Not automatable on this harness
  // ---------------------------------------------------------------------------

  test.fixme(
    "EDG-06: sanctions escrow (nuke-from-orbit) releases on borrower override",
    async () => {
      // Not automatable here, on two independent counts:
      //  1. The app has no sanctions surface at all on this build — the only matches for
      //     "sanction"/"escrow" in src/ are MLA template prose (src/app/api/mla/default-mla.json)
      //     and the `useOnNukeFromOrbit` hook FLAG label (src/constants/i18nKeys.ts). Nothing
      //     renders escrowed balances, a sanctioned-lender state, or a borrower override.
      //  2. The harness has no test sanctions oracle: the fork inherits Sepolia's real
      //     WildcatSanctionsSentinel/Chainalysis oracle, and flagging an address would need the
      //     oracle owner. The runsheet itself says "Mark N/A if no test oracle".
      // Unblock: a mock oracle in harness/fork + an app surface for escrowed positions.
    },
  )

  test.fixme(
    "EDG-09: markets of a defaulted/deregistered borrower are surfaced distinctly",
    async () => {
      // Blocked on the ADM-11 dependency and on a chain-time cost this fork cannot absorb:
      //  - "Deregistered in ADM-11": no admin (ADM-*) suite exists on this harness, and
      //    deregistering anvil #3 through MockArchControllerOwner.removeBorrower would break every
      //    page-3/page-4 fixture (the borrower dashboard hides its tables and the create-market CTA
      //    when isRegisteredBorrower is false — src/app/[locale]/borrower/page.tsx).
      //  - "Defaulted" in the app is a different notion: isMarketInDefault (utils/marketStatus.ts)
      //    needs timeDelinquent - delinquencyGracePeriod >= 90 days, i.e. a permanent ~3-month
      //    chain jump. Per e2e/CONVENTIONS.md big jumps are permanent for the fork lifetime, so
      //    this cannot run alongside the other suites.
      // Note for the runsheet: the LENDER side has no "defaulted" treatment for a DEREGISTERED
      // borrower at all — only countMarketsInDefault (a penalty-duration metric on profile pages)
      // and the Explore penalty-borrower exclusion asserted by EDG-08.
    },
  )

  test.fixme(
    "EDG-14: docs.wildcat.finance matches shipped v2.5 RCF and periodic-hook behaviour",
    async () => {
      // External documentation site; the harness runs offline against a local fork and the runsheet
      // asks for a human spot-check ("log gaps for the docs backlog"). The shipped behaviour side
      // of the comparison is already pinned by BOP-16/BOP-33 (RCF pricing) and LEN-23/25/35 +
      // BOP-17 (periodic windows) — those are the oracle a docs reviewer should read against.
    },
  )

  test.fixme(
    "EDG-15: the Telegram notification bot fires for on-chain actions",
    async () => {
      // External service. The bot is not pointed at this fork (its subscriptions are keyed to a
      // hosted chain/subgraph), and the app only links out to it — MarketActions renders a
      // "modals.shared.help.telegram.botButton" link, nothing subscribable from the harness.
      // The runsheet allows "Mark N/A if bot not pointed at Sepolia".
    },
  )
})

// Mobile needs its own describe: `test.use` applies per describe block.
test.describe("edge & regression: mobile (UAT 10)", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  })

  test("EDG-11: the core lender loop is usable on a mobile viewport", async ({
    page,
  }) => {
    test.setTimeout(300_000)
    const account = account0
    // Wallet connection on mobile: the Local Anvil connector auto-reconnects from the seeded
    // cookie, and the mobile header renders the trimmed address as plain text (Header/MobileMenu),
    // not as a button — so ensureConnected's role query does not apply here.
    await connectAs(page, 0)
    const shortAddress = new RegExp(
      `${account.slice(0, 6)}.*${account.slice(-4)}`,
      "i",
    )

    await step(
      page,
      "explore renders and the wallet is connected",
      async () => {
        await gotoAligned(page, "/lender")
        await expect(page.getByText(shortAddress).first()).toBeVisible({
          timeout: 90_000,
        })
        await expect(page.getByText("Top Markets").first()).toBeVisible({
          timeout: 90_000,
        })
        const overflow = await horizontalOverflowPx(page)
        attachAgreement("EDG-11 explore (mobile)", {
          viewport: MOBILE_VIEWPORT,
          horizontalOverflowPx: overflow,
        })
        expect(
          overflow,
          "explore fits the mobile viewport",
        ).toBeLessThanOrEqual(2)
        await expectNoWhiteScreen(page, "mobile /lender")
      },
    )

    await step(page, "market detail renders the lender actions", async () => {
      const marketId = pinnedMarkets.openTerm.toLowerCase()
      await gotoAligned(page, `/lender/market/${marketId}`)
      await expect(page.getByText(shortAddress).first()).toBeVisible({
        timeout: 90_000,
      })
      // MobileMarketActions reuses the same copy as the desktop TransactionBlocks.
      await expect(
        page
          .getByText(/Available For Withdraw Requests|Available To Deposit/)
          .first(),
      ).toBeVisible({ timeout: 120_000 })
      const overflow = await horizontalOverflowPx(page)
      const body = await expectNoWhiteScreen(page, "mobile market page")
      const marketName = (await subgraph.market(marketId))?.name ?? ""
      attachAgreement("EDG-11 market detail (mobile)", {
        market: marketId,
        horizontalOverflowPx: overflow,
        hasDepositAction:
          (await page.getByRole("button", { name: /^deposit$/i }).count()) > 0,
      })
      expect(
        overflow,
        "market detail fits the mobile viewport",
      ).toBeLessThanOrEqual(2)
      expect(
        formatterLeaks(body, [marketName]),
        "no formatter leaks on the mobile market page",
      ).toEqual([])
    })
  })
})
