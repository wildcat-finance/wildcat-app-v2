/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits } from "viem"

import {
  absDiff,
  account0,
  account1,
  account2,
  ensureNoMlaAcknowledged,
  ensureTouSigned,
  findOpenBatchExpiry,
  marketApr,
  marketTotalAssets,
  marketTotalDebts,
  openDepositDialog,
  openSection,
  pinnedMarkets,
  queueFullWithdrawal,
  repayAndProcessUnpaidBatches,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  simulateMarketWrite,
  submitDepositDialog,
  marketScaledBalance,
  unpaidBatchExpiries,
} from "./lib"
import { expectAgreement, expectFormattedEquals } from "../lib/assert"
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
  openWithdrawalRequests,
  readAvailableToWithdraw,
  readOngoingAmounts,
  readWithdrawalsStatus,
} from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * UAT 5 Lender Flows — deposit & withdraw on the open-term market:
 *   LEN-15 self-onboard + deposit (minimum enforced, 1:1 mint)
 *   LEN-17 balance rebases with accrued interest at the configured APR
 *   LEN-18 partial withdrawal request (cycle end surfaced)
 *   LEN-19 claim succeeds on the first try after expiry
 *   LEN-22 pro-rata payout + FIFO unpaid queue when requests exceed reserves
 *   LEN-21 full exit (entire balance withdrawn + claimed; lender leaves the market)
 *
 * LEN-22 runs BEFORE LEN-21 on purpose: the pro-rata case consumes the market's natural
 * asset deficit (borrowed principal + accrued interest) and ends by repaying it, which is exactly
 * the fully-liquid state the LEN-21 full exit needs. The deep three-way (page/chain/subgraph)
 * withdrawal auditing lives in e2e/withdrawal.spec.ts; these stay leaner.
 */
test.describe.serial("lender flows: deposit & withdraw (LEN-15…22)", () => {
  const market = pinnedMarkets.openTerm.toLowerCase() as Address
  let token: Address
  let decimals: number
  let cycle: number
  let minimumDeposit: bigint
  let apr: bigint
  let deposit: bigint
  let depositUnits: string
  const WITHDRAW = 40n
  let withdraw: bigint

  // cross-test state
  let expiry18 = 0
  let expiry22 = 0
  let expiry21 = 0
  let claimable19 = 0n

  test("setup: chain hygiene — settle unpaid batches, claim leftovers, fund accounts", async () => {
    const m = await subgraph.market(market)
    expect(m, "pinned openTerm market exists").not.toBeNull()
    expect(m!.isClosed, "market is open").toBe(false)
    token = m!.asset.address as Address
    decimals = m!.asset.decimals
    cycle = Number(m!.withdrawalBatchDuration)
    minimumDeposit = BigInt(m!.hooksConfig?.minimumDeposit ?? "0")
    apr = await marketApr(market)
    // Scaling rounds the credited amount down a hair, so exactly-minimum deposits fail the hook.
    deposit = minimumDeposit + parseUnits("1", decimals)
    if (deposit < parseUnits("100", decimals))
      deposit = parseUnits("100", decimals)
    depositUnits = formatUnits(deposit, decimals)
    withdraw = parseUnits(WITHDRAW.toString(), decimals)

    // The app compares batch expiries against wall time; never let the chain lag it.
    await syncChainTimeToWallClock()

    for (const account of [account0, account1, account2]) {
      faucet(account, parseUnits("1", 18))
    }
    // Previous runs can leave an unpaid FIFO queue (LEN-22 creates one on purpose); clear it
    // first so leftover claims below can complete.
    // Order matters: a crashed LEN-22 leaves a PENDING oversized batch. Expire it first
    // (selfClean advances time), then repay & settle the unpaid queue, then claim leftovers.
    for (const account of [account0, account1, account2]) {
      await selfCleanWithdrawals(account, market)
    }
    await settleUnpaidBatches(account1, market, token, decimals)
    for (const account of [account0, account1, account2]) {
      await selfCleanWithdrawals(account, market)
    }
    await syncSubgraph()
    expect(await unpaidBatchExpiries(market), "no unpaid batches left").toEqual(
      [],
    )
  })

  test("setup: agreements on the wall clock (ToU + no-MLA acknowledgement)", async ({
    page,
  }) => {
    // Signature endpoints validate timeSigned against the server wall clock, so this test uses
    // plain navigation (no chain-clock alignment) — see lib.ts.
    await ensureTouSigned(page, account0, market)
    await ensureNoMlaAcknowledged(page, account0, market)
  })

  test("LEN-15: self-onboarding market — minimum enforced, approve + deposit, 1:1 mint", async ({
    page,
  }) => {
    faucet(account0, deposit * 3n, token)
    const balBefore = await chain.marketBalance(market, account0)
    const acctBefore = await subgraph.lenderAccount(market, account0)
    const depositedBefore = BigInt(acctBefore?.totalDeposited ?? "0")

    await gotoMarket(page, market)
    await ensureConnected(page, account0)

    await step(
      page,
      "self-onboarding surfaced in Status & Details",
      async () => {
        // Upstream taxonomy (SDK 3.2.5+ / 121172ad): the access section now reads
        // "Lender Onboarding: Open" (+ "Open Deposits/Withdrawals/Transfers" rows) — the old
        // "Lender Self-Onboarding" label is gone. MarketParameters/index.tsx:660-666 renders
        // it, so it doubles as the "the section is really open" signal openSection retries on.
        const onboardingLabel = page.getByText(/^lender onboarding$/i)
        await openSection(page, /status and details/i, onboardingLabel)
        await expect(onboardingLabel.first()).toBeVisible({ timeout: 30_000 })
        await expect(page.getByText(/^open$/i).first()).toBeVisible({
          timeout: 15_000,
        })
        await openSection(page, /deposit & withdraw/i)
      },
    )

    const dialog = await openDepositDialog(page)

    if (minimumDeposit > 0n) {
      await step(page, "below-minimum deposit is blocked", async () => {
        const below = minimumDeposit - parseUnits("1", decimals)
        await dialog
          .getByRole("textbox")
          .first()
          .fill(formatUnits(below, decimals))
        // SDK_ERRORS_MAPPING.deposit.BelowMinimumDeposit
        await expect(
          dialog.getByText("Your deposit is below the minimum for this market"),
        ).toBeVisible({ timeout: 30_000 })
        await expect(
          dialog.getByRole("button", { name: /^deposit$/i }),
        ).toBeDisabled()
      })
    }

    await step(page, "approve + deposit at minimum + 1", async () => {
      await dialog.getByRole("textbox").first().fill(depositUnits)
      await submitDepositDialog(page, dialog)
    })

    await syncSubgraph()
    const balAfter = await chain.marketBalance(market, account0)
    const acctAfter = await subgraph.lenderAccount(market, account0)
    expect(acctAfter, "lender account exists after deposit").not.toBeNull()
    const depositedAfter = BigInt(acctAfter!.totalDeposited)

    // 1:1 mint: the indexer records the exact normalized deposit; the live balance may have
    // already accrued a hair of interest on top.
    expect(depositedAfter - depositedBefore, "subgraph deposit is exact").toBe(
      deposit,
    )
    const minted = balAfter - balBefore
    expect(minted >= deposit, "at least 1:1 market tokens received").toBe(true)
    expect(
      minted - deposit <= parseUnits("0.05", decimals),
      "no more than dust-level accrual on top of 1:1",
    ).toBe(true)
    attachAgreement("LEN-15 deposit 1:1", {
      deposit,
      mintedOnChain: minted,
      subgraphDelta: depositedAfter - depositedBefore,
    })
  })

  test("LEN-17: balance rebases upward at the configured APR", async ({
    page,
  }) => {
    const b0 = await chain.marketBalance(market, account0)
    const scaled0 = await marketScaledBalance(market, account0)
    const ts0 = await chain.blockTimestamp()
    expect(b0 > 0n, "lender holds a position").toBe(true)

    await advanceTime(3600)
    await chain.updateState(account0, market)
    await syncSubgraph()

    const b1 = await chain.marketBalance(market, account0)
    const scaled1 = await marketScaledBalance(market, account0)
    const ts1 = await chain.blockTimestamp()
    const dt = BigInt(ts1 - ts0)
    // Simple interest over one hour; compounding drift at these rates is far below tolerance.
    const expected = (b0 * apr * dt) / (10000n * 31536000n)
    const delta = b1 - b0

    expect(delta > 0n, "balance rebased upward").toBe(true)
    expect(
      absDiff(delta, expected) <= expected / 20n + 10n,
      `accrual ≈ APR: got ${delta}, expected ~${expected} (${apr} bips over ${dt}s)`,
    ).toBe(true)
    expect(scaled1, "rebase only — scaled balance unchanged").toBe(scaled0)

    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    const available = await readAvailableToWithdraw(page)
    expect(available.raw, "page shows the rebased balance").toBe(
      await chain.marketBalance(market, account0),
    )
    attachAgreement("LEN-17 interest accrual", {
      aprBips: apr,
      seconds: dt,
      balanceBefore: b0,
      balanceAfter: b1,
      delta,
      expected,
      pageValue: available.raw,
    })
  })

  test("LEN-18: partial withdrawal request enters the cycle; cycle end shown", async ({
    page,
  }) => {
    await gotoMarket(page, market)
    await ensureConnected(page, account0)

    await step(page, "queue a partial withdrawal", async () => {
      await page
        .getByRole("button", { name: /^withdraw$/i })
        .first()
        .click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      await dialog.getByRole("textbox").first().fill(WITHDRAW.toString())
      const confirm = dialog.getByRole("button", {
        name: new RegExp(`^withdraw ${WITHDRAW}`, "i"),
      })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      const balanceBeforeQueue = await chain.marketBalance(market, account0)
      await confirm.click()
      // The refetch can unmount the modal around the success view; the durable signal is the
      // on-chain burn of the queued (partial) amount.
      await expect
        .poll(
          async () =>
            balanceBeforeQueue - (await chain.marketBalance(market, account0)),
          { timeout: 120_000 },
        )
        .toBeGreaterThan(0n)
      // Optional dismiss: the button can be visible yet pointer-blocked by a closing overlay —
      // an unbounded click then eats the whole test budget (observed once under full-board
      // conditions). Bounded click; Escape closes the modal just as well when it's stuck.
      const backToMarket = page.getByRole("button", { name: /back to market/i })
      if (await backToMarket.isVisible().catch(() => false)) {
        const clicked = await backToMarket
          .click({ timeout: 10_000 })
          .then(() => true)
          .catch(() => false)
        if (!clicked) await page.keyboard.press("Escape")
      }
    })

    await syncSubgraph()
    const queuedAt = await chain.blockTimestamp()
    expiry18 = await findOpenBatchExpiry(market, account0, cycle)
    expect(expiry18, "expiry in the future").toBeGreaterThan(queuedAt)
    expect(
      expiry18 - queuedAt <= cycle + 5,
      "request entered the current cycle",
    ).toBe(true)

    const batch = (await subgraph.withdrawalBatch(market, expiry18))!
    expect(BigInt(batch.totalNormalizedRequests)).toBe(withdraw)
    const onChainBatch = await chain.getWithdrawalBatch(market, expiry18)
    expectAgreement("LEN-18 batch scaled total", {
      chain: onChainBatch.scaledTotalAmount,
      subgraph: batch.scaledTotalAmount,
      decimals,
    })

    await step(page, "cycle end time surfaced in the header", async () => {
      // MarketHeader shows "Ongoing Cycle · <time> left" while a batch is pending.
      await gotoMarket(page, market)
      await ensureConnected(page, account0)
      await expect(page.getByText(/ongoing cycle/i).first()).toBeVisible({
        timeout: 30_000,
      })
      // VERIFY: countdown text is humanized ("5 minutes left"); prefix match keeps it stable.
      await expect(page.getByText(/ left$/).first()).toBeVisible({
        timeout: 30_000,
      })
    })

    await step(page, "ongoing request row", async () => {
      await openWithdrawalRequests(page)
      const ongoing = await readOngoingAmounts(page)
      expect(ongoing.length).toBeGreaterThanOrEqual(1)
      expectFormattedEquals(ongoing[0], withdraw, decimals)
    })
  })

  test("LEN-19: claim succeeds on the first try after the cycle ends", async ({
    page,
  }) => {
    const now = await chain.blockTimestamp()
    if (now <= expiry18) await advanceTime(expiry18 - now + 1)
    await chain.updateState(account0, market) // keeper tx processes the expired batch
    await syncSubgraph()

    const batch = (await subgraph.withdrawalBatch(market, expiry18))!
    expect(batch.isExpired).toBe(true)
    // Scale-factor rounding can leave the paid amount a few wei short of the request.
    expect(
      BigInt(batch.normalizedAmountPaid) >= withdraw - 10n,
      "batch paid up to rounding dust",
    ).toBe(true)

    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    claimable19 = await chain.getAvailableWithdrawalAmount(
      market,
      account0,
      expiry18,
    )
    const before = await readWithdrawalsStatus(page)
    expect(before.claimableRaw, "page claimable equals chain").toBe(claimable19)
    const tokenBefore = await chain.erc20Balance(token, account0)

    await step(page, "single claim click — no retry", async () => {
      await page
        .getByRole("button", { name: /claim assets/i })
        .first()
        .click()
      // First-try success (gas-estimation regression): claimable must reach zero without any
      // error modal / "Try Again" interaction — this poll never clicks anything else.
      await expect
        .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
          timeout: 120_000,
        })
        .toBe(0n)
      expect(
        await page.getByRole("button", { name: /try again/i }).count(),
        "no failed-first-claim retry surfaced",
      ).toBe(0)
    })

    await syncSubgraph()
    const tokenAfter = await chain.erc20Balance(token, account0)
    expect(tokenAfter - tokenBefore, "underlying received").toBe(claimable19)
    const status = (await subgraph.lenderWithdrawalStatus(
      market,
      expiry18,
      account0,
    ))!
    expect(status.isCompleted).toBe(true)
    attachAgreement("LEN-19 claim", {
      claimable: claimable19,
      received: tokenAfter - tokenBefore,
      executionsCount: status.executionsCount,
    })
  })

  test("LEN-22: pro-rata payout when three lenders request more than reserves", async () => {
    // Co-lenders deposit chain-side (anvil signs); depositUpTo self-caps at market capacity.
    const coDeposit = parseUnits("300000", decimals)
    for (const account of [account1, account2]) {
      faucet(account, coDeposit, token)
      await chain.approve(account, token, market, coDeposit)
      await chain.depositUpTo(account, market, coDeposit)
    }
    await syncSubgraph()

    // We cannot borrow, so the shortfall comes from debt the assets never cover: the market's
    // pre-existing borrowed gap plus interest accrued while everyone holds — grow it for 2h.
    await advanceTime(7200)
    await chain.updateState(account0, market)

    const balances = [] as bigint[]
    for (const account of [account0, account1, account2]) {
      const balance = await chain.marketBalance(market, account)
      expect(balance > 0n, `${account} holds a position to request`).toBe(true)
      balances.push(balance)
    }
    const totalRequested = balances[0] + balances[1] + balances[2]
    const assets = await marketTotalAssets(market)
    expect(
      totalRequested > assets,
      `requests (${totalRequested}) must exceed reserves (${assets}) — ` +
        `if a concurrent run over-repaid this market, extend the accrual window`,
    ).toBe(true)

    // All three queue their ENTIRE balances inside one cycle. The helper's return value is the
    // SIMULATED expiry (computed one second before the batch-creating tx mines), so derive the real
    // batch from the subgraph instead of comparing simulation results.
    for (const account of [account0, account1, account2]) {
      await queueFullWithdrawal(account, market)
    }
    await syncSubgraph()
    const openExpiries = new Set<number>()
    for (const account of [account0, account1, account2]) {
      openExpiries.add(await findOpenBatchExpiry(market, account, cycle))
    }
    expect(openExpiries.size, "all requests landed in one batch").toBe(1)
    ;[expiry22] = [...openExpiries]

    const now = await chain.blockTimestamp()
    if (now <= expiry22) await advanceTime(expiry22 - now + 2)
    await chain.updateState(account0, market)
    await syncSubgraph()

    const onChainBatch = await chain.getWithdrawalBatch(market, expiry22)
    expect(
      onChainBatch.scaledAmountBurned < onChainBatch.scaledTotalAmount,
      "batch is only partially paid (shortfall exists)",
    ).toBe(true)
    const sgBatch = (await subgraph.withdrawalBatch(market, expiry22))!
    expect(sgBatch.isExpired).toBe(true)
    expectAgreement("LEN-22 normalizedAmountPaid", {
      chain: onChainBatch.normalizedAmountPaid,
      subgraph: sgBatch.normalizedAmountPaid,
      decimals,
    })

    // Shortfall rolls into the expired-unpaid FIFO queue.
    const unpaid = await unpaidBatchExpiries(market)
    expect(unpaid, "batch entered the unpaid queue").toContain(expiry22)
    expect(unpaid[0], "FIFO head is our batch").toBe(expiry22)

    // Pro-rata: each lender's claimable share of the paid amount tracks their scaled share.
    const proRata: Record<string, unknown> = {}
    for (const account of [account0, account1, account2]) {
      const claimable = await chain.getAvailableWithdrawalAmount(
        market,
        account,
        expiry22,
      )
      const st = await chain.getAccountWithdrawalStatus(
        market,
        account,
        expiry22,
      )
      const expected =
        (onChainBatch.normalizedAmountPaid * st.scaledAmount) /
        onChainBatch.scaledTotalAmount
      expect(
        claimable === expected,
        `pro-rata claimable for ${account}: ${claimable} vs ${expected}`,
      ).toBe(true)
      proRata[account] = { claimable, scaled: st.scaledAmount, expected }
    }
    attachAgreement("LEN-22 pro-rata", {
      requested: totalRequested,
      assetsAtQueue: assets,
      paid: onChainBatch.normalizedAmountPaid,
      scaledTotal: onChainBatch.scaledTotalAmount,
      scaledBurned: onChainBatch.scaledAmountBurned,
      ...proRata,
    })

    // Later repayment services the queue FIRST: repay the deficit (anyone may repay).
    const deficit =
      (await marketTotalDebts(market)) - (await marketTotalAssets(market))
    const repay = deficit + parseUnits("2", decimals)
    faucet(account1, repay, token)
    await chain.approve(account1, token, market, repay)
    await repayAndProcessUnpaidBatches(account1, market, repay, 5n)

    const batchAfterRepay = await chain.getWithdrawalBatch(market, expiry22)
    expect(
      batchAfterRepay.scaledAmountBurned,
      "repayment fully serviced the batch",
    ).toBe(batchAfterRepay.scaledTotalAmount)
    expect(await unpaidBatchExpiries(market), "unpaid queue drained").toEqual(
      [],
    )

    // Everyone claims; the market is left clean and fully liquid for LEN-21.
    for (const account of [account0, account1, account2]) {
      const claimable = await chain.getAvailableWithdrawalAmount(
        market,
        account,
        expiry22,
      )
      const before = await chain.erc20Balance(token, account)
      await chain.executeWithdrawal(account, market, account, expiry22)
      expect(
        (await chain.erc20Balance(token, account)) - before,
        `claim payout for ${account}`,
      ).toBe(claimable)
      expect(
        await chain.marketBalance(market, account),
        `${account} fully exited the batch`,
      ).toBe(0n)
    }
    await syncSubgraph()
  })

  test("LEN-21: full exit — entire balance withdrawn and claimed, lender leaves", async ({
    page,
  }) => {
    // Fresh position for the UI full-exit (LEN-22 exited everyone).
    faucet(account0, deposit * 2n, token)
    await chain.approve(account0, token, market, deposit)
    await chain.depositUpTo(account0, market, deposit)
    await syncSubgraph()

    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    const available = await readAvailableToWithdraw(page)
    expect(available.raw).toBe(await chain.marketBalance(market, account0))

    await step(page, "queue the entire balance via the Max chip", async () => {
      await page
        .getByRole("button", { name: /^withdraw$/i })
        .first()
        .click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      // No wrapper on this market → the quick-fill chip reads "Max · <amount>". It routes
      // through queueFullWithdrawal, which burns the live balance with no stale-read dust.
      await dialog.getByRole("button", { name: /^max ·/i }).click()
      const confirm = dialog.getByRole("button", {
        name: /^withdraw .*step/i,
      })
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      // A full withdrawal zeroes the balance; the refetch can unmount the modal before (or right
      // after) the success view renders. The durable signal is the on-chain burn, not the modal.
      // While the burn settles the market's scaled-token balanceOf can transiently revert with an
      // arithmetic under/overflow (projected-state read mid-transition — observed once on the final
      // board); that is a THROW, which fails expect.poll outright rather than retrying. Swallow a
      // transient read and keep polling — the durable target is a readable 0 balance.
      await expect
        .poll(
          async () => {
            try {
              return await chain.marketBalance(market, account0)
            } catch {
              return -1n
            }
          },
          {
            timeout: 120_000,
          },
        )
        .toBe(0n)
      // Optional dismiss: the button can be visible yet pointer-blocked by a closing overlay —
      // an unbounded click then eats the whole test budget (observed once under full-board
      // conditions). Bounded click; Escape closes the modal just as well when it's stuck.
      const backToMarket = page.getByRole("button", { name: /back to market/i })
      if (await backToMarket.isVisible().catch(() => false)) {
        const clicked = await backToMarket
          .click({ timeout: 10_000 })
          .then(() => true)
          .catch(() => false)
        if (!clicked) await page.keyboard.press("Escape")
      }
    })

    await syncSubgraph()
    expiry21 = await findOpenBatchExpiry(market, account0, cycle)
    expect(
      await chain.marketBalance(market, account0),
      "entire balance moved into the batch",
    ).toBe(0n)

    const now = await chain.blockTimestamp()
    if (now <= expiry21) await advanceTime(expiry21 - now + 1)
    await chain.updateState(account0, market)
    await syncSubgraph()
    const batch = await chain.getWithdrawalBatch(market, expiry21)
    expect(
      batch.scaledAmountBurned,
      "full-exit batch fully paid (market is liquid after LEN-22 repay)",
    ).toBe(batch.scaledTotalAmount)

    const tokenBefore = await chain.erc20Balance(token, account0)
    const claimable = await chain.getAvailableWithdrawalAmount(
      market,
      account0,
      expiry21,
    )
    await step(page, "claim the full exit", async () => {
      await gotoMarket(page, market)
      await ensureConnected(page, account0)
      await page
        .getByRole("button", { name: /claim assets/i })
        .first()
        .click()
      await expect
        .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
          timeout: 120_000,
        })
        .toBe(0n)
    })
    await syncSubgraph()

    const received = (await chain.erc20Balance(token, account0)) - tokenBefore
    expect(received).toBe(claimable)
    // Exit dust: whatever of the request never came back must be scale-factor rounding only.
    const st = (await subgraph.lenderWithdrawalStatus(
      market,
      expiry21,
      account0,
    ))!
    const requested = BigInt(st.totalNormalizedRequests)
    const withdrawn = BigInt(st.normalizedAmountWithdrawn)
    expect(
      requested - withdrawn <= 20n,
      `exit dust beyond rounding: requested ${requested}, withdrawn ${withdrawn}`,
    ).toBe(true)
    expect(st.isCompleted).toBe(true)

    // Lender has left the market everywhere.
    expect(await chain.marketBalance(market, account0)).toBe(0n)
    expect(await marketScaledBalance(market, account0)).toBe(0n)
    const acct = await subgraph.lenderAccount(market, account0)
    expect(BigInt(acct?.scaledBalance ?? "0")).toBe(0n)
    await gotoMarket(page, market)
    await ensureConnected(page, account0)
    const after = await readAvailableToWithdraw(page)
    expect(after.raw, "page shows no remaining position").toBe(0n)
    attachAgreement("LEN-21 full exit", {
      deposited: deposit,
      requested,
      withdrawn,
      received,
      dust: requested - withdrawn,
    })
  })

  test("teardown: record the openTerm end-state for the next suite", async () => {
    // Guard against accidental unpaid leftovers for the next suite on this shared fork.
    const sim = await simulateMarketWrite({
      account: account0,
      market,
      functionName: "repayAndProcessUnpaidWithdrawalBatches",
      args: [0n, 1n],
    })
    attachAgreement("openTerm end-state", {
      unpaid: await unpaidBatchExpiries(market),
      repaySimulationReverted: sim.reverted,
    })
  })
})
