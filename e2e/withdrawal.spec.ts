import { parseUnits } from "viem"

import { selfCleanWithdrawals, settleUnpaidBatches } from "./lenderflows/lib"
import { expectAgreement, expectFormattedEquals } from "./lib/assert"
import * as chain from "./lib/chain"
import {
  ANVIL_ACCOUNTS,
  advanceTime,
  faucet,
  gql,
  pins,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "./lib/env"
import {
  ensureConnected,
  gotoMarket,
  readAvailableToWithdraw,
  openWithdrawalRequests,
  readOngoingAmounts,
  readWithdrawalsStatus,
} from "./lib/page"
import * as subgraph from "./lib/subgraph"
import { expect, test } from "./lib/test"

/**
 * Lender withdrawal lifecycle on the local fork: queue via the UI, wait out the withdrawal cycle
 * (time travel), let the batch expire on-chain, claim via the UI. Page, chain and subgraph must agree
 * at every step.
 */
test.describe.serial("lender withdrawal: queue → expiry → claim", () => {
  const account = ANVIL_ACCOUNTS[pins.smoke.account] as Address
  // Open-term market: periodic markets only accept withdrawals inside their windows (WithdrawOutsideWindow).
  const market = pins.markets.openTerm.toLowerCase() as Address
  const DEPOSIT = 100n
  const WITHDRAW = 40n
  let decimals: number
  let token: Address
  let deposit: bigint
  let withdraw: bigint
  let cycle: number
  let expiry: number
  let tokenBalanceBefore: bigint

  test("setup: fund and deposit through the chain (UI deposit is covered by the smoke)", async () => {
    const m = await subgraph.market(market)
    expect(m, "pinned market exists").not.toBeNull()
    decimals = m!.asset.decimals
    token = m!.asset.address as Address
    cycle = Number(m!.withdrawalBatchDuration)
    // The market's hooks may enforce a minimum deposit; deposit whichever is larger.
    const minimumDeposit = BigInt(m!.hooksConfig?.minimumDeposit ?? "0")
    deposit = parseUnits(DEPOSIT.toString(), decimals)
    // Scaling rounds the credited amount down a hair, so exactly-minimum deposits fail the hook check.
    if (deposit <= minimumDeposit)
      deposit = minimumDeposit + parseUnits("1", decimals)
    withdraw = parseUnits(WITHDRAW.toString(), decimals)
    expect(withdraw <= deposit, "withdraw amount within the deposit").toBe(true)
    expect(
      Number(
        await chain.publicClient.readContract({
          address: market,
          abi: chain.marketAbi,
          functionName: "withdrawalBatchDuration",
        }),
      ),
      "cycle: chain vs subgraph",
    ).toBe(cycle)

    // The app compares batch expiries against wall time; align chain time first (never backwards).
    await syncChainTimeToWallClock()
    // Self-clean via the hardened lenderflows helpers (guards zero-claimable batches, settles
    // unpaid queues; review finding #7).
    await selfCleanWithdrawals(account, market)
    await settleUnpaidBatches(account, market, token, decimals)
    await selfCleanWithdrawals(account, market)
    await syncSubgraph()

    faucet(account, parseUnits("1", 18))
    faucet(account, deposit * 2n, token)
    await chain.approve(account, token, market, deposit)
    await chain.depositUpTo(account, market, deposit)
    await syncSubgraph()
    const bal = await chain.marketBalance(market, account)
    expect(bal >= deposit, "market balance covers the deposit").toBe(true)
    tokenBalanceBefore = await chain.erc20Balance(token, account)
  })

  test("page shows the available balance that chain and subgraph report", async ({
    page,
  }) => {
    await gotoMarket(page, market)
    await ensureConnected(page, account)
    const available = await readAvailableToWithdraw(page)
    const onChain = await chain.marketBalance(market, account)
    expect(available.raw, "data-value equals market balance").toBe(onChain)
    expectFormattedEquals(available.text, onChain, decimals)
    const status = await readWithdrawalsStatus(page)
    expect(status.claimableRaw).toBe(0n)
  })

  test("queue a withdrawal through the UI", async ({ page }) => {
    await gotoMarket(page, market)
    await ensureConnected(page, account)
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
    await confirm.click()
    // The withdraw modal has its own success view; the title is the success signal.
    await expect(page.getByText("Withdrawal Requested")).toBeVisible({
      timeout: 120_000,
    })
    await syncSubgraph()

    // Which batch did it land in? The batch expiry is the cycle end for the block the tx was in.
    const ts = await chain.blockTimestamp()
    // Search recent batches on the subgraph for this lender's open request.
    const candidates = await gql<{ withdrawalBatches: { expiry: string }[] }>(
      `{ withdrawalBatches(where: { market: "${market}", expiry_gte: ${
        ts - cycle * 2
      } }, orderBy: expiry, orderDirection: desc, first: 5) { expiry } }`,
    )
    const found = []
    for (const b of candidates.withdrawalBatches) {
      const st = await subgraph.lenderWithdrawalStatus(
        market,
        Number(b.expiry),
        account,
      )
      if (st && !st.isCompleted) found.push(Number(b.expiry))
    }
    expect(found.length, "exactly one open batch for this lender").toBe(1)
    expiry = found[0]
    expect(expiry, "expiry is in the future").toBeGreaterThan(ts)
  })

  test("after queueing: page, chain and subgraph agree", async ({ page }) => {
    const batch = (await subgraph.withdrawalBatch(market, expiry))!
    const status = (await subgraph.lenderWithdrawalStatus(
      market,
      expiry,
      account,
    ))!
    const onChainBatch = await chain.getWithdrawalBatch(market, expiry)
    const onChainStatus = await chain.getAccountWithdrawalStatus(
      market,
      account,
      expiry,
    )
    expect(batch.isExpired).toBe(false)
    expect(BigInt(batch.totalNormalizedRequests)).toBe(withdraw)
    expect(BigInt(status.totalNormalizedRequests)).toBe(withdraw)
    expectAgreement("batch scaled total", {
      chain: onChainBatch.scaledTotalAmount,
      subgraph: batch.scaledTotalAmount,
      decimals,
    })
    expectAgreement("lender scaled amount", {
      chain: onChainStatus.scaledAmount,
      subgraph: status.scaledAmount,
      decimals,
    })

    await gotoMarket(page, market)
    await ensureConnected(page, account)
    // MarketActions (available/claimable) lives in the default section; read it before switching sections.
    const available = await readAvailableToWithdraw(page)
    expect(available.raw, "available reduced by the queued amount").toBe(
      await chain.marketBalance(market, account),
    )
    const st = await readWithdrawalsStatus(page)
    expect(st.claimableRaw, "nothing claimable before expiry").toBe(0n)
    await openWithdrawalRequests(page)
    const ongoing = await readOngoingAmounts(page)
    expect(ongoing.length, "one ongoing request row").toBeGreaterThanOrEqual(1)
    expectFormattedEquals(ongoing[0], withdraw, decimals)
  })

  test("time travel past the cycle; the batch expires and is paid on the next state update", async () => {
    const now = await chain.blockTimestamp()
    await advanceTime(Math.max(1, expiry - now) + 1)
    await chain.updateState(account, market) // keeper tx: processes the expired batch
    await syncSubgraph()
    const batch = (await subgraph.withdrawalBatch(market, expiry))!
    expect(batch.isExpired, "subgraph marks the batch expired").toBe(true)
    // Scale-factor rounding can leave the paid amount 1 wei short of the request.
    expect(
      BigInt(batch.normalizedAmountPaid) >= withdraw - 10n,
      "batch fully paid up to rounding dust (market has liquidity)",
    ).toBe(true)
    const onChainBatch = await chain.getWithdrawalBatch(market, expiry)
    expectAgreement("normalizedAmountPaid", {
      chain: onChainBatch.normalizedAmountPaid,
      subgraph: batch.normalizedAmountPaid,
      decimals,
    })
    const claimable = await chain.getAvailableWithdrawalAmount(
      market,
      account,
      expiry,
    )
    expect(claimable > 0n, "lender has a claimable amount on-chain").toBe(true)
  })

  test("claim through the UI; final state agrees everywhere", async ({
    page,
  }) => {
    await gotoMarket(page, market)
    await ensureConnected(page, account)
    const before = await readWithdrawalsStatus(page)
    const claimableOnChain = await chain.getAvailableWithdrawalAmount(
      market,
      account,
      expiry,
    )
    expect(before.claimableRaw, "page claimable equals chain").toBe(
      claimableOnChain,
    )
    expect(before.text).toMatch(/ready to claim/i)

    await page
      .getByRole("button", { name: /claim assets/i })
      .first()
      .click()
    // On success the app refetches, claimable drops to 0 and the alert block (with its success
    // dialog) unmounts almost immediately — the durable success signal is the claimed page state.
    await expect
      .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
        timeout: 120_000,
      })
      .toBe(0n)
    await syncSubgraph()

    const tokenBalance = await chain.erc20Balance(token, account)
    expect(tokenBalance - tokenBalanceBefore, "underlying received").toBe(
      claimableOnChain,
    )
    const status = (await subgraph.lenderWithdrawalStatus(
      market,
      expiry,
      account,
    ))!
    expect(status.isCompleted, "subgraph: lender withdrawal completed").toBe(
      true,
    )
    expect(status.executionsCount).toBeGreaterThanOrEqual(1)
    expectAgreement("normalizedAmountWithdrawn", {
      chain: (await chain.getAccountWithdrawalStatus(market, account, expiry))
        .normalizedAmountWithdrawn,
      subgraph: status.normalizedAmountWithdrawn,
      decimals,
    })
    await page.reload()
    await ensureConnected(page, account)
    const after = await readWithdrawalsStatus(page)
    expect(after.claimableRaw, "nothing left to claim").toBe(0n)
  })
})
