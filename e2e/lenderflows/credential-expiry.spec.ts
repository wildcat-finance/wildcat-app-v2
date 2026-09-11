/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { parseUnits } from "viem"

import {
  CHAIN_ID,
  account2,
  ensureTouSigned,
  marketTotalAssets,
  marketTotalDebts,
  openSection,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  simulateDepositAccess,
  unpaidBatchExpiries,
} from "./lib"
import {
  accessListProviders,
  addAccessListMembers,
  borrowerMarkets,
  latestWithdrawalBatchExpiry,
  lenderBlockedFromDeposits,
  liveLenderStatus,
  marketIsClosed,
  providerIsMember,
  providerMembershipIndexed,
  removeAccessListMembers,
  roleProviderRow,
  roleProviderTimeToLive,
  setRoleProviderTimeToLive,
  simulateFrom,
  storedLenderStatus,
  unblockFromDeposits,
  type BorrowerMarketRow,
} from "../borrowerflows/lib"
import * as chain from "../lib/chain"
import {
  APP_URL,
  advanceTime,
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
 * UAT 5 Lender Flows — LEN-34 "Credential expiry"
 * (runsheet `uat_5 Lender Flows.tsv:44`: "If a market uses expiring credentials: let one expire
 * (or remove role provider). New deposits blocked; known lender retains withdrawal rights.")
 *
 * WHICH mechanism, and why. The v2.5 provider checkpoint
 * (mono/kb/workstreams/v2.5/HOOKS_ROLE_PROVIDER_CHECKPOINT_2026-08-12.md, "Cache and local
 * policy") names three NON-equivalent ways a lender can lose deposit access:
 *
 *   1. ZERO-TTL revalidation — "TTL zero makes a pull credential non-cacheable, including
 *      another check in the same block. Removing a member therefore affects that provider's
 *      next credential-gated interaction."  → removal bites IMMEDIATELY, no expiry to wait for.
 *   2. POSITIVE-TTL cache     — "A positive TTL deliberately accepts delayed removal until the
 *      configured cache window expires."     → removal bites only when the CREDENTIAL EXPIRES.
 *   3. Hook-local block       — "Provider grants and refreshes cannot clear or bypass a
 *      hook-local lender block."              → independent of any provider.
 *
 * (3) is already covered: the app's own "remove lender" flow submits `blockFromDeposits` on the
 * hooks instance — see BOP-03b / BOP-05 (borrowerflows/borrower-ops.spec.ts), which assert
 * exactly that and note that provider membership survives it. This case therefore covers the
 * PROVIDER-side mechanisms, and covers (2) as its headline because the runsheet row asks for
 * credential EXPIRY:
 *
 *   - Every access-list provider this generation attaches is configured with TTL 0 (verified on
 *     this board: both borrower-#3 ACCESS_LIST policies read `timeToLive == 0`), so "let a
 *     credential expire" does not exist until an administrator creates a cache window.
 *   - `addRoleProvider(provider, ttl)` on an ALREADY-approved provider updates ONLY the TTL
 *     (v2.5-protocol/src/access/BaseAccessControls.sol:256-259,:316-317) and is administrator-
 *     only — the borrower who owns the policy. So the expiring credential is CONFIGURED here,
 *     chain-side, on the policy's own provider, and restored to TTL 0 at the end.
 *
 * The test therefore proves, on one fixture:
 *   a. positive TTL + membership revoked → deposit STILL allowed while the cache window runs
 *      (delayed removal), then DENIED for access once the credential expires;
 *   b. the denial is the ACCESS error specifically (`NotApprovedLender`) with funds, allowance,
 *      ToU, market state and minimum deposit all arranged away, and no hook-local block;
 *   c. the UI withholds the deposit action it offered minutes earlier;
 *   d. withdrawal rights are RETAINED — the known lender queues and claims a full exit, on
 *      chain and through the UI;
 *   e. the ZERO-TTL contrast, with no time travel at all: restored to TTL 0, adding the member
 *      grants on the next call and removing them denies on the next call.
 *
 * Fixture: a borrower-#3 open-term market whose policy carries a borrower-administered
 * ACCESS_LIST provider, deliberately NOT the first such market — that one is BOP-02's primary
 * and LEN-16's subject (lenderflows/allowlist-closure.spec.ts), and this case mutates its
 * policy's TTL and membership.
 *
 * BOARD HYGIENE: the fixture policy is restored to exactly the state it was found in — provider
 * TTL back to 0, the lender not a member — by the end of the test, with a `test.afterAll` net
 * for the TTL in case of a mid-test crash.
 *
 * COMPARISON NOTE: rows pair by UAT id (`e2e/lib/compare.ts`), not by suite+title, so moving a
 * case between files no longer de-pairs it. The main worktree keeps its fixme, so the gap still
 * shows on that side.
 */
test.describe.serial("lender flows: credential expiry (LEN-34)", () => {
  test.setTimeout(900_000)

  /** Cache window installed on the provider for the expiry half. Bounded on purpose: this is a
   *  ONE-WAY jump on a shared fork, and 5 minutes is ample to observe delayed removal. */
  const CACHE_TTL = 300

  /** Mirrors borrower-ops' isOpenTermRow — the shape BOP-02 picks its primary market from. */
  const isOpenTermRow = (m: BorrowerMarketRow) =>
    (m.hooksConfig?.fixedTermEndTime ?? 0) === 0 &&
    (m.hooksConfig?.periodDuration ?? 0) === 0 &&
    m.marketKind !== "REVOLVING"

  const LENDER = account2

  let fixture: BorrowerMarketRow | undefined
  let providerAddr: Address | undefined
  let len16Market: string | undefined
  /** afterAll safety net: a crash mid-test must not leave a cache window on a board policy. */
  let ttlNeedsRestore = false

  const requireFixture = () =>
    test.skip(
      !fixture || !providerAddr,
      "no SECOND borrower-#3 open-term market with a borrower-administered ACCESS_LIST provider — page 3 deploys two (MKT-13, MKT-14); the first belongs to BOP-02/LEN-16 and must not have its provider TTL mutated",
    )

  test.afterAll(async () => {
    if (!ttlNeedsRestore || !fixture || !providerAddr) return
    await setRoleProviderTimeToLive(
      fixture.hooks!.id as Address,
      providerAddr,
      0,
    )
  })

  test("setup: pick a spare allowlist policy (never LEN-16's)", async () => {
    await syncChainTimeToWallClock()
    const all = await borrowerMarkets()
    const candidates: BorrowerMarketRow[] = []
    const providers: Address[] = []
    for (const m of all.filter((r) => !r.isClosed && isOpenTermRow(r))) {
      const provs = await accessListProviders(m.hooks!.id)
      if (provs.length > 0) {
        candidates.push(m)
        providers.push(provs[0].providerAddress as Address)
      }
    }
    // candidates[0] is exactly what BOP-02 / LEN-16 resolve (first open, open-term, non-revolving
    // market with an access-list provider) — leave it alone and take the next one.
    len16Market = candidates[0]?.id
    fixture = candidates[1]
    providerAddr = providers[1]

    attachAgreement("LEN-34 fixture", {
      allowlistPolicyMarkets: candidates.map((m, i) => ({
        id: m.id,
        name: m.name,
        hooks: m.hooks?.id,
        provider: providers[i],
      })),
      reservedForLen16: len16Market ?? null,
      chosen: fixture
        ? { id: fixture.id, name: fixture.name, provider: providerAddr }
        : null,
    })
  })

  test("LEN-34: an expiring credential blocks new deposits while withdrawal rights survive", async ({
    page,
  }) => {
    requireFixture()
    const market = fixture!.id.toLowerCase() as Address
    const hooks = fixture!.hooks!.id as Address
    const token = fixture!.asset.address as Address
    const { decimals } = fixture!.asset
    const cycle = Number(fixture!.withdrawalBatchDuration)
    const minimumDeposit = BigInt(fixture!.hooksConfig?.minimumDeposit ?? "0")
    // Exact-minimum tenders are a scale-rounding coin flip (CONVENTIONS "Amounts"): minimum + 1.
    let deposit = minimumDeposit + parseUnits("1", decimals)
    if (deposit < parseUnits("100", decimals))
      deposit = parseUnits("100", decimals)

    expect(market, "the LEN-16 fixture is NOT the subject here").not.toBe(
      len16Market,
    )

    // ---------- re-run hygiene (CONVENTIONS "State hygiene", in that order) ----------
    faucet(LENDER, parseUnits("1", 18))
    await selfCleanWithdrawals(LENDER, market)
    if ((await unpaidBatchExpiries(market)).length > 0)
      await settleUnpaidBatches(LENDER, market, token, decimals)
    await selfCleanWithdrawals(LENDER, market)
    await syncSubgraph()
    expect(
      await unpaidBatchExpiries(market),
      "no unpaid batch left from a previous run",
    ).toEqual([])

    // ---------- arrange: install a cache window on the policy's own provider ----------
    const ttlBefore = await roleProviderTimeToLive(hooks, providerAddr!)
    expect(
      ttlBefore,
      "this generation attaches access-list providers with TTL 0 (non-cacheable pull credential)",
    ).toBe(0)
    await setRoleProviderTimeToLive(hooks, providerAddr!, CACHE_TTL)
    ttlNeedsRestore = true
    expect(
      await roleProviderTimeToLive(hooks, providerAddr!),
      "administrator installed the cache window",
    ).toBe(CACHE_TTL)
    await syncSubgraph()
    await expect
      .poll(
        async () =>
          Number((await roleProviderRow(hooks, providerAddr!))?.timeToLive),
        { timeout: 90_000 },
      )
      .toBe(CACHE_TTL)

    // ---------- arrange: membership, funds, allowance, ToU ----------
    if (await lenderBlockedFromDeposits(hooks, LENDER))
      await unblockFromDeposits(hooks, LENDER)
    if (!(await providerIsMember(providerAddr!, LENDER)))
      await addAccessListMembers(providerAddr!, [LENDER])
    await syncSubgraph()
    expect(
      await providerIsMember(providerAddr!, LENDER),
      "lender is an ACCESS_LIST member before anything is revoked",
    ).toBe(true)
    expect(
      await providerMembershipIndexed(providerAddr!, LENDER),
      "roleProviderMembers indexed",
    ).toBe(true)

    faucet(LENDER, parseUnits("1", 18))
    faucet(LENDER, deposit * 6n, token)
    await chain.approve(LENDER, token, market, deposit * 6n)

    await connectAs(page, 2)
    await ensureTouSigned(page, LENDER, market)

    // ---------- control: with a credential, the UI offers the deposit ----------
    // Run BEFORE the credential is minted so this ceremony's wall time cannot eat into the
    // cache window measured below (anvil timestamps track the wall clock, so UI time is chain
    // time). A member with no cached credential is still approved: getLenderStatus loops the
    // pull providers (BaseAccessControls.sol:500-511).
    await gotoMarket(page, market)
    await ensureConnected(page, LENDER)
    await step(page, "control: the member is offered a deposit", async () => {
      await openSection(
        page,
        /deposit & withdraw/i,
        page.getByText(/available to deposit/i),
      )
      await expect(
        page.getByRole("button", { name: /^deposit$/i }).first(),
        "an allowlisted, funded lender is offered the deposit action",
      ).toBeVisible({ timeout: 90_000 })
    })

    // ---------- arrange: the ACTIVE position (this mints the cached credential) ----------
    const beforeDepositTs = await chain.blockTimestamp()
    await chain.depositUpTo(LENDER, market, deposit)
    await syncSubgraph()
    const credential = await storedLenderStatus(hooks, LENDER)
    const mintedAt = Number(credential.lastApprovalTimestamp)
    expect(mintedAt, "the deposit minted a hooks credential").toBeGreaterThan(0)
    expect(
      mintedAt,
      "the credential is FRESH (a stale cached one would make the cache-window maths wrong)",
    ).toBeGreaterThanOrEqual(beforeDepositTs - 5)
    expect(credential.lastProvider.toLowerCase()).toBe(
      providerAddr!.toLowerCase(),
    )
    const position = await chain.marketBalance(market, LENDER)
    expect(position, "the lender holds an active position").toBeGreaterThan(0n)
    const credentialExpiresAt = mintedAt + CACHE_TTL

    // ---------- arrange AWAY every other reason a deposit could fail ----------
    const balance = await chain.erc20Balance(token, LENDER)
    const allowance = await chain.erc20Allowance(token, LENDER, market)
    const touState = (await (
      await fetch(
        `${APP_URL}/api/sla/${LENDER}?chainId=${CHAIN_ID}&party=Lender`,
      )
    ).json()) as { state: string }
    expect(balance >= deposit, "lender holds enough underlying").toBe(true)
    expect(allowance >= deposit, "market is already approved").toBe(true)
    expect(touState.state, "ToU is not the reason").toBe("signedCurrent")
    expect(await marketIsClosed(market), "closure is not the reason").toBe(false)
    expect(deposit >= minimumDeposit, "the minimum is not the reason").toBe(true)

    // ---------- act 1: revoke membership — a positive TTL DELAYS the effect ----------
    await removeAccessListMembers(providerAddr!, [LENDER])
    expect(
      await providerIsMember(providerAddr!, LENDER),
      "provider no longer vouches for the lender",
    ).toBe(false)
    const afterRemovalTs = await chain.blockTimestamp()
    expect(
      afterRemovalTs,
      "the removal lands INSIDE the cache window (otherwise the delayed-removal observation is void)",
    ).toBeLessThan(credentialExpiresAt)
    const cachedSim = await simulateDepositAccess({
      account: LENDER,
      market,
      amount: deposit,
    })
    // Checkpoint: "A positive TTL deliberately accepts delayed removal until the configured
    // cache window expires." The cached credential is still valid, so nothing is refused yet.
    expect(
      cachedSim.errorName,
      `inside the cache window a removed member is NOT yet refused for access (got: ${cachedSim.message})`,
    ).not.toBe("NotApprovedLender")
    expect(
      cachedSim.reverted,
      "and nothing else refuses it either — the deposit still simulates clean",
    ).toBe(false)

    // ---------- act 2: let the credential EXPIRE ----------
    const nowBeforeJump = await chain.blockTimestamp()
    const jumpSeconds = credentialExpiresAt + 5 - nowBeforeJump
    expect(
      jumpSeconds,
      "bounded one-way jump: never more than the cache window",
    ).toBeLessThanOrEqual(CACHE_TTL + 5)
    if (jumpSeconds > 0) await advanceTime(jumpSeconds)
    await syncSubgraph()
    const expiredAtTs = await chain.blockTimestamp()

    const deniedSim = await simulateDepositAccess({
      account: LENDER,
      market,
      amount: deposit,
    })
    expect(deniedSim.reverted, "the expired credential blocks the deposit").toBe(
      true,
    )
    expect(
      deniedSim.errorName,
      `revert reason must be the ACCESS error, got: ${deniedSim.message}`,
    ).toBe("NotApprovedLender")
    // The live view refreshes before answering; with membership gone there is nothing to refresh.
    const live = await liveLenderStatus(hooks, LENDER)
    expect(
      Number(live.lastApprovalTimestamp),
      "no provider will issue this lender a credential any more",
    ).toBe(0)
    expect(
      await lenderBlockedFromDeposits(hooks, LENDER),
      "the hook-local block is NOT the mechanism here (that is BOP-03b/BOP-05)",
    ).toBe(false)

    attachAgreement("LEN-34 credential expiry (positive TTL)", {
      market,
      name: fixture!.name,
      hooks,
      provider: providerAddr,
      lender: LENDER,
      mechanism:
        "AccessListRoleProvider.removeMembers under a positive hook TTL — delayed removal, effective at credential expiry",
      providerTtlBefore: ttlBefore,
      providerTtlDuringTest: CACHE_TTL,
      credentialMintedAt: mintedAt,
      credentialExpiresAt,
      removalAt: afterRemovalTs,
      secondsOfCacheRemainingAtRemoval: credentialExpiresAt - afterRemovalTs,
      insideWindowSimulation: cachedSim.reverted
        ? cachedSim.errorName ?? "reverted"
        : "allowed",
      chainTimeAdvanced: Math.max(jumpSeconds, 0),
      afterExpiryAt: expiredAtTs,
      afterExpirySimulation: deniedSim.errorName,
      storedCredentialAfterExpiry: Number(live.lastApprovalTimestamp),
      hookLocalBlock: false,
      underlyingBalance: balance,
      allowance,
      minimumDeposit,
      tender: deposit,
      touState: touState.state,
      citation:
        "HOOKS_ROLE_PROVIDER_CHECKPOINT_2026-08-12.md 'Cache and local policy'",
    })

    // ---------- assert: the UI withholds the deposit it offered minutes ago ----------
    // advanceTime left the page's installed clock behind the chain (CONVENTIONS "Time").
    await page.clock.setSystemTime(expiredAtTs * 1000)
    let uiGate = ""
    await gotoMarket(page, market)
    await ensureConnected(page, LENDER)
    await step(page, "the UI offers no deposit path any more", async () => {
      // Two legitimate shapes, exactly as LEN-16's non-member half documents: the lender
      // surface renders with the deposit action withheld, or the page falls back to the
      // request-access banner.
      const withdrawBlock = page
        .getByText(/available for withdraw requests/i)
        .first()
      const requestBanner = page.getByText(/lend through wildcat/i).first()
      await expect(withdrawBlock.or(requestBanner)).toBeVisible({
        timeout: 90_000,
      })
      if (await requestBanner.isVisible().catch(() => false)) {
        uiGate = "request-access banner"
      } else {
        uiGate = "deposit action withheld"
        await expect(
          page.getByRole("button", { name: /^deposit$/i }),
        ).toHaveCount(0)
      }
      // The wallet still holds underlying, so this is the access gate and not the funding gate.
      await expect(page.getByRole("button", { name: /^faucet$/i })).toHaveCount(
        0,
      )
    })

    // ---------- assert: withdrawal rights RETAINED (chain, then through the UI) ----------
    const livePosition = await chain.marketBalance(market, LENDER)
    const withdrawSim = await simulateFrom({
      account: LENDER,
      address: market,
      functionName: "queueWithdrawal",
      args: [livePosition / 2n],
    })
    expect(
      withdrawSim.reverted,
      `a known lender keeps withdrawal rights: ${withdrawSim.message ?? ""}`,
    ).toBe(false)

    await step(page, "queue the full exit through the UI", async () => {
      await expect
        .poll(async () => (await readAvailableToWithdraw(page)).raw, {
          timeout: 90_000,
        })
        .toBeGreaterThan(0n)
      await page
        .getByRole("button", { name: /^withdraw$/i })
        .first()
        .click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      // "Max · <amount>" with no wrapper, "All · <amount>" with a wrapped position
      // (WithdrawModal/components/WithdrawForm.tsx:137-151).
      await dialog
        .getByRole("button", { name: /^(max|all) ·/i })
        .first()
        .click()
      const confirm = dialog
        .getByRole("button", { name: /^withdraw .*step/i })
        .or(dialog.getByRole("button", { name: /^withdraw\s/i }))
        .first()
      await expect(confirm).toBeEnabled({ timeout: 30_000 })
      await confirm.click()
      // The refetch can unmount the modal around the success view; the durable signal is the
      // on-chain burn (CONVENTIONS "UI waits").
      await expect
        .poll(async () => chain.marketBalance(market, LENDER), {
          timeout: 120_000,
        })
        .toBe(0n)
      const back = page.getByRole("button", { name: /back to market/i })
      if (await back.isVisible().catch(() => false)) {
        const clicked = await back
          .click({ timeout: 10_000 })
          .then(() => true)
          .catch(() => false)
        if (!clicked) await page.keyboard.press("Escape")
      }
    })

    await syncSubgraph()
    const expiry = await latestWithdrawalBatchExpiry(market)
    const queueBlockTs = await chain.blockTimestamp()
    expect(
      expiry >= queueBlockTs && expiry <= queueBlockTs + cycle + 5,
      `the batch belongs to this request: expiry ${expiry} vs queue block ${queueBlockTs} + ${cycle}s cycle`,
    ).toBe(true)

    // Wait out the ordinary cycle, then claim through the UI.
    const nowBeforeCycle = await chain.blockTimestamp()
    if (nowBeforeCycle <= expiry) await advanceTime(expiry - nowBeforeCycle + 2)
    await chain.updateState(LENDER, market)
    await syncSubgraph()
    // A market nobody ever borrowed from still ACCRUES: after ~an hour of base + protocol
    // interest a full exit is worth marginally more than the assets that were deposited into it,
    // so the batch lands a hair short and the remainder joins the unpaid FIFO queue. That is a
    // solvency artefact, not an access one — top it up (anyone may repay) so the exit this case
    // is actually about can complete, and the board is left with no unpaid batch.
    const unpaidAfterCycle = await unpaidBatchExpiries(market)
    let accrualShortfall = 0n
    if (unpaidAfterCycle.length > 0) {
      const debts = await marketTotalDebts(market)
      const assets = await marketTotalAssets(market)
      accrualShortfall = debts > assets ? debts - assets : 0n
      await settleUnpaidBatches(LENDER, market, token, decimals)
      await syncSubgraph()
    }
    const claimable = await chain.getAvailableWithdrawalAmount(
      market,
      LENDER,
      expiry,
    )
    expect(
      claimable,
      "the batch is payable once the market holds the assets",
    ).toBeGreaterThan(0n)
    const assetBefore = await chain.erc20Balance(token, LENDER)
    const claimTs = await chain.blockTimestamp()
    await page.clock.setSystemTime(claimTs * 1000)

    await step(page, "claim the exit through the UI", async () => {
      await gotoMarket(page, market)
      await ensureConnected(page, LENDER)
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
    const received = (await chain.erc20Balance(token, LENDER)) - assetBefore
    expect(received, "the underlying actually arrived").toBe(claimable)
    const status = (await subgraph.lenderWithdrawalStatus(
      market,
      expiry,
      LENDER,
    ))!
    expect(status, "the exit is indexed").not.toBeNull()
    expect(
      BigInt(status.totalNormalizedRequests) -
        BigInt(status.normalizedAmountWithdrawn) <=
        20n,
      "exit dust beyond scale rounding",
    ).toBe(true)
    expect(await chain.marketBalance(market, LENDER)).toBe(0n)

    attachAgreement("LEN-34 withdrawal rights retained", {
      market,
      lender: LENDER,
      positionAtDenial: livePosition,
      queueSimulationReverted: withdrawSim.reverted,
      batchExpiry: expiry,
      cycleSeconds: cycle,
      claimed: claimable,
      received,
      uiGate,
      indexedRequests: status.totalNormalizedRequests,
      indexedWithdrawn: status.normalizedAmountWithdrawn,
      accrualToppedUp: accrualShortfall,
      note: accrualShortfall
        ? "the full exit exceeded the market's assets by the interest accrued on an unborrowed market; topped up so the exit could settle (solvency, not access)"
        : "the market was liquid enough for the full exit with no top-up",
    })

    // ---------- contrast: restore TTL 0 — the SAME removal now bites with no time travel ----
    await setRoleProviderTimeToLive(hooks, providerAddr!, 0)
    ttlNeedsRestore = false
    expect(
      await roleProviderTimeToLive(hooks, providerAddr!),
      "cache window removed — the provider is non-cacheable again",
    ).toBe(0)
    faucet(LENDER, deposit * 2n, token)
    await chain.approve(LENDER, token, market, deposit * 2n)

    await addAccessListMembers(providerAddr!, [LENDER])
    const grantTs = await chain.blockTimestamp()
    const zeroTtlGrant = await simulateDepositAccess({
      account: LENDER,
      market,
      amount: deposit,
    })
    expect(
      zeroTtlGrant.reverted,
      `zero-TTL: membership is honoured on the NEXT credential-gated call (${zeroTtlGrant.message})`,
    ).toBe(false)

    await removeAccessListMembers(providerAddr!, [LENDER])
    const revokeTs = await chain.blockTimestamp()
    const zeroTtlDeny = await simulateDepositAccess({
      account: LENDER,
      market,
      amount: deposit,
    })
    expect(zeroTtlDeny.reverted).toBe(true)
    expect(
      zeroTtlDeny.errorName,
      "zero-TTL: removal denies on the NEXT call, with no expiry to wait for",
    ).toBe("NotApprovedLender")
    expect(
      revokeTs - grantTs,
      "and that took seconds of chain time, not a cache window",
    ).toBeLessThan(CACHE_TTL)

    // Board hygiene: the fixture policy is back exactly as found — TTL 0, lender not a member.
    expect(await providerIsMember(providerAddr!, LENDER)).toBe(false)
    expect(await roleProviderTimeToLive(hooks, providerAddr!)).toBe(0)
    await syncSubgraph()

    attachAgreement("LEN-34 zero-TTL contrast (no time travel)", {
      provider: providerAddr,
      hooks,
      grantAt: grantTs,
      grantSimulation: zeroTtlGrant.reverted ? "denied" : "allowed",
      revokeAt: revokeTs,
      revokeSimulation: zeroTtlDeny.errorName,
      chainSecondsBetween: revokeTs - grantTs,
      note: "zero-TTL revalidation vs positive-TTL cache are NOT the same mechanism — checkpoint 'Cache and local policy'",
      restoredProviderTtl: await roleProviderTimeToLive(hooks, providerAddr!),
      restoredMembership: false,
    })
  })
})
