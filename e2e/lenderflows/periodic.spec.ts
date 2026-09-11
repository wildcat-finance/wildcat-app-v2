/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits } from "viem"

import {
  account0,
  account1,
  ensureTouSigned,
  findOpenBatchExpiry,
  formatWindowStart,
  hooksTimingConfig,
  marketTotalAssets,
  openDepositDialog,
  periodicTiming,
  pinnedMarkets,
  resolveFixedTermFixture,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  submitDepositDialog,
  type FixedTermFixture,
  type PeriodicConfig,
} from "./lib"
import { expectAgreement } from "../lib/assert"
import * as chain from "../lib/chain"
import {
  advanceTime,
  faucet,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import {
  ensureConnected,
  gotoMarket,
  readAvailableToWithdraw,
  readWithdrawalsStatus,
} from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * UAT 5 Lender Flows — periodic-window gating and the fixed-term lock:
 *   LEN-23/23b/23c withdrawals blocked outside the window (countdown), work inside, re-lock on schedule
 *   LEN-25 deposits while the withdrawal window is closed (record the allowed/blocked outcome)
 *   LEN-35 fixed-term market: locked BEFORE maturity (here)
 *
 * The recurring schedule is immutable on-chain (firstWithdrawalWindowStart / periodDuration /
 * withdrawalWindowDuration), so window boundaries are computed here with the same modular math
 * the app uses and reached via evm_increaseTime (never backwards on the shared fork).
 *
 * LEN-35's SECOND half — the one that travels PAST the maturity — lives in
 * e2e/zz-final-phase/fixed-term-maturity.spec.ts. "LEN-35b: after maturity, …" is that half. That
 * jump is weeks long and one way, so a file
 * that sorts in the middle of the board would leave every later suite (and every re-run of this
 * one) with a matured fixture and nothing to lock. The final-phase file sorts last on purpose.
 */
test.describe
  .serial("lender flows: periodic windows & fixed term (LEN-23/25/35)", () => {
  const market = pinnedMarkets.periodic.toLowerCase() as Address
  let fixed: FixedTermFixture | null = null
  let token: Address
  let decimals: number
  let cycle: number
  let cfg: PeriodicConfig
  const WITHDRAW = 20n
  let withdraw: bigint
  let expiry23 = 0

  // withdraw-availability copy (src/locales/en) — the durable "blocked" signals
  const CLOSED_STATUS =
    "Withdrawal requests are available only during the scheduled window."
  const FIXED_TERM_STATUS = "Withdrawal requests open when the fixed term ends."

  /** Land ~30s into a closed stretch with at least 2 minutes before it re-opens. */
  const ensureClosedWindow = async () => {
    const now = await chain.blockTimestamp()
    const timing = periodicTiming(cfg, now)
    if (timing.isOpen && timing.currentWindowEnd !== undefined) {
      await advanceTime(timing.currentWindowEnd - now + 30)
      return
    }
    // Already closed, but about to re-open: jump past the next window into the following
    // closed stretch so the countdown assertions cannot race the boundary.
    if (timing.nextWindowStart - now < 120)
      await advanceTime(
        timing.nextWindowStart - now + cfg.withdrawalWindowDuration + 30,
      )
  }

  /** Land ~15s into an open window with enough room for a full cycle + claim. */
  const ensureOpenWindow = async () => {
    const now = await chain.blockTimestamp()
    const timing = periodicTiming(cfg, now)
    const remaining =
      timing.isOpen && timing.currentWindowEnd !== undefined
        ? timing.currentWindowEnd - now
        : 0
    if (!timing.isOpen || remaining < cycle + 120)
      await advanceTime(timing.nextWindowStart - now + 15)
  }

  test("setup: schedule, hygiene, agreements, position", async ({ page }) => {
    const m = await subgraph.market(market)
    expect(m, "pinned periodic market exists").not.toBeNull()
    token = m!.asset.address as Address
    decimals = m!.asset.decimals
    cycle = Number(m!.withdrawalBatchDuration)
    const timingCfg = await hooksTimingConfig(market)
    expect(timingCfg, "hooksConfig present").not.toBeNull()
    cfg = timingCfg!
    expect(cfg.periodDuration, "recurring schedule configured").toBeGreaterThan(
      0,
    )
    expect(
      cfg.withdrawalWindowDuration,
      "window shorter than the period (otherwise it never closes)",
    ).toBeLessThan(cfg.periodDuration)
    expect(cfg.periodicTermClosed, "periodic term not closed").toBe(false)
    expect(
      cycle,
      "batch cycle fits inside one window so request + claim happen in-window",
    ).toBeLessThan(cfg.withdrawalWindowDuration)
    withdraw = parseUnits(WITHDRAW.toString(), decimals)

    await syncChainTimeToWallClock()
    faucet(account0, parseUnits("1", 18))
    await settleUnpaidBatches(account1, market, token, decimals)
    await selfCleanWithdrawals(account0, market)

    // ToU is required for UI deposits; signatures must ride the wall clock (see lib.ts).
    await ensureTouSigned(page, account0, market)

    // A position is required for the withdraw UI to show its gating states at all
    // ("no market tokens" wins over "window closed"). Chain-side top-up; the UI deposit
    // behaviour while the window is closed is measured separately in LEN-25.
    const minimum = BigInt(m!.hooksConfig?.minimumDeposit ?? "0")
    const topUp = minimum + parseUnits("1", decimals)
    if ((await chain.marketBalance(market, account0)) < withdraw * 3n) {
      faucet(account0, topUp, token)
      await chain.approve(account0, token, market, topUp)
      await chain.depositUpTo(account0, market, topUp)
    }
    await syncSubgraph()
  })

  test("LEN-23: outside the window, withdrawals are blocked with a countdown", async ({
    page,
  }) => {
    await ensureClosedWindow()
    const now = await chain.blockTimestamp()
    const timing = periodicTiming(cfg, now)
    expect(timing.isOpen).toBe(false)

    await gotoMarket(page, market)
    await ensureConnected(page, account0)

    await step(page, "blocked state with next-window countdown", async () => {
      const available = await readAvailableToWithdraw(page)
      expect(available.raw > 0n, "lender holds a position").toBe(true)
      await expect(page.getByText(CLOSED_STATUS).first()).toBeVisible({
        timeout: 30_000,
      })
      await expect(
        page.getByRole("button", { name: /^withdraw$/i }),
        "no withdraw action while the window is closed",
      ).toHaveCount(0)
      // Notice: "Next window opens {D MMM YYYY, HH:mm UTC} ({countdown})"
      const notice = page.getByText(/next window opens/i).first()
      await expect(notice).toBeVisible({ timeout: 30_000 })
      const noticeText = (await notice.innerText()).trim()
      expect(
        noticeText,
        "countdown names the next scheduled window start",
      ).toContain(formatWindowStart(timing.nextWindowStart))
      // Seconds-level countdown: the text re-renders as the clock ticks.
      await expect
        .poll(async () => (await notice.innerText()).trim(), {
          timeout: 15_000,
        })
        .not.toBe(noticeText)
      attachAgreement("LEN-23 closed window", {
        chainNow: now,
        nextWindowStart: timing.nextWindowStart,
        notice: noticeText,
      })
    })
  })

  test("LEN-23b: inside the window, request and claim both work", async ({
    page,
  }) => {
    await ensureOpenWindow()
    const openedAt = await chain.blockTimestamp()
    const timing = periodicTiming(cfg, openedAt)
    expect(timing.isOpen).toBe(true)
    expect(
      (await marketTotalAssets(market)) > withdraw,
      "market holds enough reserves to pay the batch",
    ).toBe(true)

    await gotoMarket(page, market)
    await ensureConnected(page, account0)

    await step(page, "queue a withdrawal inside the window", async () => {
      const withdrawButton = page
        .getByRole("button", { name: /^withdraw$/i })
        .first()
      await expect(withdrawButton).toBeVisible({ timeout: 30_000 })
      await withdrawButton.click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      await dialog.getByRole("textbox").first().fill(WITHDRAW.toString())
      const confirm = dialog.getByRole("button", {
        name: new RegExp(`^withdraw ${WITHDRAW}`, "i"),
      })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      await expect(page.getByText("Withdrawal Requested")).toBeVisible({
        timeout: 120_000,
      })
    })

    await syncSubgraph()
    expiry23 = await findOpenBatchExpiry(market, account0, cycle)
    expect(
      timing.currentWindowEnd !== undefined &&
        expiry23 <= timing.currentWindowEnd,
      "batch expires inside the same window (cycle < window)",
    ).toBe(true)

    // Wait out the cycle without leaving the window, then claim through the UI.
    const now = await chain.blockTimestamp()
    if (now <= expiry23) await advanceTime(expiry23 - now + 2)
    await chain.updateState(account0, market)
    await syncSubgraph()
    const batch = (await subgraph.withdrawalBatch(market, expiry23))!
    expect(batch.isExpired).toBe(true)
    expect(
      BigInt(batch.normalizedAmountPaid) >= withdraw - 10n,
      "batch paid up to rounding dust",
    ).toBe(true)
    expectAgreement("LEN-23b batch paid", {
      chain: (await chain.getWithdrawalBatch(market, expiry23))
        .normalizedAmountPaid,
      subgraph: batch.normalizedAmountPaid,
      decimals,
    })

    await step(page, "claim inside the window", async () => {
      await gotoMarket(page, market)
      await ensureConnected(page, account0)
      const claimable = await chain.getAvailableWithdrawalAmount(
        market,
        account0,
        expiry23,
      )
      const before = await chain.erc20Balance(token, account0)
      const pageStatus = await readWithdrawalsStatus(page)
      expect(pageStatus.claimableRaw).toBe(claimable)
      await page
        .getByRole("button", { name: /claim assets/i })
        .first()
        .click()
      await expect
        .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
          timeout: 120_000,
        })
        .toBe(0n)
      expect((await chain.erc20Balance(token, account0)) - before).toBe(
        claimable,
      )
    })
  })

  test("LEN-23c: the market re-locks on schedule", async ({ page }) => {
    // No manual intervention on-chain: the hook's modular schedule closes the window by itself;
    // the harness only moves time forward across the boundary.
    await ensureClosedWindow()
    const now = await chain.blockTimestamp()
    const timing = periodicTiming(cfg, now)
    expect(timing.isOpen).toBe(false)

    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    await expect(page.getByText(CLOSED_STATUS).first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole("button", { name: /^withdraw$/i })).toHaveCount(
      0,
    )
    attachAgreement("LEN-23c re-lock", {
      chainNow: now,
      nextWindowStart: timing.nextWindowStart,
    })
  })

  test("LEN-25: deposit while the withdrawal window is closed", async ({
    page,
  }) => {
    await ensureClosedWindow()
    const now = await chain.blockTimestamp()
    expect(periodicTiming(cfg, now).isOpen).toBe(false)

    const m = await subgraph.market(market)
    const minimum = BigInt(m!.hooksConfig?.minimumDeposit ?? "0")
    const amount = minimum + parseUnits("1", decimals)
    faucet(account0, amount * 2n, token)
    const balBefore = await chain.marketBalance(market, account0)
    const acctBefore = await subgraph.lenderAccount(market, account0)
    const depositedBefore = BigInt(acctBefore?.totalDeposited ?? "0")

    await gotoMarket(page, market)
    await ensureConnected(page, account0)

    await step(
      page,
      "deposit through the UI with the window closed",
      async () => {
        const dialog = await openDepositDialog(page)
        // VERIFY: the deposit dialog shows the periodic notice (deposit variant); informative only.
        await expect(
          page
            .getByText(
              "This is a periodic market: withdrawal requests are only available during scheduled withdrawal windows.",
            )
            .first(),
        ).toBeVisible({ timeout: 30_000 })
        await dialog
          .getByRole("textbox")
          .first()
          .fill(formatUnits(amount, decimals))
        await submitDepositDialog(page, dialog)
      },
    )

    await syncSubgraph()
    const balAfter = await chain.marketBalance(market, account0)
    const acctAfter = await subgraph.lenderAccount(market, account0)
    const depositedAfter = BigInt(acctAfter?.totalDeposited ?? "0")
    expect(depositedAfter - depositedBefore, "deposit recorded 1:1").toBe(
      amount,
    )
    expect(balAfter > balBefore, "balance increased").toBe(true)
    // Runsheet asks to RECORD the behaviour: deposits are window-independent by design.
    attachAgreement("LEN-25 deposit in closed window", {
      windowOpen: false,
      allowed: true,
      amount,
      subgraphDelta: depositedAfter - depositedBefore,
      chainDelta: balAfter - balBefore,
    })
  })

  test("LEN-35: before maturity, withdrawal requests are blocked with maturity messaging", async ({
    page,
  }) => {
    const now = await chain.blockTimestamp()
    // The fixture is CHOSEN, not pinned: prefer a market the page-3 suite deployed for this board
    // (MKT-04), fall back to `pins.markets.fixedTerm` (see resolveFixedTermFixture). Chain time
    // only moves forward on the shared fork, so a matured fixture is a real, honest skip — but it
    // must not be the recurring outcome, which is exactly what pinning one market produced.
    fixed = await resolveFixedTermFixture(now)
    test.skip(
      !fixed,
      `no open fixed-term market maturing more than an hour from the chain head (${now}) — the page-3 suite (MKT-04) deploys one, and the pinned fallback pins.markets.fixedTerm has matured or closed`,
    )
    const end = fixed!.fixedTermEndTime
    expect(end, "market has a fixed term").toBeGreaterThan(now)

    // ToU gates every /lender page; a fresh harness DB holds no acceptances (CONVENTIONS).
    // Wall-clock ceremony BEFORE gotoMarket installs the chain-aligned clock.
    await ensureTouSigned(page, account0, fixed!.market)

    const amount = fixed!.minimumDeposit + parseUnits("1", fixed!.decimals)
    if ((await chain.marketBalance(fixed!.market, account0)) === 0n) {
      // A position is required for the lock to be the reason the withdraw action is missing —
      // "no market tokens" would otherwise win and the assertion would prove nothing.
      faucet(account0, amount, fixed!.asset)
      await chain.approve(account0, fixed!.asset, fixed!.market, amount)
      await chain.depositUpTo(account0, fixed!.market, amount)
      await syncSubgraph()
    }
    expect(
      await chain.marketBalance(fixed!.market, account0),
      "lender holds a position, so the lock is the only thing blocking a request",
    ).toBeGreaterThan(0n)

    await gotoMarket(page, fixed!.market)
    await ensureConnected(page, account0)
    await step(page, "locked state names the fixed term", async () => {
      // SHARED half — asserted identically in the main worktree's copy of this test. The withdraw
      // surface must RENDER (otherwise "no withdraw button" would just mean a broken page) and
      // must offer no withdrawal action while the term runs.
      await expect(
        page.getByText("Available For Withdraw Requests").first(),
        "the withdraw surface rendered",
      ).toBeVisible({ timeout: 60_000 })
      await expect(
        page.getByRole("button", { name: /^withdraw$/i }),
        "no withdraw action before maturity",
      ).toHaveCount(0)

      // The page also NAMES the reason the withdraw action is unavailable
      // (marketDetails.lender.transactions.withdraw.unavailable.fixed-term); assert the reason
      // copy is visible.
      await expect(page.getByText(FIXED_TERM_STATUS).first()).toBeVisible({
        timeout: 30_000,
      })
    })
    attachAgreement("LEN-35 before maturity", {
      market: fixed!.market,
      name: fixed!.name,
      fixtureSource: fixed!.source,
      fixedTermEndTime: end,
      chainNow: now,
      hoursOfTermRemaining: Math.round(((end - now) / 3_600) * 10) / 10,
      // Same keys the main worktree records, so the two runs pair field-for-field.
      withdrawActionOffered: false,
      reasonCopyRendered: true,
      transitionRunsIn: "e2e/zz-final-phase/fixed-term-maturity.spec.ts",
    })
  })

  // LEN-35's post-maturity half runs in e2e/zz-final-phase/fixed-term-maturity.spec.ts.
  // It advances chain time PAST the fixture's maturity, which is permanent for the fork lifetime
  // and would leave every suite that sorts after this file — including this file's own re-run —
  // with nothing left to lock. Keeping it here is what made the before-maturity case a recurring
  // skip (COVERAGE-SUGGESTIONS-2026-09-08 §5).
})
