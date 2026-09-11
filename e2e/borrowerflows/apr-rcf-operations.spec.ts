/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits } from "viem"

import {
  advanceChainTo,
  commitmentFeeBips,
  drawnAmount,
  formatBps,
  liveMarketState,
  parameterRow,
  readParameterValue,
  resyncPageClock,
  type LiveMarketState,
} from "./aprLib"
import {
  BORROWER,
  borrowOnChain,
  borrowerMarkets,
  closeDialog,
  ensureBorrowerTouSigned,
  gotoBorrowerMarket,
  marketApr,
  marketBorrowable,
  tempExcessReserveRatio,
  repayOnChain,
  waitBorrowerTxSuccess,
  type BorrowerMarketRow,
} from "./lib"
import {
  account1,
  ensureTouSigned,
  marketScaledBalance,
  marketTotalAssets,
  marketTotalDebts,
  openSection,
  repayAndProcessUnpaidBatches,
  unpaidBatchExpiries,
} from "../lenderflows/lib"
import * as chain from "../lib/chain"
import { faucet, syncSubgraph, type Address } from "../lib/env"
import {
  absDiffBig,
  BIP,
  impliedAprCentiBips,
  mulDiv,
  normalizeAmount,
  predictRevolvingAccrual,
  type RevolvingAccrualPrediction,
} from "../lib/marketMath"
import {
  connectAs,
  ensureConnected,
  gotoMarket,
  readAvailableToWithdraw,
} from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import { expect, test, type Locator, type Page } from "../lib/test"

/**
 * Revolving-credit-facility (RCF) pricing, yield and APR adjustment — ONE fixture lifecycle
 * covering three runsheet cases, as COVERAGE-SUGGESTIONS-2026-09-08 §1 requires ("Reuse this
 * scenario to cover BOP-33 and LEN-26 with separate borrower-cost/lender-yield assertions,
 * rather than running two expensive identical fixture lifecycles"):
 *
 *   BOP-16  (page 4)  utilisation-APR adjust dialog: labelled Utilisation, targets the utilisation
 *                     APR, commitment component immutable, layout stable when the reduction
 *                     notice appears.
 *   BOP-33  (page 4)  RCF draw pricing: borrower cost at MEASURED 0% / partial / near-full
 *                     utilisation, and after a repayment.
 *   LEN-26  (page 5)  lender yield through those same utilisation phases.
 *
 * FILE NAME / ORDERING: Playwright runs spec files in path order, and
 * `borrowerflows/borrower-ops.spec.ts` ends with BOP-14's PERMANENT two-week chain-time jump.
 * "apr-" sorts before "borrower-", so this suite (and apr-periodic.spec.ts) run while chain time
 * is still close to the wall clock, which the signature ceremonies in setup require
 * (CONVENTIONS "Time"). Do not rename these files to sort later.
 *
 * COMPARISON NOTE: rows pair by UAT id (`e2e/lib/compare.ts`), not by suite+title, so moving a
 * case between files no longer de-pairs it. All three cases are v2.5-only: revolving markets do
 * not exist on main, so there is no main-side row to pair with — not a lost comparison.
 *
 * ---------------------------------------------------------------------------------------------
 * VERIFIED GENERATION SEMANTICS (v2.5-protocol; the fixture's subgraph `generation` is v2.5.3).
 * Read from the deployed source BEFORE any oracle was written:
 *
 *  - WildcatMarketRevolving.sol:126-158 `_calculateRevolvingBaseInterest`
 *      baseInterestRay = linear(commitmentFeeBips, dt)
 *                      + mulDiv(linear(annualInterestBips, dt), min(drawn, totalSupply), totalSupply)
 *    Commitment interest on the WHOLE deposited supply, plus utilisation-weighted interest whose
 *    drawn exposure is CAPPED at total supply (:154). No accrual at all while the market is
 *    closed or `scaledTotalSupply == 0` (:135).
 *  - WildcatMarketRevolving.sol:17 + :54 — `_commitmentFeeBips` is an `internal immutable` read
 *    from the factory during construction. No setter exists on the market or on its hooks: the
 *    commitment component is immutable for this generation. BOP-16 proves that at runtime rather
 *    than trusting the source alone.
 *  - FeeMath.sol:40 `applyProtocolFee` — "Protocol fee is charged in addition to the interest
 *    paid to lenders". Lenders receive the whole base interest through the scale factor and the
 *    borrower additionally owes `protocolFeeBips` of it, so lender yield and borrower cost differ
 *    by exactly the protocol fee.
 *  - NO PER-DRAW FEE EXISTS: `_onBorrow` (:79) only re-derives `_drawnAmount` and moves no value.
 *    The feature was expressly excluded
 *    (mono/kb/workstreams/v2.5/RCF_DRAW_FEE_DECISION_2026-08-12.md), so this suite asserts each
 *    draw pays out IN FULL and never expects a fee.
 *
 * The app's model (src/utils/marketApr.ts:27-38) renders the SDK's `currentRevolvingAprMetrics`,
 * which floors `utilizationAprBips = drawnClamped * annualInterestBips / totalSupply` to whole
 * bips. The oracle in ../lib/marketMath.ts is derived from the protocol formula instead, never
 * from that helper (COVERAGE-SUGGESTIONS: "Do not mirror the app's helper calculation as the sole
 * expected-value oracle").
 * ---------------------------------------------------------------------------------------------
 */

/** Accrual window per phase. Bounded: the four phases move chain time by ~2 h in total. */
const ACCRUAL_SECONDS = 1_800

/** Target lender position; well above the fixture's 100-unit minimum deposit. */
const DEPOSIT_UNITS = "10000"

/**
 * Liquidity deliberately left undrawn on the near-full draw. `liquidityRequired()` on this
 * fixture is just `accruedProtocolFees` (reserve ratio 0) and grows as interest accrues, so
 * drawing the last wei would tip the market delinquent mid-window and add a second (delinquency)
 * term to every prediction. Five units is ~0.05% of the position and orders of magnitude above
 * the fees accrued over the whole run.
 */
const NON_DELINQUENCY_BUFFER_UNITS = "5"

type Phase = {
  label: string
  dt: bigint
  drawn: bigint
  scaledTotalSupply: bigint
  lenderScaled: bigint
  before: LiveMarketState
  after: LiveMarketState
  lenderBalanceBefore: bigint
  lenderBalanceAfter: bigint
  predicted: RevolvingAccrualPrediction
  measuredUtilizationBips: bigint
  displayed?: Record<string, string>
  displayedExpectedEffectiveBips?: bigint
}

test.describe
  .serial("borrower flows: RCF pricing & APR (BOP-16/33, LEN-26)", () => {
  let rcf: BorrowerMarketRow | undefined
  let market: Address
  let token: Address
  let decimals = 18
  let commitmentBips = 0n
  let protocolFeeBips = 0n
  let utilizationAprBips = 0n
  const phases: Phase[] = []

  const requireRcf = () =>
    test.skip(
      !rcf,
      "no open, non-periodic REVOLVING market owned by borrower #3 — the page-3 suite's MKT-05 deploys it",
    )

  const units = (v: string) => parseUnits(v, decimals)

  /** Utilisation exactly as the contract defines it: min(drawn, totalSupply) / totalSupply. */
  const utilizationOf = (state: LiveMarketState, drawn: bigint) => {
    const supply = normalizeAmount(state.scaledTotalSupply, state.scaleFactor)
    if (supply === 0n) return { supply, clamped: 0n, bips: 0n }
    const clamped = drawn < supply ? drawn : supply
    return { supply, clamped, bips: mulDiv(clamped, BIP, supply) }
  }

  /**
   * The borrower market page renders MarketParameters only in "Status and Details"
   * (borrower/market/[address]/page.tsx:377-390). The sidebar can still be re-rendering when
   * the click lands, so retry until the section actually mounts.
   */
  const openStatusDetails = async (page: Page) => {
    await expect(async () => {
      await page
        .getByRole("button", { name: /status and details/i })
        .first()
        .click({ timeout: 15_000 })
      await expect(parameterRow(page, "Commitment APR").first()).toBeVisible({
        timeout: 8_000,
      })
    }).toPass({ timeout: 180_000 })
  }

  /**
   * MarketTransactions — which owns the "Adjust Utilization APR" opener — mounts ONLY in the
   * default "Borrow and Repay" section (borrower/market/[address]/page.tsx), so opening
   * Status & Details unmounts the button. Switch back (retrying: the sidebar re-renders on every
   * poll) and hand back the opener.
   */
  const aprOpener = async (page: Page) => {
    const opener = page
      .getByRole("button", { name: /^adjust utilization apr$/i })
      .first()
    await expect(async () => {
      if (!(await opener.isVisible().catch(() => false))) {
        await page
          .getByRole("button", { name: /borrow and repay/i })
          .first()
          .click({ timeout: 10_000 })
      }
      await expect(opener).toBeVisible({ timeout: 8_000 })
    }).toPass({ timeout: 180_000 })
    return opener
  }

  /**
   * Read the value of a `ModalDataItem` row inside the APR dialog (title + value in one flex
   * container two levels above the title text).
   */
  const readModalRow = async (dialog: Locator, title: string) => {
    const text = await dialog
      .getByText(title, { exact: true })
      .first()
      .locator("xpath=../..")
      .innerText()
    return text.replace(/\s+/g, " ").trim()
  }

  /** Read a parameter row without throwing — safe inside `expect.poll`. */
  const safeParameterValue = async (page: Page, title: string) => {
    const row = parameterRow(page, title)
    if ((await row.count()) !== 1) return ""
    return (await row.innerText())
      .replace(/\s+/g, " ")
      .trim()
      .slice(title.length)
      .trim()
  }

  /**
   * Measure ONE accrual window: arrange -> settle -> baseline read -> jump -> settle -> read.
   * `liveMarketState` is read immediately after each `updateState` and before any other mining,
   * so both reads are the states actually written on chain (see aprLib).
   */
  const runPhase = async (label: string, arrange: () => Promise<void>) => {
    await arrange()
    await chain.updateState(BORROWER, market)

    const before = await liveMarketState(market)
    const drawn = await drawnAmount(market)
    const lenderScaled = await marketScaledBalance(market, account1)
    const lenderBalanceBefore = await chain.marketBalance(market, account1)

    // The oracle has no delinquency term (FeeMath.sol:51 would add one). Prove the premise
    // rather than assume it: a delinquent window silently adds a penalty rate to every number.
    expect(before.isDelinquent, `${label}: fixture is not delinquent`).toBe(
      false,
    )
    expect(before.timeDelinquent, `${label}: delinquency timer at zero`).toBe(0)
    expect(
      before.scaledPendingWithdrawals,
      `${label}: no pending withdrawals distorting supply`,
    ).toBe(0n)

    await advanceChainTo(
      before.lastInterestAccruedTimestamp + ACCRUAL_SECONDS,
      label,
    )
    await chain.updateState(BORROWER, market)

    const after = await liveMarketState(market)
    const drawnAfter = await drawnAmount(market)
    const lenderBalanceAfter = await chain.marketBalance(market, account1)

    expect(
      drawnAfter,
      `${label}: drawn amount constant across the window`,
    ).toBe(drawn)
    expect(
      after.scaledTotalSupply,
      `${label}: scaled supply constant across the window (rebase only)`,
    ).toBe(before.scaledTotalSupply)

    const dt = BigInt(
      after.lastInterestAccruedTimestamp - before.lastInterestAccruedTimestamp,
    )
    expect(dt > 0n, `${label}: chain time advanced`).toBe(true)

    const predicted = predictRevolvingAccrual({
      commitmentFeeBips: commitmentBips,
      annualInterestBips: before.annualInterestBips,
      drawnAmount: drawn,
      scaledTotalSupply: before.scaledTotalSupply,
      scaleFactor: before.scaleFactor,
      protocolFeeBips: before.protocolFeeBips,
      timeDelta: dt,
      isClosed: before.isClosed,
    })

    const phase: Phase = {
      label,
      dt,
      drawn,
      scaledTotalSupply: before.scaledTotalSupply,
      lenderScaled,
      before,
      after,
      lenderBalanceBefore,
      lenderBalanceAfter,
      predicted,
      measuredUtilizationBips: utilizationOf(before, drawn).bips,
    }
    phases.push(phase)
    return phase
  }

  /**
   * Assert the market page reflects THIS phase, then record what it showed.
   *
   * Nothing mines between the phase's closing `updateState` and this read, so the chain state
   * the app's lens read sees is exactly `phase.after` — the expected effective APR is computed
   * from that measured state, not from a nominal "50% of capacity".
   */
  const assertDisplayedPricing = async (page: Page, phase: Phase) => {
    const util = utilizationOf(phase.after, phase.drawn)
    const expectedEffectiveBips =
      commitmentBips +
      (util.supply > 0n
        ? mulDiv(util.clamped, utilizationAprBips, util.supply)
        : 0n)
    phase.displayedExpectedEffectiveBips = expectedEffectiveBips

    await resyncPageClock(page)
    await page.reload()
    await openStatusDetails(page)

    // The page is fed by a live lens read that lands a beat after the reload; poll the row
    // rather than snapshotting a stale render. A one-bip band absorbs the app's floor-to-bips
    // rounding at a boundary.
    await expect
      .poll(
        async () => {
          const text = await safeParameterValue(page, "Effective Lender APR")
          const shown = Math.round(parseFloat(text.replace("%", "")) * 100)
          return Number.isFinite(shown)
            ? Math.abs(shown - Number(expectedEffectiveBips))
            : 1_000_000
        },
        {
          timeout: 120_000,
          message: `${phase.label}: Effective Lender APR should reach ~${expectedEffectiveBips} bips`,
        },
      )
      .toBeLessThanOrEqual(1)

    const configuredRow = parameterRow(page, "Utilization APR")
    const tooltips = await configuredRow
      .locator("[aria-label]")
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute("aria-label") ?? ""),
      )

    phase.displayed = {
      utilizationApr: await readParameterValue(page, "Utilization APR"),
      commitmentApr: await readParameterValue(page, "Commitment APR"),
      effectiveApr: await readParameterValue(page, "Effective Lender APR"),
      protocolApr: await readParameterValue(page, "Protocol Fee APR"),
      utilizationTooltip:
        tooltips.find((t) => t.startsWith("Current utilization:")) ?? "",
    }

    expect(
      phase.displayed.commitmentApr,
      `${phase.label}: commitment APR row`,
    ).toBe(`${formatBps(commitmentBips)}%`)
    expect(
      phase.displayed.utilizationApr,
      `${phase.label}: configured utilisation APR row`,
    ).toBe(`${formatBps(utilizationAprBips)}%`)
    expect(
      phase.displayed.utilizationTooltip,
      `${phase.label}: the configured-APR row explains the current utilisation`,
    ).toMatch(/^Current utilization: [\d.]+% of deposited capital is drawn\.$/)
  }

  test("setup: discover the MKT-05 revolving fixture and arrange a lender position", async ({
    page,
  }) => {
    test.setTimeout(600_000)

    // A revolving market that is NOT periodic: the APR write BOP-16 drives must take the
    // direct `setAnnualInterestAndReserveRatioBips` path, not the periodic proposal path
    // (that flow is apr-periodic.spec.ts). MKT-05 is exactly this; MKT-07 is both.
    const all = await borrowerMarkets()
    rcf = all.find(
      (m) =>
        !m.isClosed &&
        m.marketKind === "REVOLVING" &&
        (m.hooksConfig?.periodDuration ?? 0) === 0,
    )
    attachAgreement("RCF fixture discovery", {
      borrowerMarkets: all.length,
      revolving: all
        .filter((m) => m.marketKind === "REVOLVING")
        .map((m) => ({
          id: m.id,
          name: m.name,
          isClosed: m.isClosed,
          periodDuration: m.hooksConfig?.periodDuration ?? 0,
        })),
      chosen: rcf ? { id: rcf.id, name: rcf.name } : null,
    })
    requireRcf()

    market = rcf!.id as Address
    token = rcf!.asset.address as Address
    decimals = rcf!.asset.decimals

    // Wall-clock signature ceremonies FIRST: /api/sla bounds the client-sent timeSigned against
    // the SERVER clock and this suite time-travels afterwards (CONVENTIONS "Time"). Both are
    // no-ops when already signed. Each ceremony needs the connector seeded with ITS OWN account
    // — `ensureConnected` matches the header chip by address, so signing as the borrower and
    // then as the lender on one page requires re-seeding in between.
    await connectAs(page, 3)
    await ensureBorrowerTouSigned(page)
    await connectAs(page, 1)
    await ensureTouSigned(page, account1, market)
    // No MLA acknowledgement is needed: this suite deposits CHAIN-side and only READS the lender
    // market page (LEN-26), and the no-MLA acknowledgement modal is raised by the deposit dialog.

    commitmentBips = await commitmentFeeBips(market)
    utilizationAprBips = await marketApr(market)
    protocolFeeBips = (await liveMarketState(market)).protocolFeeBips

    expect(commitmentBips > 0n, "fixture prices a commitment fee").toBe(true)
    expect(utilizationAprBips > 0n, "fixture prices a utilisation APR").toBe(
      true,
    )

    // Self-clean (CONVENTIONS "State hygiene"): a previous run can leave the facility drawn
    // and/or batches unpaid. Restore drawn == 0 with no pending withdrawals so the phase
    // ladder always starts from a measured, undrawn baseline.
    await step(
      page,
      "self-clean: settle batches, repay to undrawn",
      async () => {
        const shortfall = async () => {
          const debts = await marketTotalDebts(market)
          const assets = await marketTotalAssets(market)
          return debts > assets ? debts - assets : 0n
        }
        const unpaid = await unpaidBatchExpiries(market)
        if (unpaid.length > 0) {
          const amount = (await shortfall()) + units("1")
          faucet(BORROWER, amount * 2n, token)
          await chain.approve(BORROWER, token, market, amount * 2n)
          await repayAndProcessUnpaidBatches(BORROWER, market, amount, 10n)
        }
        // `_onRepayAndGetTotalAssets` re-derives drawn as `totalDebts - totalAssets` AFTER the
        // repayment (WildcatMarketRevolving.sol:92-103), and interest accrues in the block that
        // carries the repayment — repaying the exact measured shortfall therefore leaves a few
        // wei drawn. Overpay by a unit so the outstanding debt saturates to zero, and retry:
        // the market keeps the surplus as assets, which the phase ladder simply measures.
        for (let attempt = 0; (await drawnAmount(market)) > 0n; attempt += 1) {
          expect(
            attempt < 3,
            `could not return the facility to fully undrawn (drawn ${await drawnAmount(
              market,
            )})`,
          ).toBe(true)
          const owed = (await shortfall()) + units("1")
          faucet(BORROWER, owed * 2n + units("10"), token)
          await chain.approve(BORROWER, token, market, owed * 2n)
          await repayOnChain(BORROWER, market, owed)
          await chain.updateState(BORROWER, market)
        }
        expect(
          await drawnAmount(market),
          "cleaned to a fully undrawn facility",
        ).toBe(0n)
      },
    )

    await step(page, "lender #1 holds a position", async () => {
      const target = units(DEPOSIT_UNITS)
      const held = await chain.marketBalance(market, account1)
      if (held < target) {
        const need = target - held
        faucet(account1, parseUnits("1", 18))
        faucet(account1, need * 2n, token)
        await chain.approve(account1, token, market, need * 2n)
        await chain.depositUpTo(account1, market, need)
      }
      expect(
        (await chain.marketBalance(market, account1)) > 0n,
        "lender #1 holds market tokens",
      ).toBe(true)
    })

    faucet(BORROWER, parseUnits("1", 18))
    await syncSubgraph()

    const state = await liveMarketState(market)
    attachAgreement("RCF fixture", {
      market,
      name: rcf!.name,
      asset: { address: token, symbol: rcf!.asset.symbol, decimals },
      commitmentFeeBips: commitmentBips.toString(),
      utilizationAprBips: utilizationAprBips.toString(),
      protocolFeeBips: protocolFeeBips.toString(),
      reserveRatioBips: state.reserveRatioBips.toString(),
      drawnAmount: (await drawnAmount(market)).toString(),
      lenderPosition: formatUnits(
        await chain.marketBalance(market, account1),
        decimals,
      ),
      totalSupply: formatUnits(
        normalizeAmount(state.scaledTotalSupply, state.scaleFactor),
        decimals,
      ),
    })
  })

  test("BOP-16: RCF market — utilisation APR dialog", async ({ page }) => {
    requireRcf()
    test.setTimeout(600_000)

    const aprBefore = await marketApr(market)
    const commitmentBefore = await commitmentFeeBips(market)
    // Each run of this case raises the fixture's utilisation APR by 2%. Fail loudly rather than
    // creep towards MaximumAnnualInterestBips over many board runs.
    expect(
      aprBefore <= 5_000n,
      `MKT-05's utilisation APR is already ${aprBefore} bips — repeated BOP-16 runs each add 200; re-deploy the page-3 fixtures (or dev:fork:reset) before running this again`,
    ).toBe(true)
    const target = aprBefore + 200n // +2.00%: an INCREASE, so no reserve-ratio peg is created
    /**
     * The reduction used to raise the notice. MarketConstraintHooks.sol:169 leaves the reserve
     * ratio alone for a relative reduction of 25% or less, so a token 2% cut on this fixture
     * (reserve ratio 0) would change nothing and render no notice at all. 55% of the new rate is
     * a 45% relative reduction — above that threshold, and still above the app's own displayed
     * floor (AprModal#getMinimumAPR allows at most a 50% cut at full collateralisation).
     */
    const reductionTarget = (target * 55n) / 100n

    await connectAs(page, 3)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    await step(page, "parameters name the UTILISATION APR", async () => {
      await openStatusDetails(page)
      // The runsheet's first expectation: this market prices a utilisation APR and the app
      // must not call it a base APR (src/utils/marketApr.ts:69-76).
      await expect(parameterRow(page, "Utilization APR")).toHaveCount(1, {
        timeout: 90_000,
      })
      // "Base Lender APR" is the STANDARD variant's label for the same row
      // (market-implementation-variants/legacy.ts:10 -> marketParameters.baseAPR): its presence
      // here would mean the app fell back to the standard copy on a revolving market.
      await expect(parameterRow(page, "Base Lender APR")).toHaveCount(0)
      expect(await readParameterValue(page, "Utilization APR")).toBe(
        `${formatBps(aprBefore)}%`,
      )
      expect(await readParameterValue(page, "Commitment APR")).toBe(
        `${formatBps(commitmentBefore)}%`,
      )
    })

    await step(
      page,
      "increase the utilisation APR through the UI",
      async () => {
        const opener = await aprOpener(page)
        await opener.click()

        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible({ timeout: 30_000 })
        // The dialog itself must be utilisation-labelled, never "Base APR".
        await expect(
          dialog.getByText("Current Utilization APR", { exact: true }),
        ).toBeVisible({ timeout: 30_000 })
        await expect(
          dialog.getByText("Current Base APR", { exact: true }),
        ).toHaveCount(0)

        await dialog
          .getByRole("textbox")
          .first()
          .fill((Number(target) / 100).toFixed(2))
        await dialog.getByRole("button", { name: /^confirm$/i }).click()
        await dialog.getByRole("checkbox").check()
        const adjust = dialog.getByRole("button", { name: /^adjust$/i })
        await expect(adjust).toBeEnabled({ timeout: 30_000 })
        await adjust.click()
        await waitBorrowerTxSuccess(page)
        await closeDialog(page)
      },
    )

    // The write must actually land: a success modal is not evidence (KNOWN-ISSUES #5).
    expect(
      await marketApr(market),
      "the dialog targets the market's utilisation APR (annualInterestBips)",
    ).toBe(target)
    expect(
      await commitmentFeeBips(market),
      "commitment component unchanged — WildcatMarketRevolving.sol:17 immutable, no setter",
    ).toBe(commitmentBefore)
    utilizationAprBips = target

    await step(page, "page reflects the new utilisation APR", async () => {
      await page.reload()
      await openStatusDetails(page)
      await expect(parameterRow(page, "Utilization APR")).toContainText(
        `${formatBps(target)}%`,
        { timeout: 120_000 },
      )
      expect(
        await readParameterValue(page, "Commitment APR"),
        "commitment APR row unchanged by a utilisation-APR adjustment",
      ).toBe(`${formatBps(commitmentBefore)}%`)
    })

    // Runsheet: "dialog layout stays stable when the reduction notice appears". A reduction on
    // this OPEN-term revolving market pegs a TEMPORARY reserve ratio for two weeks
    // (MarketConstraintHooks.sol:249), which would move `borrowableAssets` and the delinquency
    // headroom the BOP-33/LEN-26 ladder depends on. The notice is therefore inspected WITHOUT
    // submitting; the reduction transaction itself is out of scope for this shared fixture.
    const reductionNotice = await step(
      page,
      "reduction notice renders without breaking the dialog",
      async () => {
        await (await aprOpener(page)).click()
        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible({ timeout: 30_000 })

        const ratioBefore = await readModalRow(dialog, "Reserve Ratio")
        await dialog
          .getByRole("textbox")
          .first()
          .fill((Number(reductionTarget) / 100).toFixed(2))

        // The temporary-reserve-ratio line IS the reduction notice.
        const timer = dialog.getByText(
          /Temporary reserve ratio in force until/i,
        )
        await expect(timer).toBeVisible({ timeout: 30_000 })
        const ratioAfter = await readModalRow(dialog, "Reserve Ratio")
        expect(
          ratioAfter,
          "the notice comes with the temporarily-raised reserve ratio it describes",
        ).not.toBe(ratioBefore)

        // Layout stability: still ONE dialog, still utilisation-labelled, effects box intact,
        // no fixed-term "Forbidden" state, and the form still submittable.
        await expect(page.getByRole("dialog")).toHaveCount(1)
        await expect(
          dialog.getByText("Current Utilization APR", { exact: true }),
        ).toBeVisible()
        await expect(
          dialog.getByText("Effects Of APR Adjustment", { exact: true }),
        ).toBeVisible()
        await expect(
          dialog.getByText("Collateral Obligation", { exact: true }),
        ).toBeVisible()
        await expect(
          dialog.getByText("Reserve Ratio", { exact: true }),
        ).toBeVisible()
        await expect(
          dialog.getByRole("button", { name: /forbidden/i }),
        ).toHaveCount(0)
        await expect(
          dialog.getByRole("button", { name: /^confirm$/i }),
        ).toBeEnabled({ timeout: 30_000 })

        const notice = (await timer.innerText()).trim()
        await closeDialog(page)
        return { notice, ratioBefore, ratioAfter }
      },
    )

    expect(
      await marketApr(market),
      "inspecting the reduction notice sent no transaction",
    ).toBe(target)

    await syncSubgraph()
    attachAgreement("BOP-16 utilisation APR adjustment", {
      market,
      aprBeforeBips: aprBefore.toString(),
      aprAfterBips: target.toString(),
      commitmentFeeBipsBefore: commitmentBefore.toString(),
      commitmentFeeBipsAfter: (await commitmentFeeBips(market)).toString(),
      commitmentImmutability:
        "WildcatMarketRevolving.sol:17 `internal immutable _commitmentFeeBips`, set in the " +
        "constructor from the factory (:20-52); no setter exists on the market or the hooks.",
      reductionTargetBips: reductionTarget.toString(),
      reductionNotice,
    })
  })

  test("BOP-33: RCF draw pricing", async ({ page }) => {
    requireRcf()
    test.setTimeout(1_200_000)

    await connectAs(page, 3)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    const buffer = units(NON_DELINQUENCY_BUFFER_UNITS)
    /** What each draw actually paid out — the no-per-draw-fee observation. */
    const draws: Record<string, string>[] = []

    const borrowAndRecord = async (amount: bigint) => {
      const balBefore = await chain.erc20Balance(token, BORROWER)
      const drawnBefore = await drawnAmount(market)
      await borrowOnChain(market, amount)
      const received = (await chain.erc20Balance(token, BORROWER)) - balBefore
      const drawnAfter = await drawnAmount(market)
      // NOT a fee expectation — the opposite. The per-draw fee was expressly excluded
      // (RCF_DRAW_FEE_DECISION_2026-08-12), so a draw must pay out in full.
      expect(received, "draw pays out in full — there is no per-draw fee").toBe(
        amount,
      )
      draws.push({
        requested: formatUnits(amount, decimals),
        received: formatUnits(received, decimals),
        drawnBefore: formatUnits(drawnBefore, decimals),
        drawnAfter: formatUnits(drawnAfter, decimals),
      })
    }

    await step(page, "phase 1 — undrawn facility", async () => {
      const phase = await runPhase("undrawn", async () => {
        expect(
          await drawnAmount(market),
          "phase 1 starts from a fully undrawn facility",
        ).toBe(0n)
      })
      await assertDisplayedPricing(page, phase)
    })

    await step(page, "phase 2 — partial draw (~50% of supply)", async () => {
      const phase = await runPhase("partial draw", async () => {
        const state = await liveMarketState(market)
        const supply = normalizeAmount(
          state.scaledTotalSupply,
          state.scaleFactor,
        )
        const borrowable = await marketBorrowable(market)
        const half = supply / 2n
        await borrowAndRecord(half < borrowable ? half : borrowable)
      })
      await assertDisplayedPricing(page, phase)
    })

    await step(page, "phase 3 — near-full draw", async () => {
      const phase = await runPhase("near-full draw", async () => {
        const borrowable = await marketBorrowable(market)
        expect(
          borrowable > buffer,
          "headroom remains for a near-full draw",
        ).toBe(true)
        await borrowAndRecord(borrowable - buffer)
      })
      await assertDisplayedPricing(page, phase)
    })

    await step(page, "phase 4 — after a repayment", async () => {
      const phase = await runPhase("after repay", async () => {
        const drawn = await drawnAmount(market)
        const repayment = (drawn * 6n) / 10n
        faucet(BORROWER, repayment + units("10"), token)
        await chain.approve(BORROWER, token, market, repayment * 2n)
        await repayOnChain(BORROWER, market, repayment)
        expect(
          (await drawnAmount(market)) < drawn,
          "repayment reduces the drawn amount (WildcatMarketRevolving.sol:92-103)",
        ).toBe(true)
      })
      await assertDisplayedPricing(page, phase)
    })

    // ---- oracle: every window's scale factor and protocol fee, to the wei ----
    for (const p of phases) {
      const measuredProtocolFee =
        p.after.accruedProtocolFees - p.before.accruedProtocolFees
      const lenderInterest =
        normalizeAmount(p.scaledTotalSupply, p.after.scaleFactor) -
        normalizeAmount(p.scaledTotalSupply, p.before.scaleFactor)

      expect(
        absDiffBig(p.after.scaleFactor, p.predicted.scaleFactorAfter) <= 2n,
        `${p.label}: scale factor matches the revolving formula ` +
          `(measured ${p.after.scaleFactor}, predicted ${p.predicted.scaleFactorAfter})`,
      ).toBe(true)
      expect(
        absDiffBig(measuredProtocolFee, p.predicted.protocolFee) <= 2n,
        `${p.label}: protocol fee matches applyProtocolFee ` +
          `(measured ${measuredProtocolFee}, predicted ${p.predicted.protocolFee})`,
      ).toBe(true)
      expect(
        absDiffBig(
          lenderInterest + measuredProtocolFee,
          p.predicted.borrowerCost,
        ) <= 4n,
        `${p.label}: borrower cost = lender interest + protocol fee ` +
          `(measured ${lenderInterest + measuredProtocolFee}, predicted ${
            p.predicted.borrowerCost
          })`,
      ).toBe(true)
      expect(
        measuredProtocolFee > 0n,
        `${p.label}: the protocol fee accrues separately from lender interest`,
      ).toBe(true)
    }

    // ---- the runsheet's two pricing claims, measured ----
    const lenderRateOf = (p: Phase) =>
      impliedAprCentiBips(
        normalizeAmount(p.scaledTotalSupply, p.after.scaleFactor) -
          normalizeAmount(p.scaledTotalSupply, p.before.scaleFactor),
        p.predicted.totalSupplyBefore,
        p.dt,
      )

    const undrawn = phases[0]
    const undrawnRate = lenderRateOf(undrawn)
    expect(
      undrawn.measuredUtilizationBips,
      "phase 1 utilisation is genuinely zero",
    ).toBe(0n)
    // "Commitment fee always accrues on deposits": at 0% utilisation the entire lender rate IS
    // the commitment fee.
    expect(
      absDiffBig(undrawnRate, commitmentBips * 100n) <= commitmentBips,
      `undrawn lender rate is the commitment fee (measured ${undrawnRate} centibips, ` +
        `commitment ${commitmentBips * 100n} centibips)`,
    ).toBe(true)

    // "Utilisation APR scales linearly with drawn proportion": recovering annualInterestBips
    // from each drawn phase must return the configured rate.
    const linearity = phases
      .filter((p) => p.measuredUtilizationBips > 0n)
      .map((p) => {
        const rate = lenderRateOf(p)
        const utilizationComponent = rate - commitmentBips * 100n
        return {
          label: p.label,
          utilizationBips: p.measuredUtilizationBips.toString(),
          impliedLenderRateCentiBips: rate.toString(),
          recoveredUtilizationAprCentiBips: (
            (utilizationComponent * BIP) /
            p.measuredUtilizationBips
          ).toString(),
        }
      })
    expect(
      linearity.length >= 2,
      "at least two distinct non-zero utilisation phases were measured",
    ).toBe(true)
    for (const row of linearity) {
      const recovered = BigInt(row.recoveredUtilizationAprCentiBips)
      const configured = utilizationAprBips * 100n
      expect(
        absDiffBig(recovered, configured) <= configured / 50n,
        `${row.label}: the utilisation APR recovered from the measured accrual is the ` +
          `configured rate (recovered ${recovered} centibips, configured ${configured}) — ` +
          `linear in utilisation`,
      ).toBe(true)
    }

    // Distinct utilisation levels really were exercised.
    const u = phases.map((p) => p.measuredUtilizationBips)
    expect(
      u[1] > 4_000n && u[1] < 6_000n,
      `partial phase landed near half utilisation (${u[1]} bips)`,
    ).toBe(true)
    expect(
      u[2] > 9_500n,
      `near-full phase reached ${u[2]} bips utilisation`,
    ).toBe(true)
    expect(
      u[3] < u[2],
      `repayment lowered measured utilisation (${u[3]} < ${u[2]} bips)`,
    ).toBe(true)

    await syncSubgraph()
    attachAgreement("BOP-33 RCF draw pricing", {
      market,
      commitmentFeeBips: commitmentBips.toString(),
      utilizationAprBips: utilizationAprBips.toString(),
      protocolFeeBips: protocolFeeBips.toString(),
      draws,
      perDrawFee:
        "none — every draw paid out in full; the feature was expressly excluded " +
        "(mono/kb/workstreams/v2.5/RCF_DRAW_FEE_DECISION_2026-08-12.md)",
      phases: phases.map((p) => ({
        phase: p.label,
        seconds: Number(p.dt),
        drawn: formatUnits(p.drawn, decimals),
        totalSupply: formatUnits(p.predicted.totalSupplyBefore, decimals),
        measuredUtilizationBips: p.measuredUtilizationBips.toString(),
        lenderInterest: formatUnits(
          normalizeAmount(p.scaledTotalSupply, p.after.scaleFactor) -
            normalizeAmount(p.scaledTotalSupply, p.before.scaleFactor),
          decimals,
        ),
        predictedLenderInterest: formatUnits(
          p.predicted.lenderInterest,
          decimals,
        ),
        protocolFee: formatUnits(
          p.after.accruedProtocolFees - p.before.accruedProtocolFees,
          decimals,
        ),
        predictedProtocolFee: formatUnits(p.predicted.protocolFee, decimals),
        scaleFactorBefore: p.before.scaleFactor.toString(),
        scaleFactorAfter: p.after.scaleFactor.toString(),
        predictedScaleFactorAfter: p.predicted.scaleFactorAfter.toString(),
        appExpectedEffectiveBips: p.displayedExpectedEffectiveBips?.toString(),
        displayed: p.displayed,
      })),
      linearity,
    })
  })

  test("LEN-26: RCF yield across utilisation phases", async ({ page }) => {
    requireRcf()
    test.setTimeout(600_000)
    test.skip(
      phases.length < 4,
      "BOP-33 did not complete its phase ladder — LEN-26 asserts the lender side of the SAME windows",
    )

    const rows = phases.map((p) => {
      const expected =
        normalizeAmount(p.lenderScaled, p.after.scaleFactor) -
        normalizeAmount(p.lenderScaled, p.before.scaleFactor)
      const measured = p.lenderBalanceAfter - p.lenderBalanceBefore
      const rate = impliedAprCentiBips(measured, p.lenderBalanceBefore, p.dt)
      const expectedRateBips =
        commitmentBips +
        mulDiv(
          p.predicted.drawnClamped,
          p.before.annualInterestBips,
          p.predicted.totalSupplyBefore,
        )
      return { p, expected, measured, rate, expectedRateBips }
    })

    for (const { p, expected, measured, rate, expectedRateBips } of rows) {
      expect(
        measured > 0n,
        `${p.label}: the lender earns in every phase — the commitment fee accrues on deposits ` +
          `even at zero utilisation (WildcatMarketRevolving.sol:143)`,
      ).toBe(true)
      // The lender's balance is a pure rebase of an unchanged scaled balance.
      expect(
        absDiffBig(measured, expected) <= 2n,
        `${p.label}: lender balance growth is the scale-factor rebase ` +
          `(measured ${measured}, expected ${expected})`,
      ).toBe(true)
      expect(
        absDiffBig(rate, expectedRateBips * 100n) <= expectedRateBips,
        `${p.label}: lender yield rate ${rate} centibips ≈ commitment + utilisation-weighted ` +
          `${expectedRateBips * 100n} centibips`,
      ).toBe(true)
    }

    // Yield is a rebase, not new units.
    const scaledBalances = new Set(phases.map((p) => p.lenderScaled.toString()))
    expect(
      scaledBalances.size,
      "lender scaled balance unchanged across the whole ladder",
    ).toBe(1)
    expect(await marketScaledBalance(market, account1)).toBe(
      phases[0].lenderScaled,
    )

    // Yield tracks utilisation.
    expect(
      rows[1].rate > rows[0].rate && rows[1].rate < rows[2].rate,
      `partial draw sits between undrawn and near-full (${rows[0].rate} < ${rows[1].rate} < ${rows[2].rate} centibips)`,
    ).toBe(true)
    expect(
      rows[3].rate < rows[2].rate && rows[3].rate > rows[0].rate,
      `yield falls back after the repayment but stays above the undrawn rate (${rows[3].rate} centibips)`,
    ).toBe(true)

    await step(page, "lender page shows the accrued position", async () => {
      await connectAs(page, 1)
      await gotoMarket(page, market)
      await ensureConnected(page, account1)
      await openSection(
        page,
        /deposit & withdraw/i,
        page.getByTestId("lender-available-withdraw"),
      )
      const available = await readAvailableToWithdraw(page)
      const onChain = await chain.marketBalance(market, account1)
      expect(
        available.raw > phases[0].lenderBalanceBefore,
        `page shows a position grown by accrued yield (${available.raw} > ${phases[0].lenderBalanceBefore})`,
      ).toBe(true)
      // The page is fed by a lens read at its own block; allow a few seconds of interest.
      expect(
        absDiffBig(available.raw, onChain) <= onChain / 100_000n + 10n,
        `page value ${available.raw} tracks the on-chain balance ${onChain}`,
      ).toBe(true)
    })

    await syncSubgraph()
    attachAgreement("LEN-26 RCF lender yield", {
      market,
      lender: account1,
      commitmentFeeBips: commitmentBips.toString(),
      utilizationAprBips: utilizationAprBips.toString(),
      scaledBalance: phases[0].lenderScaled.toString(),
      phases: rows.map(({ p, measured, expected, rate, expectedRateBips }) => ({
        phase: p.label,
        seconds: Number(p.dt),
        utilizationBips: p.measuredUtilizationBips.toString(),
        balanceBefore: formatUnits(p.lenderBalanceBefore, decimals),
        balanceAfter: formatUnits(p.lenderBalanceAfter, decimals),
        yieldMeasured: formatUnits(measured, decimals),
        yieldExpected: formatUnits(expected, decimals),
        impliedRateCentiBips: rate.toString(),
        expectedRateBips: expectedRateBips.toString(),
      })),
      totalYield: formatUnits(
        phases[3].lenderBalanceAfter - phases[0].lenderBalanceBefore,
        decimals,
      ),
    })
  })

  test("BOP-16b: RCF utilisation APR REDUCTION submits through the dialog (runs LAST — creates the reserve-ratio peg)", async ({
    page,
  }) => {
    // Reviewer follow-up: BOP-16 inspects the reduction notice without submitting, so reduction
    // EXECUTION was unproven. This runs after every accrual measurement because submitting a
    // below-original reduction pegs a temporary reserve ratio for two weeks of chain time
    // (MarketConstraintHooks: ANY reduction below the original APR pegs originals + 2-week
    // expiry — the BOP-13 protocol truth), which would poison the ladder's delinquency headroom.
    requireRcf()
    test.setTimeout(600_000)
    const aprBefore = await marketApr(market)
    const commitmentBefore = await commitmentFeeBips(market)
    expect(aprBefore > 0n, "fixture APR present").toBe(true)

    await connectAs(page, 3)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    // Chosen inside the dialog, once the app's enforced minimum APR (reserve floor) is known.
    let reductionTarget = 0n

    await step(page, "submit the reduction through the dialog", async () => {
      const opener = await aprOpener(page)
      await opener.click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })

      // A below-original reduction pegs a temporary reserve ratio of 2x the RELATIVE cut, which
      // the (drawn-against) market must fully reserve. Two thresholds bound a fundable-AND-pegging
      // target: a cut of <=25% carries NO penalty (no peg — AprModal getMinimumAPR), and a cut
      // deeper than the app's displayed minimum is rejected as "Missing Reserves" so Confirm never
      // enables. A fixed 45% cut sat below this board's fixture floor (target 6.6% vs min 8.4%) and
      // hung the suite for 10m. Read the enforced minimum and aim inside [min, 25%-cut): the
      // deepest still-fundable cut, guaranteed >25% so it still creates the peg this test asserts.
      const minHint = dialog.getByText(/min\s*-\s*[\d.]+\s*%/i).first()
      // Cuts strictly deeper than 25% peg; i.e. a target strictly below 75% of the original APR.
      const pegThresholdBips = Math.floor(Number(aprBefore) * 0.75)
      if (await minHint.isVisible().catch(() => false)) {
        const minBips = Math.round(
          parseFloat((await minHint.innerText()).replace(/[^\d.]/g, "")) * 100,
        )
        expect(
          minBips < pegThresholdBips,
          `fixture leaves no fundable >25% reduction (min ${minBips}bps >= 25%-cut ` +
            `threshold ${pegThresholdBips}bps): the drawn-against market cannot reserve the ` +
            `peg — coordinator note: BOP-16b needs the RCF fixture to retain enough liquidity ` +
            `for a >25% reduction's 2x reserve peg`,
        ).toBe(true)
        // Midpoint of [min, 25%-cut): fundable (> min) and pegging (< 25%-cut threshold).
        reductionTarget = BigInt(Math.floor((minBips + pegThresholdBips) / 2))
      } else {
        // No outstanding supply => no reserve constraint => the original 45% cut is fundable.
        reductionTarget = (aprBefore * 55n) / 100n
      }
      expect(
        reductionTarget > 0n && reductionTarget < aprBefore,
        "reduction target is below the current APR",
      ).toBe(true)

      await dialog
        .getByRole("textbox")
        .first()
        .fill((Number(reductionTarget) / 100).toFixed(2))
      const confirm = dialog.getByRole("button", { name: /^confirm$/i })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      await dialog.getByRole("checkbox").check()
      const adjust = dialog.getByRole("button", { name: /^adjust$/i })
      await expect(adjust).toBeEnabled({ timeout: 30_000 })
      await adjust.click()
      await waitBorrowerTxSuccess(page)
      await closeDialog(page)
    })

    // The write must land (success modals are not evidence — KNOWN-ISSUES #5 history).
    expect(
      await marketApr(market),
      "the reduction applied to the utilisation APR",
    ).toBe(reductionTarget)
    expect(
      await commitmentFeeBips(market),
      "commitment component untouched by the reduction",
    ).toBe(commitmentBefore)
    // A >25% reduction pegs the temporary reserve ratio with a ~2-week expiry.
    // temporaryExcessReserveRatio(market) => [originalAnnualInterestBips, originalReserveRatioBips,
    // expiry] (abis.ts): the peg's 2-week clock is peg[2] (expiry), NOT peg[1] — peg[1] is the
    // ORIGINAL (pre-reduction) reserve ratio, 0 for this 0%-reserve RCF fixture, which is why the
    // old index asserted 0 > now the moment the reduction finally submitted.
    const peg = await tempExcessReserveRatio(rcf!.hooks!.id as Address, market)
    const nowTs = await chain.blockTimestamp()
    expect(
      Number(peg[2]) > nowTs + 13 * 86_400,
      `the reduction pegged a temporary reserve ratio expiring ~2 weeks out (expiry ${peg[2]}, now ${nowTs})`,
    ).toBe(true)
    attachAgreement("BOP-16b reduction", {
      aprBefore,
      reductionTarget,
      originalAprBips: peg[0]?.toString?.() ?? String(peg[0]),
      preReductionReserveRatioBips: peg[1]?.toString?.() ?? String(peg[1]),
      pegExpiry: String(peg[2]),
    })
  })
})
