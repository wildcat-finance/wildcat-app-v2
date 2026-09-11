/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits } from "viem"

import { rowsIn, searchField } from "./helpers"
import {
  CHAIN_ID,
  account0,
  account1,
  ensureNoMlaAcknowledged,
  ensureTouSigned,
  marketScaledBalance,
  openDepositDialog,
  openSection,
  simulateDepositAccess,
  submitDepositDialog,
} from "./lib"
import {
  accessListProviders,
  addAccessListMembers,
  borrowerMarkets,
  latestWithdrawalBatchExpiry,
  lenderHooksAccess,
  marketIsClosed,
  providerIsMember,
  providerMembershipIndexed,
  storedLenderStatus,
  type BorrowerMarketRow,
} from "../borrowerflows/lib"
import * as chain from "../lib/chain"
import {
  ANVIL_ACCOUNTS,
  APP_URL,
  faucet,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import {
  connectAs,
  ensureConnected,
  gotoMarket,
  readAvailableToWithdraw,
  readWithdrawalsStatus,
} from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * UAT 5 Lender Flows — the two page-5 cases whose fixtures the page-4 borrower-ops suite builds:
 *
 *   LEN-16 allowlisted lender deposits through the lender UI; a NON-member with funds, allowance
 *          and a signed ToU is blocked, and blocked for ACCESS specifically.
 *   LEN-20 terminated-market exit: Max request + claim through the UI with no cycle wait.
 *
 * Fixtures (borrowerflows/borrower-ops.spec.ts, which runs first — borrowerflows sorts before
 * lenderflows):
 *   - BOP-02 (borrower-ops.spec.ts:298) adds account #1 to the ACCESS_LIST provider of the
 *     borrower-#3 policy that administers the primary open-term market. This suite re-derives that
 *     market the same way and adds the membership chain-side if a fresh board left it absent.
 *   - BOP-23 (borrower-ops.spec.ts:1713) repays + terminates a SECONDARY borrower-#3 market while
 *     account #1 still holds a balance. That remaining balance is the LEN-20 fixture; this suite
 *     never closes a market itself — a missing fixture is an honest skip.
 *
 * Closed-market withdrawal semantics verified against v2.5-protocol (cited at the assertions):
 * a closed market queues withdrawals into a ZERO-duration batch, so no withdrawal cycle is
 * imposed; the batch is claimable as soon as a block exists whose timestamp is strictly greater
 * than the expiry. This suite never calls advanceTime — it mines (syncSubgraph) and, if anvil is
 * still inside the same wall-clock second, waits that one second out.
 */
test.describe.serial("lender flows: allowlist & closure", () => {
  /** Mirrors borrower-ops' isOpenTermRow: the shape BOP-02 picks its primary market from. */
  const isOpenTermRow = (m: BorrowerMarketRow) =>
    (m.hooksConfig?.fixedTermEndTime ?? 0) === 0 &&
    (m.hooksConfig?.periodDuration ?? 0) === 0 &&
    m.marketKind !== "REVOLVING"

  /** Never touch anvil #5 (page-2 BON-01 pristine wallet). */
  const NEGATIVE_CANDIDATES: { index: number; address: Address }[] = [
    { index: 0, address: account0 },
    { index: 6, address: ANVIL_ACCOUNTS[6] as Address },
    { index: 9, address: ANVIL_ACCOUNTS[9] as Address },
  ]

  let allowlist: BorrowerMarketRow | undefined
  let providerAddr: Address | undefined
  let closed: BorrowerMarketRow | undefined

  const requireAllowlist = () =>
    test.skip(
      !allowlist || !providerAddr,
      "no borrower-#3 open-term market whose policy carries a borrower-administered ACCESS_LIST provider — run the page-3 market-creation and page-4 BOP-02 suites first",
    )
  const requireClosed = () =>
    test.skip(
      !closed,
      "no CLOSED borrower-#3 market with a remaining account-#1 balance — BOP-23 (page 4) builds this fixture; LEN-20 must never close a market itself",
    )

  test("setup: locate the BOP-02 allowlist market and the BOP-23 closed market", async () => {
    await syncChainTimeToWallClock()
    const all = await borrowerMarkets()

    // Same discovery as BOP-02's "primary" (borrower-ops.spec.ts:163-176): the FIRST open,
    // open-term, non-revolving market whose hooks policy has an ACCESS_LIST provider
    // administered by borrower #3.
    for (const candidate of all.filter(
      (m) => !m.isClosed && isOpenTermRow(m),
    )) {
      const provs = await accessListProviders(candidate.hooks!.id)
      if (provs.length > 0) {
        allowlist = candidate
        providerAddr = provs[0].providerAddress as Address
        break
      }
    }

    // LEN-20 fixture: a closed borrower-#3 market where account #1 still holds market tokens.
    for (const candidate of all.filter((m) => m.isClosed)) {
      const acct = await subgraph.lenderAccount(candidate.id, account1)
      if (acct && BigInt(acct.scaledBalance) > 0n) {
        closed = candidate
        break
      }
    }

    // Gas for both actors; the negative wallet is funded inside LEN-16 (its funding is part of
    // the arrangement being asserted).
    for (const account of [account0, account1]) {
      faucet(account, parseUnits("1", 18))
    }

    attachAgreement("LEN-16/LEN-20 fixtures", {
      borrowerMarkets: all.length,
      allowlistMarket: allowlist
        ? { id: allowlist.id, name: allowlist.name, hooks: allowlist.hooks?.id }
        : null,
      accessListProvider: providerAddr ?? null,
      closedMarket: closed ? { id: closed.id, name: closed.name } : null,
    })
  })

  test("LEN-16: allowlisted lender deposits through the UI; a non-member is blocked for access", async ({
    page,
    browser,
  }) => {
    requireAllowlist()
    const market = allowlist!.id.toLowerCase() as Address
    const token = allowlist!.asset.address as Address
    const { decimals } = allowlist!.asset
    const hooksAddr = allowlist!.hooks!.id as Address
    const minimumDeposit = BigInt(allowlist!.hooksConfig?.minimumDeposit ?? "0")
    // Scaling rounds the credited amount down a hair, so an exactly-minimum tender is a
    // coin flip on the hook (CONVENTIONS "Amounts"): minimum + 1 unit.
    let deposit = minimumDeposit + parseUnits("1", decimals)
    if (deposit < parseUnits("100", decimals))
      deposit = parseUnits("100", decimals)
    const depositUnits = formatUnits(deposit, decimals)

    // ---------- arrange: membership (BOP-02's product; re-created chain-side if absent) ----------
    const wasMember = await providerIsMember(providerAddr!, account1)
    if (!wasMember) {
      await addAccessListMembers(providerAddr!, [account1])
      await syncSubgraph()
    }
    expect(
      await providerIsMember(providerAddr!, account1),
      "account #1 is an ACCESS_LIST member of the market's policy",
    ).toBe(true)
    expect(
      await providerMembershipIndexed(providerAddr!, account1),
      "roleProviderMembers indexed for account #1",
    ).toBe(true)

    faucet(account1, deposit * 3n, token)

    // ---------- arrange: agreements on the WALL clock (signature APIs bind timeSigned) ----------
    await connectAs(page, 1)
    await ensureTouSigned(page, account1, market)
    await ensureNoMlaAcknowledged(page, account1, market)

    // ---------- act: the lender UI deposit ----------
    const balBefore = await chain.marketBalance(market, account1)
    const acctBefore = await subgraph.lenderAccount(market, account1)
    const depositedBefore = BigInt(acctBefore?.totalDeposited ?? "0")
    const depositEntitiesBefore = acctBefore?.deposits.length ?? 0

    await gotoMarket(page, market)
    await ensureConnected(page, account1)

    await step(page, "allowlisted lender deposits through the UI", async () => {
      await openSection(
        page,
        /deposit & withdraw/i,
        page.getByText(/available to deposit/i),
      )
      const dialog = await openDepositDialog(page)
      await dialog.getByRole("textbox").first().fill(depositUnits)
      await submitDepositDialog(page, dialog)
    })

    await syncSubgraph()

    // ---------- assert: minted position, indexed deposit, UI reflection ----------
    // POLL for the mint, don't read once: the UI's deposit-success signal can fire a beat before
    // the mint settles on chain (observed as a 7s vs 15s split on a fresh board — a single read
    // caught balBefore and failed "1:1 minted"). Wait for the position to actually appear.
    await expect
      .poll(() => chain.marketBalance(market, account1), {
        timeout: 60_000,
        message: "the UI deposit mints at least the tendered amount on chain",
      })
      .toBeGreaterThanOrEqual(balBefore + deposit)
    const balAfter = await chain.marketBalance(market, account1)
    const minted = balAfter - balBefore
    expect(minted >= deposit, "at least 1:1 market tokens minted").toBe(true)
    // Market tokens rebase upward every block, so the live balance can exceed the tender by a
    // hair of accrual — but never by a material amount (CONVENTIONS "Amounts").
    expect(
      minted - deposit <= parseUnits("0.05", decimals),
      `minted ${minted} is more than dust above the ${deposit} deposit`,
    ).toBe(true)

    const acctAfter = await subgraph.lenderAccount(market, account1)
    expect(acctAfter, "lender account indexed after the deposit").not.toBeNull()
    expect(
      BigInt(acctAfter!.totalDeposited) - depositedBefore,
      "subgraph records the exact normalized deposit",
    ).toBe(deposit)
    expect(
      acctAfter!.deposits.length - depositEntitiesBefore,
      "exactly one new indexed Deposit entity",
    ).toBe(1)

    // The ACCESS_LIST provider is a PULL provider: the hooks' stored credential is minted on the
    // lender's FIRST interaction, so a successful deposit is what makes it appear (BOP-02 could
    // only assert membership + simulation).
    const credential = await storedLenderStatus(hooksAddr, account1)
    expect(
      credential.lastApprovalTimestamp,
      "deposit minted the hooks credential for account #1",
    ).toBeGreaterThan(0)
    const indexedAccess = await lenderHooksAccess(hooksAddr, account1)
    expect(
      indexedAccess,
      "LenderHooksAccess indexed for account #1",
    ).not.toBeNull()

    const positionOnChain = await chain.marketBalance(market, account1)
    await step(page, "market page shows the new position", async () => {
      await gotoMarket(page, market)
      await ensureConnected(page, account1)
      // Nothing mines while the page polls, so balanceOf is stable: poll the page until it
      // catches up with the chain value read above.
      await expect
        .poll(async () => (await readAvailableToWithdraw(page)).raw, {
          timeout: 90_000,
        })
        .toBe(positionOnChain)
    })

    attachAgreement("LEN-16 allowlisted deposit", {
      market,
      provider: providerAddr,
      memberBeforeTest: wasMember,
      deposit,
      mintedOnChain: minted,
      subgraphDelta: BigInt(acctAfter!.totalDeposited) - depositedBefore,
      newDepositEntities: acctAfter!.deposits.length - depositEntitiesBefore,
      credentialTimestamp: credential.lastApprovalTimestamp,
    })

    // ---------- negative: a NON-member wallet, every other prerequisite satisfied ----------
    let negative: { index: number; address: Address } | undefined
    for (const candidate of NEGATIVE_CANDIDATES) {
      if (!(await providerIsMember(providerAddr!, candidate.address))) {
        negative = candidate
        break
      }
    }
    expect(
      negative,
      "a non-member anvil wallet exists for the negative case (never #5)",
    ).toBeTruthy()

    // Arrange AWAY every unrelated failure: gas, underlying balance, allowance, ToU.
    faucet(negative!.address, parseUnits("1", 18))
    faucet(negative!.address, deposit * 3n, token)
    await chain.approve(negative!.address, token, market, deposit * 3n)

    const negBalance = await chain.erc20Balance(token, negative!.address)
    const negAllowance = await chain.erc20Allowance(
      token,
      negative!.address,
      market,
    )
    expect(
      negBalance >= deposit,
      "negative wallet holds enough underlying",
    ).toBe(true)
    expect(
      negAllowance >= deposit,
      "negative wallet has already approved the market",
    ).toBe(true)
    expect(
      await marketIsClosed(market),
      "market is open (closure is not the reason)",
    ).toBe(false)
    expect(
      deposit >= minimumDeposit,
      "tender is at or above the minimum (minimum is not the reason)",
    ).toBe(true)
    expect(
      (await storedLenderStatus(hooksAddr, negative!.address))
        .isBlockedFromDeposits,
      "negative wallet is not hooks-blocked (removal is not the reason)",
    ).toBe(false)

    // Chain oracle: the simulation fails for ACCESS, by name. OpenTermHooks.onDeposit checks
    // blocked -> minimum -> credential (v2.5 src/access/OpenTermHooks.sol:275-299), and
    // WildcatMarket._depositUpTo calls the hook BEFORE safeTransferFrom
    // (src/market/WildcatMarket.sol:72-75) — hence the explicit balance/allowance oracles above.
    const negSim = await simulateDepositAccess({
      account: negative!.address,
      market,
      amount: deposit,
    })
    expect(negSim.reverted, "non-member deposit simulation reverts").toBe(true)
    expect(
      negSim.errorName,
      `revert reason must be the access error, got: ${negSim.message}`,
    ).toBe("NotApprovedLender")

    // Control: the SAME simulation from the allowlisted lender does not revert for access.
    // (It may still be capped by the wallet's balance — assert only that access passes.)
    faucet(account1, deposit * 3n, token)
    await chain.approve(account1, token, market, deposit * 3n)
    const memberSim = await simulateDepositAccess({
      account: account1,
      market,
      amount: deposit,
    })
    expect(
      memberSim.errorName,
      "the allowlisted lender is not refused for access",
    ).not.toBe("NotApprovedLender")

    const negContext = await browser.newContext({ baseURL: APP_URL })
    let uiGate = ""
    try {
      const negPage = await negContext.newPage()
      await connectAs(negPage, negative!.index)
      await ensureTouSigned(negPage, negative!.address, market)
      const touState = (await (
        await fetch(
          `${APP_URL}/api/sla/${
            negative!.address
          }?chainId=${CHAIN_ID}&party=Lender`,
        )
      ).json()) as { state: string }
      expect(
        touState.state,
        "negative wallet has a current ToU acceptance (ToU is not the reason)",
      ).toBe("signedCurrent")

      await gotoMarket(negPage, market)
      await ensureConnected(negPage, negative!.address)

      await step(
        negPage,
        "non-member: the UI offers no deposit path",
        async () => {
          // Two shapes are legitimate, depending on whether the policy also gates WITHDRAWALS:
          //  - useOnQueueWithdrawal=false  -> the SDK infers WithdrawOnly, the lender surface
          //    renders, and the Deposit action is simply withheld (depositAvailability =
          //    RequiresAccess -> MarketActions/index.tsx:119-122 hideDeposit).
          //  - withdrawal access required  -> accessState "unauthorized" and the page renders the
          //    request-access LeadBanner instead of any action.
          const depositBlock = negPage
            .getByText(/available to deposit/i)
            .first()
          const requestBanner = negPage
            .getByText(/lend through wildcat/i)
            .first()
          await expect(depositBlock.or(requestBanner)).toBeVisible({
            timeout: 60_000,
          })
          if (await requestBanner.isVisible().catch(() => false)) {
            uiGate = "request-access banner"
            await expect(
              negPage.getByRole("button", { name: /leave a request/i }).first(),
            ).toBeVisible({ timeout: 30_000 })
          } else {
            uiGate = "deposit action withheld"
            await expect(
              negPage.getByRole("button", { name: /^deposit$/i }),
            ).toHaveCount(0)
          }
          // The wallet is funded, so the market page cannot be offering the testnet Faucet
          // instead — the missing action is the access gate, not the funding gate.
          await expect(
            negPage.getByRole("button", { name: /^faucet$/i }),
          ).toHaveCount(0)
        },
      )

      await step(
        negPage,
        "market states managed (borrower-approved) onboarding",
        async () => {
          // MarketParameters renders getLenderOnboardingType(market.onboardingMode); an
          // access-list provider is explicitly NOT self-onboarding
          // (src/utils/marketCapabilities.ts#hasActiveLenderOnboardingRoleProvider), so the
          // market's own access statement is "Managed".
          const label = negPage.getByText(/^lender onboarding$/i)
          await openSection(negPage, /status and details/i, label)
          await expect(label.first()).toBeVisible({ timeout: 30_000 })
          await expect(negPage.getByText(/^managed$/i).first()).toBeVisible({
            timeout: 30_000,
          })
        },
      )

      await step(
        negPage,
        "all-markets row offers Request, not Deposit",
        async () => {
          // The catalogue is where the app names the reason: a Managed market the wallet cannot
          // deposit into renders the "Request" CTA (ExploreMarketsTable/index.tsx:695-731 ->
          // getLenderMarketAction -> LenderMarketAction.RequestAccess) in the "Onboard by
          // Borrower" (#manual) accordion.
          await negPage.goto("/lender/all-markets")
          await ensureConnected(negPage, negative!.address)
          await searchField(negPage).fill(allowlist!.name)
          const row = rowsIn(negPage, "manual").filter({
            hasText: allowlist!.name,
          })
          await expect(row).toHaveCount(1, { timeout: 90_000 })
          await expect(
            row.getByRole("button", { name: /^request$/i }),
          ).toBeVisible({ timeout: 30_000 })
          await expect(
            row.getByRole("button", { name: /^deposit$/i }),
          ).toHaveCount(0)
        },
      )
    } finally {
      await negContext.close()
    }

    attachAgreement("LEN-16 non-member blocked for access", {
      negativeWallet: negative!.address,
      anvilIndex: negative!.index,
      isMember: false,
      underlyingBalance: negBalance,
      allowance: negAllowance,
      minimumDeposit,
      tender: deposit,
      simulationRevert: negSim.errorName,
      allowlistedControlRevert: memberSim.errorName ?? "none",
      uiGate,
    })
  })

  test("LEN-20: terminated-market exit — Max request and claim with no cycle wait", async ({
    page,
  }) => {
    requireClosed()
    const market = closed!.id.toLowerCase() as Address
    const token = closed!.asset.address as Address
    const cycle = Number(closed!.withdrawalBatchDuration)
    expect(await marketIsClosed(market), "fixture market is terminated").toBe(
      true,
    )
    expect(
      cycle,
      "the market does have an ordinary withdrawal cycle",
    ).toBeGreaterThan(0)

    faucet(account1, parseUnits("1", 18))

    // Hygiene: claim (never time-travel) anything a crashed run left behind. A closed market's
    // batches carry zero duration, so leftovers are already claimable.
    for (const oldExpiry of await subgraph.openWithdrawalExpiries(
      market,
      account1,
    )) {
      const available = await chain
        .getAvailableWithdrawalAmount(market, account1, oldExpiry)
        .catch(() => 0n)
      if (available > 0n)
        await chain.executeWithdrawal(account1, market, account1, oldExpiry)
    }

    // A terminated market cannot be re-entered (WildcatMarket._depositUpTo reverts
    // DepositToClosedMarket, src/market/WildcatMarket.sol:60), so this case CONSUMES its fixture:
    // a second run in the same board has nothing left to exit and says so rather than pretending.
    const balanceBefore = await chain.marketBalance(market, account1)
    test.skip(
      balanceBefore === 0n,
      "the LEN-20 fixture is already exited (this case consumes it, and a closed market cannot be re-entered) — BOP-23 rebuilds it on the next board",
    )

    await connectAs(page, 1)
    await ensureTouSigned(page, account1, market)
    await gotoMarket(page, market)
    await ensureConnected(page, account1)
    await expect
      .poll(async () => (await readAvailableToWithdraw(page)).raw, {
        timeout: 90_000,
      })
      .toBe(balanceBefore)

    const tsAtQueue = await chain.blockTimestamp()
    await step(
      page,
      "request the entire balance via the Max chip",
      async () => {
        await page
          .getByRole("button", { name: /^withdraw$/i })
          .first()
          .click()
        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible({ timeout: 30_000 })
        // "Max · <amount>" with no wrapper, "All · <amount>" when a wrapped position exists
        // (WithdrawModal/components/WithdrawForm.tsx:137-151).
        await dialog
          .getByRole("button", { name: /^(max|all) ·/i })
          .first()
          .click()
        const confirm = dialog.getByRole("button", {
          name: /^withdraw .*step/i,
        })
        await expect(confirm).toBeEnabled({ timeout: 30_000 })
        await confirm.click()
        // The refetch can unmount the modal around the success view; the durable signal is the
        // on-chain burn (CONVENTIONS "UI waits").
        await expect
          .poll(async () => chain.marketBalance(market, account1), {
            timeout: 120_000,
          })
          .toBe(0n)
        const backToMarket = page.getByRole("button", {
          name: /back to market/i,
        })
        if (await backToMarket.isVisible().catch(() => false)) {
          const clicked = await backToMarket
            .click({ timeout: 10_000 })
            .then(() => true)
            .catch(() => false)
          if (!clicked) await page.keyboard.press("Escape")
        }
      },
    )

    // The queue transaction is the last thing that mined — its block timestamp is the baseline
    // the batch duration is measured from (`tsAtQueue` was read before the UI ceremony and lags
    // it by however long the dialog took).
    const queueBlockTs = await chain.blockTimestamp()
    await syncSubgraph()
    const expiry = await latestWithdrawalBatchExpiry(market)

    // PROTOCOL: WildcatMarketWithdrawals._queueWithdrawal uses
    //   `uint duration = state.isClosed.ternary(0, withdrawalBatchDuration)`
    // (v2.5-protocol src/market/WildcatMarketWithdrawals.sol:96-99), so a terminated market's
    // batch expires in the block it was created in — no withdrawal cycle is imposed. The only
    // adjustment is the +1 collision guard when a batch already exists at that key (:102-107).
    expect(
      expiry >= queueBlockTs - 1 && expiry <= queueBlockTs + 1,
      `closed-market batch must carry ZERO duration: expiry ${expiry} vs the queue block's ${queueBlockTs}`,
    ).toBe(true)
    expect(
      expiry < queueBlockTs + cycle,
      `expiry ${expiry} must not be pushed a full ${cycle}s cycle out`,
    ).toBe(true)

    // PROTOCOL: getAvailableWithdrawalAmount / _getUpdatedState require the expiry to be
    // STRICTLY in the past (`gt(timestamp(), expiry)` — src/libraries/MarketState.sol:182-188,
    // src/market/WildcatMarketWithdrawals.sol:60-62). Anvil derives block timestamps from the
    // wall clock, so blocks mined inside the same second repeat it: mine, and if needed let
    // that ONE second elapse. This is deliberately not advanceTime — the point of the case is
    // that no protocol wait exists beyond the next second.
    let mines = 0
    while ((await chain.blockTimestamp()) <= expiry) {
      expect(
        mines,
        "closed-market batch became claimable within seconds",
      ).toBeLessThan(10)
      await new Promise((resolve) => {
        setTimeout(resolve, 1_100)
      })
      await syncSubgraph()
      mines += 1
    }
    const tsClaimable = await chain.blockTimestamp()

    const claimable = await chain.getAvailableWithdrawalAmount(
      market,
      account1,
      expiry,
    )
    expect(claimable > 0n, "the whole request is payable (closed market)").toBe(
      true,
    )
    const tokenBefore = await chain.erc20Balance(token, account1)

    await step(page, "claim the exit — no cycle wait", async () => {
      await gotoMarket(page, market)
      await ensureConnected(page, account1)
      await expect
        .poll(async () => (await readWithdrawalsStatus(page)).claimableRaw, {
          timeout: 120_000,
        })
        .toBe(claimable)
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
    const received = (await chain.erc20Balance(token, account1)) - tokenBefore
    expect(received, "underlying received equals the claimed amount").toBe(
      claimable,
    )

    const tsAfterClaim = await chain.blockTimestamp()
    expect(
      tsAfterClaim - tsAtQueue < cycle,
      `the whole request+claim took ${
        tsAfterClaim - tsAtQueue
      }s of chain time — a terminated market must not impose its ${cycle}s cycle`,
    ).toBe(true)

    // Complete exit: nothing left on chain, in the indexer, or on the page.
    expect(await chain.marketBalance(market, account1)).toBe(0n)
    expect(await marketScaledBalance(market, account1)).toBe(0n)
    const status = (await subgraph.lenderWithdrawalStatus(
      market,
      expiry,
      account1,
    ))!
    const requested = BigInt(status.totalNormalizedRequests)
    const withdrawn = BigInt(status.normalizedAmountWithdrawn)
    // Scale-factor rounding can leave a few wei behind (CONVENTIONS "Amounts").
    expect(
      requested - withdrawn <= 20n,
      `exit dust beyond rounding: requested ${requested}, withdrawn ${withdrawn}`,
    ).toBe(true)
    expect(status.isCompleted).toBe(true)

    await expect
      .poll(async () => (await readAvailableToWithdraw(page)).raw, {
        timeout: 90_000,
      })
      .toBe(0n)
    await expect(page.getByTestId("lender-withdrawals-status")).toHaveText(
      /nothing to claim/i,
      { timeout: 60_000 },
    )

    attachAgreement("LEN-20 terminated-market exit", {
      market,
      name: closed!.name,
      cycleSeconds: cycle,
      balanceBefore,
      batchExpiry: expiry,
      queuedAtChainTs: tsAtQueue,
      queueBlockTs,
      claimableAtChainTs: tsClaimable,
      secondsFromRequestToClaimable: tsClaimable - tsAtQueue,
      secondsFromRequestToClaimed: tsAfterClaim - tsAtQueue,
      extraBlocksMined: mines,
      claimed: claimable,
      received,
      requested,
      withdrawn,
      dust: requested - withdrawn,
    })
  })
})
