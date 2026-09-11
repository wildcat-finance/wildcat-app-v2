/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { parseUnits } from "viem"

import {
  account0,
  account1,
  ensureTouSigned,
  findOpenBatchExpiry,
  resolveFixedTermFixture,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  type FixedTermFixture,
} from "../lenderflows/lib"
import * as chain from "../lib/chain"
import { advanceTime, faucet, syncSubgraph } from "../lib/env"
import { ensureConnected, gotoMarket } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * FINAL PHASE — the board's one-way, long-range time travel.
 *
 * Everything here advances chain time by days or weeks. `evm_increaseTime` is permanent for the
 * fork lifetime and the fork is SHARED, so a jump like this poisons every suite that has not run
 * yet: fixed-term locks expire, wall-clock signature ceremonies (/api/sla, MLA, acknowledgements)
 * start sending timestamps the server rejects, and `pins.markets.fixedTerm` stops being a
 * before-maturity fixture for the next board.
 *
 * The directory name is the mechanism, not decoration: Playwright orders files by path, and
 * `e2e/zz-final-phase/` sorts after `e2e/withdrawal.spec.ts`, the last file of the ordinary board.
 * Anything that needs chain ≈ wall time, or an unmatured fixed-term market, must be a file that
 * sorts BEFORE this one — or run after `harness/fork/scripts/reset.sh`.
 *
 * The UAT id at the start of the title is the join key of the cross-app comparison
 * (e2e/CONVENTIONS.md "Structure"), so "LEN-35b: after maturity, …" pairs with the before-maturity
 * half in lenderflows/fixed-term.spec.ts and with the v2.5 worktree's run.
 *
 * This is the generic fixed-term path, which main's lender market page drives end to end once the
 * term has elapsed (see e2e/COVERAGE.md). The fixture is whichever `resolveFixedTermFixture`
 * (lenderflows/lib.ts) picks: the page-3 suite's board-deployed market (MKT-04) when this board
 * ran it, else `pins.markets.fixedTerm`.
 */
test.describe.serial("final phase: fixed-term maturity transition (LEN-35)", () => {
  let fixed: FixedTermFixture | null = null

  test("LEN-35b: after maturity, withdrawal requests work", async ({
    page,
  }) => {
    const now = await chain.blockTimestamp()
    // Same resolver the before-maturity half used, so the two halves assert the SAME market:
    // nothing between them closes or matures a fixed-term fixture, and the resolver is a pure
    // function of the chain/subgraph state. `marginSeconds: 0` — this half is allowed to run on a
    // fixture that is about to mature; it is the one that travels there. `allowMatured` — and on
    // one that ALREADY has: for this half a matured market is the best fixture available, because
    // the jump it needs is zero. Without it, re-running the final phase on a fork it had already
    // advanced would skip the fixture it just matured and travel to the next one, so each re-run
    // cost another leap. Candidates sort by ascending maturity, so the cheapest jump always wins.
    fixed = await resolveFixedTermFixture(now, 0, true)
    test.skip(
      !fixed,
      `no open fixed-term market left on the fork (chain ${now}) — the page-3 suite (MKT-04) deploys one and pins.markets.fixedTerm is the fallback; both are closed`,
    )
    const target = fixed!.market
    const fToken = fixed!.asset
    const fDecimals = fixed!.decimals
    const fCycle = fixed!.cycle
    const end = fixed!.fixedTermEndTime

    // THE JUMP. Bounded by the fixture's own maturity and reported, so a board run says exactly
    // how much chain time it consumed and why.
    const jumpSeconds = Math.max(0, end - now + 5)
    if (jumpSeconds > 0) await advanceTime(jumpSeconds)
    expect(
      await chain.blockTimestamp(),
      "chain is past the fixed term",
    ).toBeGreaterThanOrEqual(end)

    // A prior aborted run can leave an open or unpaid batch on this market; clean it first.
    await selfCleanWithdrawals(account0, target)
    await settleUnpaidBatches(account1, target, fToken, fDecimals)
    await selfCleanWithdrawals(account0, target)
    await syncSubgraph()

    const amount = fixed!.minimumDeposit + parseUnits("1", fDecimals)
    const request = parseUnits("5", fDecimals)

    await selfCleanWithdrawals(account0, target)
    if ((await chain.marketBalance(target, account0)) < request * 2n) {
      // VERIFY: post-maturity deposits — the fixed-term hook only gates queueWithdrawal by
      // term; deposits stay open (access via the market's own role provider).
      faucet(account0, amount, fToken)
      await chain.approve(account0, fToken, target, amount)
      await chain.depositUpTo(account0, target, amount)
    }
    await syncSubgraph()

    // ToU gates every /lender page and a fresh harness DB holds no acceptances (CONVENTIONS).
    // The signature API bounds timeSigned to the SERVER wall clock, and the jump above has just
    // pushed chain time well past it — so this must happen on a page with NO chain clock
    // installed, and it is the reason nothing after this file may sign anything.
    await ensureTouSigned(page, account0, target)

    await gotoMarket(page, target)
    await ensureConnected(page, account0)
    await step(page, "queue a withdrawal after maturity", async () => {
      const withdrawButton = page
        .getByRole("button", { name: /^withdraw$/i })
        .first()
      await expect(withdrawButton).toBeVisible({ timeout: 30_000 })
      await expect(withdrawButton).toBeEnabled()
      await withdrawButton.click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      // Request the ENTIRE balance via the Max chip — the exact deposited amount varies with the
      // faucet path and accrual, and a hardcoded figure can exceed what is available.
      await dialog
        .getByRole("button", { name: /^(max|all) ·/i })
        .first()
        .click()
      const confirm = dialog.getByRole("button", {
        name: /^withdraw .*step/i,
      })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      // Full-balance queue: the refetch can unmount the modal around the success view; the durable
      // signal is the on-chain burn.
      await expect
        .poll(async () => chain.marketBalance(target, account0), {
          timeout: 120_000,
        })
        .toBe(0n)
    })

    // The lender's request includes the interest accrued across the jump, which the market's
    // reserves do not cover (the borrower owes it). Cover the gap with a co-lender deposit so the
    // batch pays in full — post-maturity deposits are allowed (proven above).
    //
    // The gap must clear the market's own `minimumDeposit`, not just the shortfall: the hook
    // rejects an under-sized deposit with DepositBelowMinimum() (0xc24b1b61) before it ever looks
    // at the amount needed. This variant's fixture is always the pinned one, which has no minimum
    // — the constant survived here precisely because of that — but every market the v2.5 creation
    // wizard deploys sets one (100 units), and the two worktrees run the same file.
    {
      const gap =
        fixed!.minimumDeposit > parseUnits("1", fDecimals)
          ? fixed!.minimumDeposit
          : parseUnits("1", fDecimals)
      faucet(account1, gap, fToken)
      await chain.approve(account1, fToken, target, gap)
      await chain.depositUpTo(account1, target, gap)
    }
    await syncSubgraph()
    const expiry = await findOpenBatchExpiry(target, account0, fCycle)
    const ts = await chain.blockTimestamp()
    if (ts <= expiry) await advanceTime(expiry - ts + 1)
    await chain.updateState(account0, target)
    const claimable = await chain.getAvailableWithdrawalAmount(
      target,
      account0,
      expiry,
    )
    // The Max-chip queue requested the FULL balance (deposit + accrued interest), not the nominal
    // `request` constant — compare against the batch's own recorded request.
    const queuedStatus = await subgraph.lenderWithdrawalStatus(
      target,
      expiry,
      account0,
    )
    const queuedRequest = BigInt(queuedStatus!.totalNormalizedRequests)
    expect(
      claimable >= queuedRequest - 10n,
      "post-maturity request pays out (up to rounding dust)",
    ).toBe(true)
    const before = await chain.erc20Balance(fToken, account0)
    await chain.executeWithdrawal(account0, target, account0, expiry)
    expect((await chain.erc20Balance(fToken, account0)) - before).toBe(
      claimable,
    )
    await syncSubgraph()
    attachAgreement("LEN-35b after maturity", {
      market: target,
      name: fixed!.name,
      fixtureSource: fixed!.source,
      fixedTermEndTime: end,
      chainBeforeJump: now,
      jumpSeconds,
      jumpDays: Math.round((jumpSeconds / 86_400) * 10) / 10,
      chainAfterJump: await chain.blockTimestamp(),
      // What the Max chip actually queued, read back off the batch — not the nominal `request`
      // constant, which is only the top-up threshold above and would under-report the exit.
      requested: queuedRequest.toString(),
      claimable: claimable.toString(),
    })
  })
})
