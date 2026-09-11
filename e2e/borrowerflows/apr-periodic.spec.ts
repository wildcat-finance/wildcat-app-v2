/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits } from "viem"

import {
  advanceChainTo,
  formatBps,
  liveMarketState,
  nextWindowStartAt,
  parameterRow,
  pendingAprProposal,
  periodicSchedule,
  proposeAprOnChain,
  readParameterValue,
  resyncPageClock,
  simulateWrite,
  windowOpenAt,
  withdrawalWindowOpen,
  type PeriodicSchedule,
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
  marketReserveRatio,
  repayOnChain,
  setAprOnChain,
  tempExcessReserveRatio,
  waitBorrowerTxSuccess,
  type BorrowerMarketRow,
} from "./lib"
import {
  account1,
  formatWindowStart,
  marketScaledBalance,
  marketTotalAssets,
  marketTotalDebts,
  selfCleanWithdrawals,
  settleUnpaidBatches,
} from "../lenderflows/lib"
import {
  borrowerMarketAbi,
  marketAprExecutionAbi,
  periodicHooksAbi,
} from "../lib/abis"
import * as chain from "../lib/chain"
import { faucet, syncSubgraph, type Address } from "../lib/env"
import * as journal from "../lib/journal"
import { connectAs, ensureConnected } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import { expect, test, type Page } from "../lib/test"

/**
 * BOP-17 — periodic-term APR reduction: open/closed windows, the lender response window,
 * pending-withdrawal blocking, settlement and execution.
 * Runsheet: `uat_4 Borrower Ops.tsv:23`. Design: COVERAGE-SUGGESTIONS-2026-09-08 §2 (branch order
 * 1-6 below is that section's list).
 *
 * FILE NAME / ORDERING: "apr-" sorts before "borrower-", so this suite runs before
 * borrower-ops.spec.ts' terminal BOP-14 two-week chain jump — the wall-clock signature
 * ceremonies in setup need chain time near the wall clock (CONVENTIONS "Time").
 *
 * COMPARISON NOTE: rows pair by UAT id (`e2e/lib/compare.ts`), not by suite+title, so moving a
 * case between files no longer de-pairs it. BOP-17 has no test on main — periodic markets do not
 * exist there — so there is no main-side row to pair with.
 *
 * ---------------------------------------------------------------------------------------------
 * VERIFIED GENERATION SEMANTICS — read from the DEPLOYED source (v2.5-protocol
 * src/access/PeriodicTermHooks.sol) and reconciled against the intended semantics in
 * mono/kb/protocol-design/PERIODIC_TERM_HOOKS_FEATURE_SPEC.md:86. Every assertion below cites
 * the implementation, not the spec:
 *
 *  - :359  `proposeAnnualInterestBips` reverts `AprReductionProposalDuringWithdrawalWindow`
 *          while a withdrawal window is open, and `AprReductionProposalNotReduction` (:375)
 *          unless the new rate is strictly lower.
 *  - :379  responseWindowStart = the NEXT withdrawal-window start after the proposal;
 *    :381  responseWindowEnd   = responseWindowStart + withdrawalWindowDuration.
 *  - :737  execution reverts `AprChangeNotReady` before `responseWindowEnd`, and
 *    :741  `AprReductionProposalExpired` at/after
 *          responseWindowStart + periodDuration * AprReductionProposalValidityPeriods (:142, =1).
 *          The executable span is therefore [responseWindowEnd, responseWindowStart + period).
 *  - :747  `if (intermediateState.scaledPendingWithdrawals != 0) revert UnpaidWithdrawalsExist` —
 *          any unpaid withdrawal obligation blocks the reduction.
 *  - :806  the reduction path returns `(annualInterestBips, intermediateState.reserveRatioBips)`
 *          and NEVER reaches MarketConstraintHooks' temporary-reserve-ratio branch
 *          (MarketConstraintHooks.sol:245-281). WildcatMarketConfig.sol:230 likewise passes the
 *          current ratio for both arguments. RESERVE-RATIO BEHAVIOUR: unchanged, with no
 *          two-week temporary peg — the lender response window replaces that penalty. This is
 *          the periodic contrast with an open-term reduction and is asserted in branch 5.
 *  - :793  an APR INCREASE deletes any pending proposal (branch 6).
 *  - :684  closing the market also deletes a pending proposal (not exercised — the fixture stays
 *          open for re-runs).
 *
 * App surfaces under test: AprModal (index.tsx:128-146 chooses "propose" vs "set";
 * :193-203 renders the SDK's proposal-preview rejection) and MarketTransactions (:127-247,
 * :364-424: the pending banner, its Apply / Settle-and-Apply action and the settlement quote).
 * NOTE the banner's pending-proposal fields are SUBGRAPH-derived (SDK market.js:826 reads
 * `data.hooksConfig.pendingAprChange*`) while the settlement quote is a live lens read
 * (@wildcatfi/wildcat-sdk periodic-settlement.d.ts) — every UI assertion here therefore runs
 * after `syncSubgraph()` and polls.
 *
 * APP/DEPLOYMENT DEFECT FOUND BY THIS SUITE (2026-09-08, current pin) — branch 5.
 * The market's permissionless `executePendingAnnualInterestBipsReduction()` (selector
 * 0x09b70bc7, WildcatMarketConfig.sol:214, `sphereXGuardExternal`) reverts
 *   "SphereX error: disallowed tx pattern"
 * on its SUCCESS path for the fork's deployed v2.5 markets. The early-revert paths are
 * unaffected, which is why branch 3's AprChangeNotReady assertions decode normally — the guard
 * rejects the completed execution pattern, not the call. The borrower's own
 * `setAnnualInterestAndReserveRatioBips(proposed, currentRatio)` routes the IDENTICAL hook call
 * (`_executePendingAnnualInterestBipsReduction`) and is allowed, so this is a SphereX
 * allowlist/registration gap for the newer v2.5 function rather than a protocol rule.
 * Consequence for the product: the app's Settle-and-Apply plan
 * (SDK `populatePeriodicAprReductionPlan`) only ever routes the permissionless function, and the
 * AprModal always PROPOSES on a periodic market — so while this stands there is NO UI path to
 * apply a matured periodic APR reduction. The settlement half (approve +
 * repayAndProcessUnpaidWithdrawalBatches) does land, and branch 5 asserts it. Per the
 * KNOWN-ISSUES policy this suite documents the defect (journal + evidence of the SPECIFIC
 * revert) and falls back to the supported borrower setter; it does not fix src/, and it
 * self-heals — if the guard is updated the UI path is taken and `appliedThroughUi` records it.
 *
 * ZERO-LENDER EDGE — OPEN EXPECTATION, DELIBERATELY NOT ASSERTED.
 * The runsheet says "Zero lenders: reduction applies immediately" and marks the with-lenders
 * flow TBD. The deployed hooks contain NO lender-count branch anywhere: `proposeAnnualInterestBips`
 * and `onSetAnnualInterestAndReserveRatioBips` behave identically at zero supply, so a direct
 * reduction with no lenders reverts `NoPendingAprChange` (:723) exactly as it does with lenders.
 * The app agrees and says so in copy — `marketDetails.borrower.modals.apr.periodicProposalNotice`:
 * "the window always runs, even if no lender holds a position". The setup test RECORDS the
 * observed behaviour (journal + attachment) and asserts nothing about it: whether the runsheet
 * expectation or the implementation is authoritative is the owner's call.
 * ---------------------------------------------------------------------------------------------
 */

/** Lender position for the fixture. Above the periodic market's 100-unit minimum deposit. */
const DEPOSIT_UNITS = "10000"

/** Reduction proposed in the main branch, relative to the market's current APR. */
const REDUCTION_BIPS = 200n

type Fixture = {
  row: BorrowerMarketRow
  market: Address
  hooks: Address
  token: Address
  decimals: number
  schedule: PeriodicSchedule
}

test.describe.serial("borrower flows: periodic APR reduction (BOP-17)", () => {
  let fx: Fixture | undefined
  // Outcome of the settle-and-apply plan's APPLICATION half, consumed by BOP-17b: while
  // KNOWN-ISSUES #20 stands the UI cannot land it and BOP-17b fails AS EXPECTED (test.fail()).
  let appliedThroughUi = false
  let uiExecutionBlock: string | undefined
  /** Everything the branches journal, attached by the BOP-17 test at the end. */
  const record: Record<string, unknown> = {}

  const requirePeriodic = () =>
    test.skip(
      !fx,
      "no open, non-revolving PERIODIC-TERM market owned by borrower #3 — the page-3 suite's MKT-06 deploys it",
    )

  const units = (v: string) => parseUnits(v, fx?.decimals ?? 18)

  /** Retry the sidebar click until the parameters section is really mounted. */
  const openStatusDetails = async (page: Page) => {
    await expect(async () => {
      await page
        .getByRole("button", { name: /status and details/i })
        .first()
        .click({ timeout: 15_000 })
      await expect(parameterRow(page, "Base Lender APR").first()).toBeVisible({
        timeout: 8_000,
      })
    }).toPass({ timeout: 180_000 })
  }

  /** Reload with the page clock re-pointed at chain time (mandatory after every jump). */
  const refreshAtChainTime = async (page: Page) => {
    await resyncPageClock(page)
    await page.reload()
  }

  /**
   * Open the APR dialog, type `bips`, and return the dialog locator.
   *
   * MarketTransactions — which owns the opener AND the pending-APR banner — mounts only in the
   * default "Borrow and Repay" section, so anything that opened Status & Details unmounts the
   * button. Switch back first (retrying: the sidebar re-renders on every poll).
   */
  const openAprDialog = async (page: Page, bips: bigint) => {
    const opener = page
      .getByRole("button", { name: /^adjust base apr$/i })
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
    await opener.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    await dialog
      .getByRole("textbox")
      .first()
      .fill((Number(bips) / 100).toFixed(2))
    return dialog
  }

  test("setup: locate the MKT-06 periodic fixture, sign ceremonies, arrange lenders", async ({
    page,
  }) => {
    test.setTimeout(900_000)

    // A PERIODIC market that is not revolving: the runsheet's BOP-17 wording ("APR reduction")
    // is the base-APR flow, and the standard copy keys apply. MKT-07 (revolving + periodic) is
    // left untouched as a spare fixture.
    const all = await borrowerMarkets()
    const candidates = all.filter(
      (m) =>
        !m.isClosed &&
        (m.hooksConfig?.periodDuration ?? 0) > 0 &&
        m.marketKind !== "REVOLVING",
    )
    const row = candidates[0]
    attachAgreement("periodic fixture discovery", {
      borrowerMarkets: all.length,
      periodic: all
        .filter((m) => (m.hooksConfig?.periodDuration ?? 0) > 0)
        .map((m) => ({
          id: m.id,
          name: m.name,
          marketKind: m.marketKind,
          isClosed: m.isClosed,
          periodDuration: m.hooksConfig?.periodDuration,
          withdrawalWindowDuration: m.hooksConfig?.withdrawalWindowDuration,
        })),
      chosen: row ? { id: row.id, name: row.name } : null,
    })
    if (row) {
      fx = {
        row,
        market: row.id as Address,
        hooks: row.hooks!.id as Address,
        token: row.asset.address as Address,
        decimals: row.asset.decimals,
        schedule: await periodicSchedule(
          row.hooks!.id as Address,
          row.id as Address,
        ),
      }
    }
    requirePeriodic()
    const { market, hooks, token, decimals, schedule } = fx!

    expect(
      schedule.periodDuration > 0 && schedule.withdrawalWindowDuration > 0,
      "hooks report a live periodic schedule",
    ).toBe(true)
    expect(
      schedule.withdrawalWindowDuration < schedule.periodDuration,
      "window fits inside the period (PeriodicTermHooks.sol:_validatePeriodicTerm)",
    ).toBe(true)

    // Wall-clock signature ceremony BEFORE any time travel: /api/sla bounds the client's
    // timeSigned against the SERVER clock (CONVENTIONS "Time"). Only the BORROWER ceremony is
    // needed — this suite drives borrower UI only and deposits/withdraws chain-side, so no
    // lender ToU or MLA acknowledgement is exercised.
    await connectAs(page, 3)
    await ensureBorrowerTouSigned(page)

    // ---- state hygiene (CONVENTIONS): no leftover batches, no leftover proposal ----
    await step(page, "self-clean: batches, proposals", async () => {
      await selfCleanWithdrawals(account1, market)
      await settleUnpaidBatches(BORROWER, market, token, decimals)
      const stale = await pendingAprProposal(hooks, market)
      if (stale) {
        // An increase deletes a pending proposal (PeriodicTermHooks.sol:793).
        await setAprOnChain(market, (await marketApr(market)) + 100n)
        expect(
          await pendingAprProposal(hooks, market),
          "stale proposal cleared before the scenario starts",
        ).toBeUndefined()
      }
      const state = await liveMarketState(market)
      expect(
        state.scaledPendingWithdrawals,
        "no outstanding withdrawal obligations at the start",
      ).toBe(0n)
    })

    // ---- ZERO-LENDER EDGE: observe, journal, assert nothing (see the header). ----
    // Runs AFTER the self-clean (so no stale proposal can make a direct reduction look
    // executable) and BEFORE the deposit, so on a virgin fixture it captures the genuine
    // zero-supply case. It runs on every pass either way — the hook has no lender-count branch,
    // so the same probe with and without a lender position is exactly the evidence the owner
    // needs. `observedAtZeroSupply` says which of the two this run captured.
    const stateBefore = await liveMarketState(market)
    const zeroLender: Record<string, unknown> = {
      observedAtZeroSupply: stateBefore.scaledTotalSupply === 0n,
      scaledTotalSupply: stateBefore.scaledTotalSupply.toString(),
      runsheetExpectation:
        "uat_4 Borrower Ops.tsv:23 — 'Zero lenders: reduction applies immediately' (with-lenders flow marked TBD)",
      sourceReading:
        "PeriodicTermHooks.sol has no lender-count branch: proposeAnnualInterestBips (:359) and " +
        "onSetAnnualInterestAndReserveRatioBips (:775) behave identically at zero supply, and a " +
        "direct reduction routes _executePendingAnnualInterestBipsReduction, which reverts " +
        "NoPendingAprChange (:723) when nothing is proposed.",
      appCopy:
        "marketDetails.borrower.modals.apr.periodicProposalNotice: 'the window always runs, even " +
        "if no lender holds a position.'",
    }
    const aprAtProbe = await marketApr(market)
    zeroLender.aprAtProbeBips = Number(aprAtProbe)
    zeroLender.withdrawalWindowOpenAtProbe = await withdrawalWindowOpen(
      hooks,
      market,
    )
    const direct = await simulateWrite({
      account: BORROWER,
      address: market,
      abi: borrowerMarketAbi,
      functionName: "setAnnualInterestAndReserveRatioBips",
      args: [
        Number(aprAtProbe - REDUCTION_BIPS),
        Number(await marketReserveRatio(market)),
      ],
    })
    zeroLender.directReductionSimulation = {
      reverted: direct.reverted,
      message: direct.message.split("\n").slice(0, 4).join(" | "),
    }

    await step(
      page,
      "observation: what a direct reduction offers at this supply level",
      async () => {
        await gotoBorrowerMarket(page, market)
        await ensureConnected(page, BORROWER)
        const dialog = await openAprDialog(page, aprAtProbe - REDUCTION_BIPS)
        // EVERY read here is a journal probe, not an assertion, so each one carries its OWN
        // timeout: Playwright's default action timeout is 0 (wait forever), and a locator that
        // legitimately does not render — the proposal notice is hidden whenever the modal shows
        // a preview error, e.g. inside a withdrawal window — would otherwise hang the whole test
        // until its 15-minute budget expired instead of recording "(not shown)".
        const probe = (locator: ReturnType<typeof dialog.locator>) =>
          locator.innerText({ timeout: 15_000 }).catch(() => "(not shown)")
        zeroLender.dialogMainButton = await probe(
          dialog
            .locator("button")
            .filter({ hasText: /propose reduction|^adjust$/i })
            .first(),
        )
        zeroLender.dialogNotice = await probe(
          dialog.getByText(
            /This proposes an APR reduction for lenders to review/i,
          ),
        )
        zeroLender.dialogError = await probe(
          dialog.getByText(
            /APR reductions can only be proposed outside withdrawal windows/i,
          ),
        )
        await closeDialog(page)
      },
    )
    expect(
      await marketApr(market),
      "the observation changed nothing on chain",
    ).toBe(aprAtProbe)
    record.zeroLenderEdge = zeroLender

    // ---- lenders present, and the market short of reserves ----
    await step(page, "lender #1 holds a position", async () => {
      const target = units(DEPOSIT_UNITS)
      const held = await chain.marketBalance(market, account1)
      if (held < target) {
        const need = target - held
        faucet(account1, parseUnits("1", 18))
        faucet(account1, need * 2n, token)
        await chain.approve(account1, token, market, need * 2n)
        // Deposits are NOT window-gated on a periodic market — only queueWithdrawal is
        // (PeriodicTermHooks.sol:onQueueWithdrawal).
        await chain.depositUpTo(account1, market, need)
      }
      expect(
        (await chain.marketBalance(market, account1)) > 0n,
        "lender #1 holds market tokens",
      ).toBe(true)
    })

    await step(page, "borrower draws down so reserves are short", async () => {
      // Branch 4 needs a withdrawal request the market CANNOT instantly cover: a fully-liquid
      // market pays a pending batch inside the same `_getUpdatedState`
      // (WildcatMarketBase.sol:_applyWithdrawalBatchPayment), which would zero
      // scaledPendingWithdrawals and never exercise UnpaidWithdrawalsExist.
      faucet(BORROWER, parseUnits("1", 18))
      const borrowable = await marketBorrowable(market)
      const draw = (borrowable * 9n) / 10n
      if (draw > 0n) await borrowOnChain(market, draw)
      const state = await liveMarketState(market)
      expect(
        state.isDelinquent,
        "the draw leaves the market within its reserve requirement",
      ).toBe(false)
      record.drawdown = {
        borrowableBefore: formatUnits(borrowable, decimals),
        drawn: formatUnits(draw, decimals),
        reserveRatioBips: state.reserveRatioBips.toString(),
      }
    })

    await syncSubgraph()
    const state = await liveMarketState(market)
    attachAgreement("periodic fixture", {
      market,
      name: fx!.row.name,
      hooks,
      hooksKind: fx!.row.hooks?.kind,
      asset: { address: token, symbol: fx!.row.asset.symbol, decimals },
      schedule: {
        firstWithdrawalWindowStart: schedule.firstWithdrawalWindowStart,
        periodDuration: schedule.periodDuration,
        withdrawalWindowDuration: schedule.withdrawalWindowDuration,
      },
      annualInterestBips: state.annualInterestBips.toString(),
      reserveRatioBips: state.reserveRatioBips.toString(),
      lenderPosition: formatUnits(
        await chain.marketBalance(market, account1),
        decimals,
      ),
      chainNow: await chain.blockTimestamp(),
      windowOpenNow: await withdrawalWindowOpen(hooks, market),
      zeroLenderEdge: record.zeroLenderEdge,
    })
  })

  test("BOP-17: periodic-market APR reduction (windows + proposal flow)", async ({
    page,
  }) => {
    requirePeriodic()
    test.setTimeout(1_800_000)
    const { market, hooks, token, decimals, schedule } = fx!

    const aprBefore = await marketApr(market)
    const reserveRatioBefore = await marketReserveRatio(market)
    const proposedBips = aprBefore - REDUCTION_BIPS
    // Each complete pass nets the fixture's APR down 100 bips (propose -200, apply, then
    // branch 6's -100 proposal cancelled by a +100 increase). Fail loudly before it approaches
    // MinimumAnnualInterestBips (0) rather than silently proposing an invalid reduction.
    expect(
      proposedBips >= 400n,
      `MKT-06's APR is ${aprBefore} bips — repeated BOP-17 runs drift it down; re-deploy the page-3 fixtures (or dev:fork:reset) before running this again`,
    ).toBe(true)

    await connectAs(page, 3)
    await gotoBorrowerMarket(page, market)
    await ensureConnected(page, BORROWER)

    // ---------------------------------------------------------------- branch 1
    await step(
      page,
      "1 — a reduction inside an open withdrawal window is rejected",
      async () => {
        const target = nextWindowStartAt(schedule, await chain.blockTimestamp())
        await advanceChainTo(target + 60, "open a withdrawal window")
        const now = await chain.blockTimestamp()
        expect(
          windowOpenAt(schedule, now),
          "schedule maths and the chain agree the window is open",
        ).toBe(await withdrawalWindowOpen(hooks, market))
        expect(
          await withdrawalWindowOpen(hooks, market),
          "a withdrawal window is open",
        ).toBe(true)

        // Chain: the hook's own rejection.
        const sim = await simulateWrite({
          account: BORROWER,
          address: hooks,
          abi: periodicHooksAbi,
          functionName: "proposeAnnualInterestBips",
          args: [market, Number(proposedBips)],
        })
        expect(sim.reverted, "proposing inside a window reverts").toBe(true)
        expect(
          sim.message,
          "reverts with the window-specific error (PeriodicTermHooks.sol:365)",
        ).toContain("AprReductionProposalDuringWithdrawalWindow")

        // App: the dialog refuses before anything is signed.
        await refreshAtChainTime(page)
        const dialog = await openAprDialog(page, proposedBips)
        await expect(
          dialog.getByText(
            "APR reductions can only be proposed outside withdrawal windows",
          ),
        ).toBeVisible({ timeout: 30_000 })
        await expect(
          dialog.getByRole("button", { name: /^confirm$/i }),
        ).toBeDisabled({ timeout: 30_000 })
        await closeDialog(page)

        record.branch1 = {
          chainNow: now,
          windowOpen: true,
          revert: sim.message.split("\n").slice(0, 3).join(" | "),
          appError:
            "APR reductions can only be proposed outside withdrawal windows",
        }
      },
    )
    expect(await marketApr(market), "branch 1 changed no rate").toBe(aprBefore)
    expect(
      await pendingAprProposal(hooks, market),
      "branch 1 created no proposal",
    ).toBeUndefined()

    // ---------------------------------------------------------------- branch 2
    let responseWindowStart = 0
    let responseWindowEnd = 0
    await step(
      page,
      "2 — propose outside a window with lenders present",
      async () => {
        const windowStart = nextWindowStartAt(
          schedule,
          (await chain.blockTimestamp()) - schedule.periodDuration,
        )
        await advanceChainTo(
          windowStart + schedule.withdrawalWindowDuration + 60,
          "close the withdrawal window",
        )
        expect(
          await withdrawalWindowOpen(hooks, market),
          "the withdrawal window has closed",
        ).toBe(false)

        const proposalAt = await chain.blockTimestamp()

        await refreshAtChainTime(page)
        const dialog = await openAprDialog(page, proposedBips)
        // The periodic path must offer a PROPOSAL, not a direct set (AprModal:135-146).
        const propose = dialog.getByRole("button", {
          name: /^propose reduction$/i,
        })
        await expect(propose).toBeVisible({ timeout: 30_000 })
        await dialog.getByRole("button", { name: /^confirm$/i }).click()
        await dialog.getByRole("checkbox").check()
        await expect(propose).toBeEnabled({ timeout: 30_000 })
        await propose.click()
        await waitBorrowerTxSuccess(page)
        await closeDialog(page)

        const pending = await pendingAprProposal(hooks, market)
        expect(pending, "the hook holds a pending proposal").toBeDefined()
        expect(
          pending!.proposedAprBips,
          "the proposal carries the requested rate",
        ).toBe(Number(proposedBips))
        // Independently derived from the schedule, anchored on the proposal's OWN block
        // timestamp (which the hook stored), not read back from the app.
        const expectedStart = nextWindowStartAt(
          schedule,
          pending!.proposalTimestamp,
        )
        const expectedEnd = expectedStart + schedule.withdrawalWindowDuration
        expect(
          pending!.proposalTimestamp >= proposalAt,
          "the stored proposal timestamp is the transaction's block time",
        ).toBe(true)
        expect(
          pending!.responseWindowStart,
          "response window starts at the next scheduled withdrawal window (PeriodicTermHooks.sol:379)",
        ).toBe(expectedStart)
        expect(
          pending!.responseWindowEnd,
          "response window ends one window duration later (:381)",
        ).toBe(expectedEnd)
        responseWindowStart = pending!.responseWindowStart
        responseWindowEnd = pending!.responseWindowEnd

        expect(
          await marketApr(market),
          "the ACTIVE APR is unchanged by a proposal",
        ).toBe(aprBefore)

        // App: banner FIRST — MarketTransactions (which owns it) mounts only in the default
        // "Borrow and Repay" section, so it is not on the page once Status & Details is open.
        // The banner's proposal fields are subgraph-derived (SDK market.js:826), hence the
        // syncSubgraph before the reload.
        await syncSubgraph()
        await refreshAtChainTime(page)
        const bannerTitle = `Pending base APR reduction: ${formatBps(
          aprBefore,
        )}% → ${formatBps(proposedBips)}%`
        await expect(page.getByText(bannerTitle)).toBeVisible({
          timeout: 180_000,
        })
        const readyAt = formatWindowStart(responseWindowEnd)
        await expect(
          page.getByText(
            `Lenders can respond until ${readyAt}. The reduction can be applied once the response window closes.`,
          ),
        ).toBeVisible({ timeout: 60_000 })

        // Then the parameters rows, which live in the other section.
        await openStatusDetails(page)
        await expect(parameterRow(page, "Pending Base APR")).toContainText(
          `${formatBps(proposedBips)}%`,
          { timeout: 120_000 },
        )
        expect(
          await readParameterValue(page, "Base Lender APR"),
          "the active APR row still shows the old rate",
        ).toBe(`${formatBps(aprBefore)}%`)

        record.branch2 = {
          proposalAt,
          proposedAprBips: Number(proposedBips),
          activeAprBips: Number(aprBefore),
          responseWindowStart,
          responseWindowEnd,
          responseWindowEndUtc: readyAt,
          bannerTitle,
        }
      },
    )

    // ---------------------------------------------------------------- branch 3
    await step(
      page,
      "3 — execution is unavailable before the response window closes",
      async () => {
        const now = await chain.blockTimestamp()
        expect(
          now < responseWindowEnd,
          "still inside the proposal's response period",
        ).toBe(true)

        const exec = await simulateWrite({
          account: BORROWER,
          address: market,
          abi: marketAprExecutionAbi,
          functionName: "executePendingAnnualInterestBipsReduction",
        })
        expect(exec.reverted, "permissionless execution reverts").toBe(true)
        expect(
          exec.message,
          "reverts AprChangeNotReady (PeriodicTermHooks.sol:737)",
        ).toContain("AprChangeNotReady")

        const direct = await simulateWrite({
          account: BORROWER,
          address: market,
          abi: borrowerMarketAbi,
          functionName: "setAnnualInterestAndReserveRatioBips",
          args: [Number(proposedBips), Number(reserveRatioBefore)],
        })
        expect(
          direct.reverted,
          "the borrower cannot short-circuit the window with a direct set",
        ).toBe(true)
        expect(direct.message).toContain("AprChangeNotReady")

        // The banner renders NO action while the response window has not elapsed
        // (MarketTransactions/index.tsx:377-378). Wait for the banner itself first, so the
        // absence of the button is a real absence and not an un-rendered page.
        await refreshAtChainTime(page)
        await expect(
          page.getByText(
            `Pending base APR reduction: ${formatBps(aprBefore)}% → ${formatBps(
              proposedBips,
            )}%`,
          ),
        ).toBeVisible({ timeout: 180_000 })
        await expect(
          page.getByRole("button", { name: /^apply apr$/i }),
        ).toHaveCount(0)
        await expect(
          page.getByRole("button", {
            name: /settle and apply|process unpaid batches/i,
          }),
        ).toHaveCount(0)

        record.branch3 = {
          chainNow: now,
          secondsToResponseWindowEnd: responseWindowEnd - now,
          executionRevert: exec.message.split("\n").slice(0, 3).join(" | "),
          directSetRevert: direct.message.split("\n").slice(0, 3).join(" | "),
        }
      },
    )

    // ---------------------------------------------------------------- branch 4
    await step(
      page,
      "4 — a withdrawal queued in the response window blocks application",
      async () => {
        await advanceChainTo(
          responseWindowStart + 30,
          "enter the lender response window",
        )
        expect(
          await withdrawalWindowOpen(hooks, market),
          "the response window IS a withdrawal window — lenders can exit",
        ).toBe(true)

        const balance = await chain.marketBalance(market, account1)
        const request = balance / 2n
        await chain.queueWithdrawal(account1, market, request)

        const queued = await liveMarketState(market)
        expect(
          queued.scaledPendingWithdrawals > 0n,
          "the request is not instantly coverable — an unpaid obligation remains",
        ).toBe(true)

        await advanceChainTo(
          responseWindowEnd + 30,
          "close the lender response window",
        )
        expect(
          await withdrawalWindowOpen(hooks, market),
          "the response window has closed",
        ).toBe(false)

        const exec = await simulateWrite({
          account: BORROWER,
          address: market,
          abi: marketAprExecutionAbi,
          functionName: "executePendingAnnualInterestBipsReduction",
        })
        expect(
          exec.reverted,
          "the matured proposal still cannot be applied",
        ).toBe(true)
        expect(
          exec.message,
          "blocked by the unpaid withdrawal, not by timing (PeriodicTermHooks.sol:747)",
        ).toContain("UnpaidWithdrawalsExist")

        expect(await marketApr(market), "the active APR is unchanged").toBe(
          aprBefore,
        )
        expect(
          await pendingAprProposal(hooks, market),
          "the proposal survives the blocked attempt",
        ).toBeDefined()

        // App: the banner now offers settlement rather than a bare Apply.
        await syncSubgraph()
        await refreshAtChainTime(page)
        const settle = page.getByRole("button", {
          name: /settle and apply|process unpaid batches/i,
        })
        await expect(settle.first()).toBeVisible({ timeout: 180_000 })

        record.branch4 = {
          requested: formatUnits(request, decimals),
          scaledPendingWithdrawals: queued.scaledPendingWithdrawals.toString(),
          executionRevert: exec.message.split("\n").slice(0, 3).join(" | "),
          settlementButton: (await settle.first().innerText()).trim(),
          chainNow: await chain.blockTimestamp(),
          proposalExpiresAt: responseWindowStart + schedule.periodDuration, // validityPeriods = 1
        }
      },
    )

    // ---------------------------------------------------------------- branch 5
    await step(
      page,
      "5 — settle through the borrower flow, then apply",
      async () => {
        const now = await chain.blockTimestamp()
        const expiresAt = responseWindowStart + schedule.periodDuration
        expect(
          now < expiresAt,
          `still inside the proposal's validity window (${
            expiresAt - now
          }s left, PeriodicTermHooks.sol:741)`,
        ).toBe(true)

        // The settlement plan repays the market's coverage shortfall; fund the borrower for it.
        const state = await liveMarketState(market)
        const supply = state.scaledTotalSupply
        faucet(
          BORROWER,
          (supply * state.scaleFactor) / 10n ** 27n + units("100"),
          token,
        )

        const settle = page
          .getByRole("button", {
            name: /settle and apply|process unpaid batches/i,
          })
          .first()
        await expect(settle).toBeEnabled({ timeout: 60_000 })
        await settle.click()

        // --- SETTLEMENT HALF (the app's [approve, repayAndProcessUnpaidWithdrawalBatches]) ---
        // Durable end state, not the transient banner (CONVENTIONS "UI waits").
        await expect
          .poll(
            async () =>
              (await liveMarketState(market)).scaledPendingWithdrawals === 0n,
            {
              timeout: 240_000,
              message:
                "the borrower flow's settlement transaction clears the unpaid withdrawal obligation",
            },
          )
          .toBe(true)
        const settled = await liveMarketState(market)
        expect(
          settled.isDelinquent,
          "settlement also restores coverage, which the market-level APR check requires " +
            "(WildcatMarketConfig._applyAnnualInterestAndReserveRatioBips)",
        ).toBe(false)

        // --- APPLICATION HALF ---
        // The plan's last step is the market's permissionless
        // executePendingAnnualInterestBipsReduction(). Probe the TERMINAL blocker FIRST
        // (PERFORMANCE-FINDINGS §5): while KNOWN-ISSUES #20 stands, a 90s success poll would
        // burn its whole budget on a failure we can diagnose in one simulation.
        const probeExec = await simulateWrite({
          account: BORROWER,
          address: market,
          abi: marketAprExecutionAbi,
          functionName: "executePendingAnnualInterestBipsReduction",
        })
        const terminallyBlocked =
          probeExec.reverted && probeExec.message.includes("SphereX")
        appliedThroughUi = terminallyBlocked
          ? false
          : await expect
              .poll(async () => Number(await marketApr(market)), {
                timeout: 90_000,
                message: "the borrower flow applies the matured reduction",
              })
              .toBe(Number(proposedBips))
              .then(() => true)
              .catch(() => false)

        if (!appliedThroughUi) {
          // APP/DEPLOYMENT DEFECT on this fork's v2.5 markets (see the header): the SphereX
          // guard rejects the SUCCESS pattern of executePendingAnnualInterestBipsReduction()
          // (selector 0x09b70bc7) — the early-revert paths branch 3 asserts are unaffected, which
          // is why they decode normally. Prove the specific blocker instead of just noting that
          // nothing happened, then fall back to the borrower's own setter, which routes the very
          // same `_executePendingAnnualInterestBipsReduction` hook call and IS allowed.
          const exec = await simulateWrite({
            account: BORROWER,
            address: market,
            abi: marketAprExecutionAbi,
            functionName: "executePendingAnnualInterestBipsReduction",
          })
          expect(
            exec.reverted,
            "the app's execute step is blocked, and the blocker is reproducible",
          ).toBe(true)
          uiExecutionBlock = exec.message.split("\n").slice(0, 3).join(" | ")
          expect(
            uiExecutionBlock,
            "the blocker is the SphereX pattern guard, not a protocol precondition " +
              "(the proposal is matured, unblocked and inside its validity window here)",
          ).toContain("SphereX")

          journal.record({
            kind: "data",
            name: "defect fallback (periodic APR execution blocked by SphereX)",
            data: {
              market,
              selector:
                "0x09b70bc7 executePendingAnnualInterestBipsReduction()",
              revert: uiExecutionBlock,
              note:
                "The app's Settle-and-Apply plan (SDK populatePeriodicAprReductionPlan) only " +
                "ever routes the permissionless market function, so the borrower has no UI path " +
                "to apply a matured periodic reduction while this pattern is disallowed. " +
                "Applied chain-side through setAnnualInterestAndReserveRatioBips, which the hook " +
                "routes to the identical execution.",
            },
          })
          await setAprOnChain(market, proposedBips)
        }

        expect(
          await marketApr(market),
          "the matured reduction is applied",
        ).toBe(proposedBips)
        expect(
          await pendingAprProposal(hooks, market),
          "the proposal is cleared once executed (PeriodicTermHooks.sol:749)",
        ).toBeUndefined()

        const after = await liveMarketState(market)
        expect(
          after.scaledPendingWithdrawals,
          "settlement cleared the withdrawal obligation",
        ).toBe(0n)

        // RESERVE-RATIO BEHAVIOUR: the periodic reduction path returns the CURRENT ratio
        // (PeriodicTermHooks.sol:806) and never reaches MarketConstraintHooks' temporary-peg
        // branch, so no two-week excess ratio is created — unlike an open-term reduction.
        expect(
          await marketReserveRatio(market),
          "reserve ratio unchanged by a periodic APR reduction",
        ).toBe(reserveRatioBefore)
        const [pegApr, pegRatio, pegExpiry] = await tempExcessReserveRatio(
          hooks,
          market,
        )
        expect(
          Number(pegExpiry),
          "no temporary excess reserve ratio was pegged",
        ).toBe(0)

        // App: the durable rows.
        await syncSubgraph()
        await refreshAtChainTime(page)
        await openStatusDetails(page)
        await expect(parameterRow(page, "Base Lender APR")).toContainText(
          `${formatBps(proposedBips)}%`,
          { timeout: 120_000 },
        )
        await expect(parameterRow(page, "Pending Base APR")).toHaveCount(0)

        record.branch5 = {
          appliedAprBips: Number(proposedBips),
          appliedThroughUi,
          uiExecutionBlock: uiExecutionBlock ?? null,
          settlementClearedPendingWithdrawals: true,
          reserveRatioBefore: Number(reserveRatioBefore),
          reserveRatioAfter: Number(await marketReserveRatio(market)),
          temporaryReserveRatioPeg: {
            originalAnnualInterestBips: Number(pegApr),
            originalReserveRatioBips: Number(pegRatio),
            expiry: Number(pegExpiry),
          },
          chainNow: await chain.blockTimestamp(),
          proposalExpiresAt: expiresAt,
        }
      },
    )

    // ---------------------------------------------------------------- branch 6
    await step(
      page,
      "6 — an APR increase cancels a pending reduction",
      async () => {
        const current = await marketApr(market)

        // ANY APR write — increase included — reverts InsufficientReservesForOldLiquidityRatio
        // while the market is delinquent (WildcatMarketConfig.sol:_applyAnnualInterestAndReserve
        // RatioBips). Branch 5's settlement leaves the market exactly at its requirement, which
        // accrued interest can tip over; top it back up before driving the UI.
        const preState = await liveMarketState(market)
        if (preState.isDelinquent) {
          const debts = await marketTotalDebts(market)
          const assets = await marketTotalAssets(market)
          const topUp = (debts > assets ? debts - assets : 0n) + units("50")
          faucet(BORROWER, topUp * 2n, token)
          await chain.approve(BORROWER, token, market, topUp * 2n)
          await repayOnChain(BORROWER, market, topUp)
          record.branch6Hygiene = {
            repaid: formatUnits(topUp, decimals),
            reason:
              "market was delinquent after settlement; APR writes require coverage",
          }
        }

        if (await withdrawalWindowOpen(hooks, market)) {
          const windowStart = nextWindowStartAt(
            schedule,
            (await chain.blockTimestamp()) - schedule.periodDuration,
          )
          await advanceChainTo(
            windowStart + schedule.withdrawalWindowDuration + 30,
            "leave the withdrawal window before re-proposing",
          )
        }
        const second = current - 100n
        await proposeAprOnChain(hooks, market, Number(second))
        expect(
          (await pendingAprProposal(hooks, market))?.proposedAprBips,
          "a second proposal is pending",
        ).toBe(Number(second))

        await syncSubgraph()
        await refreshAtChainTime(page)

        // The dialog warns that raising the APR discards the proposal.
        const raised = current + 100n
        const dialog = await openAprDialog(page, raised)
        await expect(
          dialog.getByText(
            `Increasing the APR will cancel your pending reduction proposal to ${formatBps(
              second,
            )}%.`,
          ),
        ).toBeVisible({ timeout: 120_000 })
        await dialog.getByRole("button", { name: /^confirm$/i }).click()
        await dialog.getByRole("checkbox").check()
        const adjust = dialog.getByRole("button", { name: /^adjust$/i })
        await expect(adjust).toBeEnabled({ timeout: 30_000 })
        await adjust.click()
        await waitBorrowerTxSuccess(page)
        await closeDialog(page)

        expect(
          await marketApr(market),
          "the increase applied immediately — no window, no proposal",
        ).toBe(raised)
        expect(
          await pendingAprProposal(hooks, market),
          "the pending reduction was cancelled (PeriodicTermHooks.sol:793-799)",
        ).toBeUndefined()

        record.branch6 = {
          aprBeforeIncrease: Number(current),
          secondProposalBips: Number(second),
          aprAfterIncrease: Number(raised),
        }
      },
    )

    await syncSubgraph()
    attachAgreement("BOP-17 periodic APR reduction lifecycle", {
      market,
      hooks,
      schedule: {
        firstWithdrawalWindowStart: schedule.firstWithdrawalWindowStart,
        periodDuration: schedule.periodDuration,
        withdrawalWindowDuration: schedule.withdrawalWindowDuration,
      },
      aprBeforeBips: Number(aprBefore),
      reserveRatioBips: Number(reserveRatioBefore),
      lenderScaledBalance: (
        await marketScaledBalance(market, account1)
      ).toString(),
      ...record,
    })
  })

  test("BOP-17b: the app itself applies the matured reduction (KNOWN-ISSUES #20 — SphereX blocks the executor)", async () => {
    // EXPECTED FAILURE while KNOWN-ISSUES #20 stands: the settle-and-apply plan's execution
    // half (permissionless executePendingAnnualInterestBipsReduction, selector 0x09b70bc7)
    // reverts "SphereX error: disallowed tx pattern" on its success path, so the app has no
    // way to apply a matured periodic reduction. BOP-17 proves the exact revert and falls
    // back chain-side so the rest of the lifecycle stays covered; THIS test keeps the broken
    // app workflow visible as a known-blocked row in every report. When the SphereX allowlist
    // is fixed it PASSES, Playwright flags the unexpected pass, and this annotation plus
    // BOP-17's fallback both come out.
    test.fail()
    test.skip(!fx, "no periodic fixture — see setup")
    expect(
      appliedThroughUi,
      `the borrower flow applied the matured reduction through the UI (blocked: ${
        uiExecutionBlock ?? "see the BOP-17 journal"
      })`,
    ).toBe(true)
  })
})
