/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { formatUnits, parseUnits, zeroAddress } from "viem"

import {
  borrowableAssets,
  coverageLiquidity,
  currentState,
  delinquencyFeeBips,
  deployMarket,
  escrowAddressFor,
  escrowBalance,
  escrowCanRelease,
  isFlaggedByChainalysis,
  marketTotalSupply,
  MOCK_CHAINALYSIS,
  parameterConstraints,
  previewDeploy,
  previousState,
  queueWithdrawalAt,
  registeredTemplateNames,
  releaseEscrow,
  scaledBalanceOf,
  send,
  SENTINEL,
  sentinelAbi,
  sentinelIsSanctioned,
  setChainalysisSanction,
  simulate,
  totalAssets,
  totalDebts,
  unpaidBatchExpiries,
  type DeployedFixture,
} from "./lib"
import {
  borrower,
  ensureBorrowerRegistered,
  getCode,
  readNewMarket,
  subgraphMarket,
} from "../borrowerflows/helpers"
import { marketRow } from "../borrowerflows/lib"
import * as chain from "../lib/chain"
import {
  advanceTime,
  ANVIL_ACCOUNTS,
  faucet,
  pins,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import { attachAgreement } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * V2P — LIVE (V2/V2.1) protocol semantics on the main variant.
 *
 * The UAT runsheet was written for the V2.5 app, so `main`'s board inherits its coverage of the
 * DEPLOYED protocol rather than designing it. This file closes the gaps a protocol engineer would
 * want proven about the live deployment, reading `mono/kb/deployed-stack` as the statement of
 * intent:
 *
 *   PROTOCOL_MECHANICS.md  scaled vs normalized amounts, the collateral obligation, borrow/repay,
 *                          delinquency (isDelinquent / timeDelinquent / grace / penalty APR),
 *                          close semantics
 *   WITHDRAWALS.md         batch lifecycle, pro-rata allocation, payment PRIORITY across unpaid
 *                          expired batches, unclaimed withdrawals as a liquidity obligation
 *   HOOKS_ACCESS_AND_TERMS.md  OpenTerm vs FixedTerm, deposit access, parameter constraints
 *   SANCTIONS_AND_ESCROW.md    sentinel, nukeFromOrbit, escrow, borrower override
 *
 * Why this is chain-and-subgraph rather than UI:
 *
 *   - the app surfaces almost none of it (there is no delinquency page, no batch-priority view, no
 *     sanctions screen), so a UI-only board can only ever assert its absence;
 *   - the cases that DO have a UI (deposit, withdraw, claim, borrow, repay, close) are already
 *     covered by lenderflows/ and borrowerflows/ — this file deliberately does not duplicate them,
 *     it asserts the protocol invariants underneath;
 *   - the market-creation half is the chain-side counterpart to the wizard suite: V2P-01/02 mine
 *     the same market kinds through the SDK directly (no browser) and prove the constraint
 *     envelope the form only enforces client-side — including fixed-term, which the wizard also
 *     deploys for real (MKT-04) once the maturity is set (KNOWN-ISSUES M5 needs it undefined,
 *     reached via M8's template latch, not a fixed-term-specific gap).
 *
 * FIXTURES. Everything here runs on markets this suite deploys itself, owned by anvil #3, with a
 * run-stamped name. It never touches `pins.markets` (the lender fixtures) or `pins.borrower`'s
 * pre-fork markets, and it never reuses a market across runs — a delinquency or unpaid-batch case
 * leaves accounting state that is not worth re-deriving.
 *
 * CHAIN TIME. `evm_increaseTime` is one-way and the fork is SHARED with the v2.5 worktree, so this
 * file's total advancement is budgeted and small: ~21 minutes across the whole suite, all of it in
 * multiples of its own 180 s withdrawal cycle and 120 s grace period. It NEVER advances to a
 * fixed-term maturity (its own fixed-term fixture matures two days out and is only ever asserted
 * against, never travelled to) and it must still run AFTER the wall-clock signing suites
 * (borrowerflows/*) — see KNOWN-ISSUES H1.
 */

const stamp = Date.now().toString(36)

/** Cycle/grace on every fixture here: short enough that a full lifecycle costs minutes. */
const CYCLE = 180
const GRACE = 120
const APR_BIPS = 1000
const PENALTY_BIPS = 1000
const RESERVE_BIPS = 2000
const YEAR = 31_536_000n

const lenderA = ANVIL_ACCOUNTS[0] as Address
const lenderB = ANVIL_ACCOUNTS[1] as Address

/**
 * The account V2P-09 gets sanctioned. Deliberately NOT an anvil default: a crashed run that left a
 * flag behind would otherwise poison every other suite that uses those accounts. It holds no key
 * and is driven by impersonation, which is all a lender needs here (deposit is a transaction).
 */
const SANCTIONED = "0xe2e5000000000000000000000000000000000001" as Address

test.describe.serial("main flows: live v2 protocol (V2P-01…09)", () => {
  test.setTimeout(600_000)

  let asset: Address
  let decimals: number
  let openFixture: DeployedFixture
  let fixedFixture: DeployedFixture
  let maturedFixture: DeployedFixture
  let fifoFixture: DeployedFixture
  let closeFixture: DeployedFixture
  let nukeFixture: DeployedFixture
  let fixedTermEndTime = 0
  let maturedEndTime = 0

  /** Deposit `units` of the underlying from `account`, chain-side (anvil signs, or impersonates). */
  const deposit = async (market: Address, account: Address, units: string) => {
    const amount = parseUnits(units, decimals)
    await chain.ensureImpersonated(account)
    faucet(account, parseUnits("1", 18))
    faucet(account, amount, asset)
    await chain.approve(account, asset, market, amount)
    await chain.depositUpTo(account, market, amount)
    return amount
  }

  // -------------------------------------------------------------------------------------------
  // setup
  // -------------------------------------------------------------------------------------------

  test("setup: register the borrower, resolve the asset, deploy the run's fixtures", async () => {
    await syncChainTimeToWallClock()
    await ensureBorrowerRegistered()
    faucet(borrower, parseUnits("10", 18))

    const pinned = await subgraph.market(pins.markets.openTerm)
    expect(pinned, "pinned openTerm market on the fork subgraph").not.toBeNull()
    asset = pinned!.asset.address as Address
    decimals = pinned!.asset.decimals

    // Defensive: a crashed previous run could have left the V2P-09 subject flagged.
    if (await isFlaggedByChainalysis(SANCTIONED)) {
      await setChainalysisSanction(lenderA, SANCTIONED, false)
    }

    const now = await chain.blockTimestamp()
    fixedTermEndTime = now + 2 * 86_400

    const base = {
      assetAddress: asset,
      annualInterestBips: APR_BIPS,
      delinquencyFeeBips: PENALTY_BIPS,
      reserveRatioBips: RESERVE_BIPS,
      delinquencyGracePeriod: GRACE,
      withdrawalBatchDuration: CYCLE,
      maxTotalSupplyUnits: "1000000",
      minimumDepositUnits: "0",
    }

    openFixture = await deployMarket({
      ...base,
      namePrefix: `V2P Open ${stamp} `,
      symbolPrefix: "V2PO",
    })
    fifoFixture = await deployMarket({
      ...base,
      namePrefix: `V2P Fifo ${stamp} `,
      symbolPrefix: "V2PF",
    })
    closeFixture = await deployMarket({
      ...base,
      namePrefix: `V2P Close ${stamp} `,
      symbolPrefix: "V2PC",
    })
    nukeFixture = await deployMarket({
      ...base,
      namePrefix: `V2P Nuke ${stamp} `,
      symbolPrefix: "V2PN",
    })
    fixedFixture = await deployMarket({
      ...base,
      namePrefix: `V2P Fixed ${stamp} `,
      symbolPrefix: "V2PX",
      template: "FixedTermHooks",
      fixedTermEndTime,
      allowClosureBeforeTerm: true,
      allowTermReduction: true,
    })
    // Deliberately computed HERE, not at the top of the setup. `FixedTermHooks` rejects a maturity
    // already in the past (`InvalidFixedTerm`, selector 0x90b0b2c3), and the five deploys above
    // each wait for the fork subgraph to index — seconds standalone, minutes under a full board.
    // A 120 s headroom taken before them expired in transit; taking it here, with 300 s, keeps the
    // V2P-03 jump small AND survives a slow indexer.
    maturedEndTime = (await chain.blockTimestamp()) + 300
    maturedFixture = await deployMarket({
      ...base,
      namePrefix: `V2P Matured ${stamp} `,
      symbolPrefix: "V2PM",
      template: "FixedTermHooks",
      fixedTermEndTime: maturedEndTime,
      allowClosureBeforeTerm: true,
      allowTermReduction: true,
    })

    attachAgreement("V2P fixtures", {
      borrower,
      asset,
      decimals,
      cycleSeconds: CYCLE,
      graceSeconds: GRACE,
      openTerm: openFixture.market,
      fifo: fifoFixture.market,
      close: closeFixture.market,
      nuke: nukeFixture.market,
      fixedTerm: { market: fixedFixture.market, fixedTermEndTime },
      shortFixedTerm: { market: maturedFixture.market, maturedEndTime },
    })
  })

  // -------------------------------------------------------------------------------------------
  // market creation at protocol level (the chain-side half of MKT-01…08)
  // -------------------------------------------------------------------------------------------

  test("V2P-01: both live market kinds deploy, register and index with the terms they were given", async () => {
    // The wizard covers both arms end-to-end through the UI (OpenTerm: MKT-01/03; FixedTerm:
    // MKT-04). This mines the same SDK call the wizard makes directly, with no browser, as the
    // chain-side counterpart — independent proof that the deploy, registration and indexing are
    // correct at the protocol level.
    for (const [label, fixture, kind] of [
      ["openTerm", openFixture, "OpenTerm"],
      ["fixedTerm", fixedFixture, "FixedTerm"],
    ] as const) {
      const code = await getCode(fixture.market)
      expect(code && code !== "0x", `${label}: market has code`).toBe(true)

      const onChain = await readNewMarket(fixture.market)
      expect(onChain.borrower.toLowerCase(), `${label}: borrower`).toBe(
        borrower.toLowerCase(),
      )
      expect(onChain.annualInterestBips, `${label}: APR`).toBe(BigInt(APR_BIPS))
      expect(onChain.delinquencyFeeBips, `${label}: penalty APR`).toBe(
        BigInt(PENALTY_BIPS),
      )
      expect(onChain.reserveRatioBips, `${label}: reserve ratio`).toBe(
        BigInt(RESERVE_BIPS),
      )
      expect(onChain.delinquencyGracePeriod, `${label}: grace`).toBe(
        BigInt(GRACE),
      )
      expect(onChain.withdrawalBatchDuration, `${label}: cycle`).toBe(
        BigInt(CYCLE),
      )
      expect(onChain.asset.toLowerCase(), `${label}: underlying`).toBe(
        asset.toLowerCase(),
      )

      const row = await subgraphMarket(fixture.market)
      expect(row, `${label}: indexed by the fork subgraph`).not.toBeNull()
      expect(row!.hooks?.kind, `${label}: hook kind`).toBe(kind)
      expect(Number(row!.annualInterestBips)).toBe(APR_BIPS)
      expect(Number(row!.reserveRatioBips)).toBe(RESERVE_BIPS)
      expect(Number(row!.delinquencyGracePeriod)).toBe(GRACE)
      expect(Number(row!.withdrawalBatchDuration)).toBe(CYCLE)
    }

    // Term parameters survive the round trip only on the fixed-term arm.
    const fixedRow = (await subgraphMarket(fixedFixture.market))!
    expect(Number(fixedRow.hooksConfig?.fixedTermEndTime)).toBe(
      fixedTermEndTime,
    )
    expect(fixedRow.hooksConfig?.allowClosureBeforeTerm).toBe(true)
    expect(fixedRow.hooksConfig?.allowTermReduction).toBe(true)
    const openRow = (await subgraphMarket(openFixture.market))!
    expect(
      Number(openRow.hooksConfig?.fixedTermEndTime ?? 0),
      "an open-term market carries no maturity",
    ).toBe(0)

    // Third kind, documented rather than covered: PeriodicTerm templates ARE registered on this
    // deployment, but `main`'s app filters periodic markets out of every list
    // (utils/marketType.ts#isFrontendVisibleMarket — KNOWN-ISSUES M4) and its SDK ships no
    // periodic UI, so there is no app behavior to assert. See lenderflows/fixed-term.spec.ts and
    // zz-final-phase/fixed-term-maturity.spec.ts.
    const templates = await registeredTemplateNames()
    expect(templates, "OpenTerm template registered").toContain("OpenTermHooks")
    expect(templates, "FixedTerm template registered").toContain(
      "FixedTermHooks",
    )
    attachAgreement("V2P-01 market kinds", {
      registeredTemplates: templates,
      periodicTemplatesPresent: templates.filter((t) => /Periodic/.test(t))
        .length,
      note:
        "PeriodicTerm hooks templates exist on the deployment but main hides periodic markets " +
        "(M4) and has no periodic UI — protocol-present, app-absent.",
    })
  })

  test("V2P-02: the hooks instance refuses market parameters outside its own constraint envelope", async () => {
    // MKT-08 proves the FORM will not let you type them. This proves the protocol would not
    // accept them either — the two are independent, and only the second is a safety property.
    expect(
      openFixture.hooks,
      "the fixture's hooks instance was indexed (constraints are read from it)",
    ).toMatch(/^0x[0-9a-f]{40}$/)
    const constraints = await parameterConstraints(openFixture.hooks as Address)
    const base = {
      assetAddress: asset,
      namePrefix: `V2P Bad ${stamp} `,
      symbolPrefix: "V2PB",
      annualInterestBips: APR_BIPS,
      delinquencyFeeBips: PENALTY_BIPS,
      reserveRatioBips: RESERVE_BIPS,
      delinquencyGracePeriod: GRACE,
      withdrawalBatchDuration: CYCLE,
    }

    const cases: { name: string; override: Record<string, number> }[] = [
      {
        name: "annualInterestBips above the maximum",
        override: {
          annualInterestBips: constraints.maximumAnnualInterestBips + 1,
        },
      },
      {
        name: "reserveRatioBips above the maximum",
        override: {
          reserveRatioBips: constraints.maximumReserveRatioBips + 1,
        },
      },
      {
        name: "delinquencyFeeBips above the maximum",
        override: {
          delinquencyFeeBips: constraints.maximumDelinquencyFeeBips + 1,
        },
      },
      {
        name: "delinquencyGracePeriod above the maximum",
        override: {
          delinquencyGracePeriod: constraints.maximumDelinquencyGracePeriod + 1,
        },
      },
      {
        name: "withdrawalBatchDuration above the maximum",
        override: {
          withdrawalBatchDuration:
            constraints.maximumWithdrawalBatchDuration + 1,
        },
      },
    ]

    const results: Record<string, unknown> = {}
    for (const { name, override } of cases) {
      const outcome = await previewDeploy({ ...base, ...override })
      results[name] = outcome
      expect(
        outcome.outcome,
        `${name}: must not be deployable (${outcome.detail})`,
      ).not.toBe("ready")
    }

    // Control: the same shape, in range, IS deployable — so the refusals above are the
    // constraint and not a broken preview.
    const control = await previewDeploy(base)
    expect(control.outcome, `in-range control (${control.detail})`).toBe(
      "ready",
    )

    attachAgreement("V2P-02 parameter constraints", {
      constraints,
      refusals: results,
      control,
    })
  })

  // -------------------------------------------------------------------------------------------
  // market kinds: what the term actually does
  // -------------------------------------------------------------------------------------------

  test("V2P-03: FixedTerm blocks withdrawal requests until maturity; OpenTerm never does", async () => {
    await deposit(fixedFixture.market, lenderA, "1000")
    await deposit(maturedFixture.market, lenderA, "1000")
    await deposit(openFixture.market, lenderA, "10000")

    const amount = parseUnits("100", decimals)

    const beforeMaturity = await simulate({
      account: lenderA,
      address: fixedFixture.market,
      functionName: "queueWithdrawal",
      args: [amount],
    })
    expect(
      beforeMaturity.reverted,
      "a fixed-term market refuses withdrawal requests before maturity",
    ).toBe(true)

    const openTerm = await simulate({
      account: lenderA,
      address: openFixture.market,
      functionName: "queueWithdrawal",
      args: [amount],
    })
    expect(
      openTerm.reverted,
      "an open-term market accepts a withdrawal request at any time",
    ).toBe(false)

    // The other arm, with the smallest jump that can prove it: the second fixed-term fixture
    // matured 120 s after deployment. Nothing here ever travels to the two-day fixture.
    const now = await chain.blockTimestamp()
    if (now <= maturedEndTime) await advanceTime(maturedEndTime - now + 10)
    const afterMaturity = await simulate({
      account: lenderA,
      address: maturedFixture.market,
      functionName: "queueWithdrawal",
      args: [amount],
    })
    expect(
      afterMaturity.reverted,
      `a matured fixed-term market accepts withdrawal requests (${afterMaturity.message})`,
    ).toBe(false)

    attachAgreement("V2P-03 term gating", {
      fixedTermEndTime,
      maturedEndTime,
      chainNow: await chain.blockTimestamp(),
      beforeMaturity,
      afterMaturity,
      openTerm,
    })
  })

  // -------------------------------------------------------------------------------------------
  // deposits
  // -------------------------------------------------------------------------------------------

  test("V2P-04: deposit semantics — 1:1 mint, capacity clamp, exact-amount refusal, access gate", async () => {
    const { market } = openFixture
    const before = await chain.marketBalance(market, lenderB)
    const scaledBefore = await scaledBalanceOf(market, lenderB)
    const amount = await deposit(market, lenderB, "1000")
    const minted = (await chain.marketBalance(market, lenderB)) - before
    const scaledMinted = (await scaledBalanceOf(market, lenderB)) - scaledBefore

    // PROTOCOL_MECHANICS, "Scaled And Normalized Amounts": the deposit mints ~1:1 in NORMALIZED
    // units, and the scaled credit is that amount divided by the scale factor.
    //
    // The invariant asserted is the round trip — scaled × scaleFactor back to normalized equals
    // what was deposited — not the direction of the last wei. A first pass here claimed the scaled
    // credit rounds DOWN and failed by exactly 1 wei (got …790, ceiling …789): the ceiling is
    // computed from the scale factor read AFTER the deposit mined, which has already grown, so
    // that comparison measures the read gap and not the protocol's rounding. Per the same KB page,
    // "Rounding dust exists by design. Do not turn dust-only observations into material bugs."
    expect(
      minted >= amount - 10n,
      "deposit mints ~1:1 in normalized units",
    ).toBe(true)
    const state = await currentState(market)
    const RAY = 10n ** 27n
    const scaledExpected = (amount * RAY) / state.scaleFactor
    const scaledDrift =
      scaledMinted > scaledExpected
        ? scaledMinted - scaledExpected
        : scaledExpected - scaledMinted
    expect(
      scaledDrift <= 10n,
      `scaled credit is the deposit over the scale factor: got ${scaledMinted}, expected ~${scaledExpected}`,
    ).toBe(true)
    const renormalized = (scaledMinted * state.scaleFactor) / RAY
    const renormalizedDrift =
      renormalized > amount ? renormalized - amount : amount - renormalized
    expect(
      renormalizedDrift <= 10n,
      `scaled credit renormalizes back to the deposit: ${renormalized} vs ${amount}`,
    ).toBe(true)

    // Capacity clamp. `depositUpTo` self-caps at the remaining capacity; the exact-amount
    // `deposit` refuses instead. Both are documented behavior and the app relies on the first.
    const totalNow = await marketTotalSupply(market)
    expect(totalNow > 0n, "market holds deposits").toBe(true)
    const headroom = parseUnits("500", decimals)
    await send(borrower, market, "setMaxTotalSupply", [totalNow + headroom])

    const oversized = headroom * 3n
    faucet(lenderB, oversized, asset)
    await chain.approve(lenderB, asset, market, oversized)
    const clampBefore = await chain.marketBalance(market, lenderB)
    await chain.depositUpTo(lenderB, market, oversized)
    const clamped = (await chain.marketBalance(market, lenderB)) - clampBefore
    expect(
      clamped < oversized && clamped >= headroom - parseUnits("1", decimals),
      `depositUpTo clamped to the remaining capacity: minted ${clamped}, headroom ${headroom}`,
    ).toBe(true)

    const exact = await simulate({
      account: lenderB,
      address: market,
      functionName: "deposit",
      args: [oversized],
    })
    expect(
      exact.reverted,
      "the exact-amount deposit() refuses to overshoot capacity rather than clamping",
    ).toBe(true)

    // Restore the fixture's capacity for the suites that follow.
    await send(borrower, market, "setMaxTotalSupply", [
      parseUnits("1000000", decimals),
    ])

    // Access gate: a market whose policy carries no open-access provider refuses an unknown
    // lender. Deployed here rather than reused so nothing else depends on its access shape.
    const gated = await deployMarket({
      assetAddress: asset,
      namePrefix: `V2P Gated ${stamp} `,
      symbolPrefix: "V2PG",
      annualInterestBips: APR_BIPS,
      delinquencyFeeBips: PENALTY_BIPS,
      reserveRatioBips: RESERVE_BIPS,
      delinquencyGracePeriod: GRACE,
      withdrawalBatchDuration: CYCLE,
      requireDepositAccess: true,
      openAccess: false,
    })
    const gatedAmount = parseUnits("100", decimals)
    faucet(lenderB, gatedAmount, asset)
    await chain.approve(lenderB, asset, gated.market, gatedAmount)
    const gatedDeposit = await simulate({
      account: lenderB,
      address: gated.market,
      functionName: "depositUpTo",
      args: [gatedAmount],
    })
    expect(
      gatedDeposit.reverted,
      "an uncredentialed deposit into an access-gated market reverts",
    ).toBe(true)

    // Minimum deposit is enforced by the hook, not the market: prove it on its own market.
    const withMinimum = await deployMarket({
      assetAddress: asset,
      namePrefix: `V2P MinDep ${stamp} `,
      symbolPrefix: "V2PD",
      annualInterestBips: APR_BIPS,
      delinquencyFeeBips: PENALTY_BIPS,
      reserveRatioBips: RESERVE_BIPS,
      delinquencyGracePeriod: GRACE,
      withdrawalBatchDuration: CYCLE,
      minimumDepositUnits: "500",
    })
    const below = parseUnits("499", decimals)
    faucet(lenderB, below, asset)
    await chain.approve(lenderB, asset, withMinimum.market, below)
    const belowMinimum = await simulate({
      account: lenderB,
      address: withMinimum.market,
      functionName: "depositUpTo",
      args: [below],
    })
    expect(
      belowMinimum.reverted,
      "a deposit below the market minimum reverts",
    ).toBe(true)

    attachAgreement("V2P-04 deposits", {
      minted,
      scaledMinted,
      scaledCeiling: scaledExpected,
      capacityHeadroom: headroom,
      clampedMint: clamped,
      exactDeposit: exact,
      gatedMarket: gated.market,
      gatedDeposit,
      minimumDepositMarket: withMinimum.market,
      belowMinimum,
    })
  })

  // -------------------------------------------------------------------------------------------
  // delinquency
  // -------------------------------------------------------------------------------------------

  test("V2P-05: delinquency, the grace period and the penalty APR", async () => {
    const { market } = openFixture

    // Borrow everything the reserve requirement allows, then queue a request the remaining
    // liquidity cannot cover — the shortest deterministic route into delinquency.
    // Leave a wei-scale cushion: `borrowableAssets()` is read one block before the borrow mines
    // and the obligation grows with interest in between, so borrowing the exact figure can tip
    // the market delinquent by dust and make the control assertion below flaky.
    const cushion = parseUnits("1", decimals)
    const borrowable = (await borrowableAssets(market)) - cushion
    expect(borrowable > 0n, "market has borrowable liquidity").toBe(true)
    await send(borrower, market, "borrow", [borrowable])
    await syncSubgraph()
    expect(
      (await currentState(market)).isDelinquent,
      "borrowing only up to the reserve requirement is not delinquency",
    ).toBe(false)

    const position = await chain.marketBalance(market, lenderA)
    await chain.queueWithdrawal(lenderA, market, position / 2n)
    const delinquent = await currentState(market)
    expect(
      delinquent.isDelinquent,
      "a pending withdrawal the reserves cannot cover puts the market in delinquency",
    ).toBe(true)

    // Write the state so the subgraph sees it too.
    await send(lenderA, market, "updateState")
    await syncSubgraph()
    const rowDelinquent = (await marketRow(market))!
    expect(rowDelinquent.isDelinquent, "subgraph agrees on delinquency").toBe(
      true,
    )
    expect(
      rowDelinquent.isIncurringPenalties,
      "inside the grace period there is no penalty yet",
    ).toBe(false)

    // Now cross the grace period and hold there. Over a window that starts at
    // timeDelinquent = 0, the penalty applies for (elapsed - grace) seconds while the base rate
    // applies for all of it (FeeMath.updateTimeDelinquentAndGetPenaltyTime).
    const s0 = (await currentState(market)).scaleFactor
    const t0 = await chain.blockTimestamp()
    const WINDOW = 300
    await advanceTime(GRACE + WINDOW)
    await send(lenderA, market, "updateState")
    const after = await currentState(market)
    const t1 = await chain.blockTimestamp()
    const elapsed = BigInt(t1 - t0)
    const penaltySeconds = elapsed - BigInt(GRACE)

    const penalty = await delinquencyFeeBips(market)
    const RAY = 10n ** 27n
    const growth = ((after.scaleFactor - s0) * RAY) / s0
    const baseOnly = (BigInt(APR_BIPS) * elapsed * RAY) / (10_000n * YEAR)
    const withPenalty =
      baseOnly + (penalty * penaltySeconds * RAY) / (10_000n * YEAR)

    expect(
      growth > baseOnly,
      `scale factor grew faster than the base APR alone: ${growth} vs ${baseOnly}`,
    ).toBe(true)
    const drift =
      growth > withPenalty ? growth - withPenalty : withPenalty - growth
    expect(
      drift <= withPenalty / 10n + 1n,
      `accrual matches base + penalty within 10%: got ${growth}, expected ~${withPenalty}`,
    ).toBe(true)
    expect(
      after.timeDelinquent >= GRACE + WINDOW - 5,
      `timeDelinquent accumulated: ${after.timeDelinquent}`,
    ).toBe(true)

    await syncSubgraph()
    const rowPenalised = (await marketRow(market))!
    expect(
      rowPenalised.isIncurringPenalties,
      "past the grace period the market is incurring penalties",
    ).toBe(true)

    // Cure. Anyone may repay (PROTOCOL_MECHANICS), and repaying enough to satisfy the obligation
    // clears delinquency; timeDelinquent then unwinds instead of accumulating.
    const shortfall =
      (await coverageLiquidity(market)) - (await totalAssets(market))
    // `shortfall` breaks even exactly, so the buffer is what makes the market HEALTHY rather than
    // merely level: interest keeps accruing while the repay mines, and the protocol fee is part of
    // the obligation too.
    const repayAmount = shortfall + parseUnits("200", decimals)
    faucet(borrower, repayAmount, asset)
    await chain.approve(borrower, asset, market, repayAmount)
    await send(borrower, market, "repayAndProcessUnpaidWithdrawalBatches", [
      repayAmount,
      5n,
    ])
    const cured = await currentState(market)
    expect(cured.isDelinquent, "repayment cures the delinquency").toBe(false)

    const beforeUnwind = cured.timeDelinquent
    await advanceTime(120)
    await send(lenderA, market, "updateState")
    const unwound = await currentState(market)
    expect(
      unwound.timeDelinquent < beforeUnwind,
      `timeDelinquent unwinds while healthy: ${beforeUnwind} -> ${unwound.timeDelinquent}`,
    ).toBe(true)

    await syncSubgraph()
    attachAgreement("V2P-05 delinquency", {
      borrowed: borrowable,
      elapsedSeconds: elapsed,
      penaltySeconds,
      scaleFactorGrowthRay: growth,
      baseOnlyRay: baseOnly,
      basePlusPenaltyRay: withPenalty,
      timeDelinquentAtPenalty: after.timeDelinquent,
      timeDelinquentAfterUnwind: unwound.timeDelinquent,
      repaid: repayAmount,
    })
  })

  // -------------------------------------------------------------------------------------------
  // withdrawal batching + execution
  // -------------------------------------------------------------------------------------------

  let fifoExpiryA = 0
  let fifoExpiryB = 0

  test("V2P-06: two expired unpaid batches are paid in FIFO order, never out of turn", async () => {
    // WITHDRAWALS.md: "Payment priority matters. Later batches should not jump ahead of earlier
    // unpaid expired batches." LEN-22 proves the pro-rata split INSIDE one batch and that a
    // shortfall joins the unpaid queue; nothing on the board has ever put TWO batches in that
    // queue, which is the only way to observe the ordering rule at all.
    const { market } = fifoFixture
    await deposit(market, lenderA, "6000")
    await deposit(market, lenderB, "4000")
    const borrowable =
      (await borrowableAssets(market)) - parseUnits("1", decimals)
    await send(borrower, market, "borrow", [borrowable])

    fifoExpiryA = await queueWithdrawalAt(
      lenderA,
      market,
      await chain.marketBalance(market, lenderA),
    )
    let now = await chain.blockTimestamp()
    if (now <= fifoExpiryA) await advanceTime(fifoExpiryA - now + 5)
    await send(lenderA, market, "updateState")

    fifoExpiryB = await queueWithdrawalAt(
      lenderB,
      market,
      await chain.marketBalance(market, lenderB),
    )
    expect(
      fifoExpiryB > fifoExpiryA,
      "the second request opened a NEW batch (the first had already expired)",
    ).toBe(true)
    now = await chain.blockTimestamp()
    if (now <= fifoExpiryB) await advanceTime(fifoExpiryB - now + 5)
    await send(lenderB, market, "updateState")
    await syncSubgraph()

    const queued = await unpaidBatchExpiries(market)
    expect(
      queued,
      "both batches are in the unpaid queue, oldest first",
    ).toEqual([fifoExpiryA, fifoExpiryB])

    const batchA0 = await chain.getWithdrawalBatch(market, fifoExpiryA)
    const batchB0 = await chain.getWithdrawalBatch(market, fifoExpiryB)
    expect(
      batchA0.scaledAmountBurned < batchA0.scaledTotalAmount,
      "batch A is only partially paid",
    ).toBe(true)
    expect(
      batchB0.scaledAmountBurned < batchB0.scaledTotalAmount,
      "batch B is unpaid too (the market has no liquidity left for it)",
    ).toBe(true)

    // Repay enough to finish A plus a deliberately small residue. If priority were broken the
    // residue would be spread over both; FIFO means A is completed first and B gets the rest.
    const state = await currentState(market)
    const owedA =
      ((batchA0.scaledTotalAmount - batchA0.scaledAmountBurned) *
        state.scaleFactor) /
      10n ** 27n
    const residue = parseUnits("25", decimals)
    const repayAmount = owedA + residue + parseUnits("2", decimals)
    faucet(borrower, repayAmount, asset)
    await chain.approve(borrower, asset, market, repayAmount)
    await send(borrower, market, "repayAndProcessUnpaidWithdrawalBatches", [
      repayAmount,
      5n,
    ])
    await syncSubgraph()

    const batchA1 = await chain.getWithdrawalBatch(market, fifoExpiryA)
    const batchB1 = await chain.getWithdrawalBatch(market, fifoExpiryB)
    expect(
      batchA1.scaledAmountBurned,
      "the OLDER batch was completed first",
    ).toBe(batchA1.scaledTotalAmount)
    expect(
      batchB1.scaledAmountBurned < batchB1.scaledTotalAmount,
      "the younger batch got only what was left over",
    ).toBe(true)
    expect(
      batchB1.normalizedAmountPaid > 0n &&
        batchB1.normalizedAmountPaid <= repayAmount - owedA + 10n,
      `younger batch received the residue only: ${batchB1.normalizedAmountPaid}`,
    ).toBe(true)
    expect(
      await unpaidBatchExpiries(market),
      "only the younger batch is still queued",
    ).toEqual([fifoExpiryB])

    // Drain the rest so V2P-07 can settle both. Same reasoning as V2P-05's cure buffer: the exact
    // deficit only breaks even, and interest keeps moving while the repay mines.
    const remaining =
      (await totalDebts(market)) -
      (await totalAssets(market)) +
      parseUnits("200", decimals)
    faucet(borrower, remaining, asset)
    await chain.approve(borrower, asset, market, remaining)
    await send(borrower, market, "repayAndProcessUnpaidWithdrawalBatches", [
      remaining,
      5n,
    ])
    expect(
      await unpaidBatchExpiries(market),
      "the unpaid queue drained once the debt was covered",
    ).toEqual([])
    await syncSubgraph()

    attachAgreement("V2P-06 FIFO priority", {
      expiries: [fifoExpiryA, fifoExpiryB],
      owedOnOlderBatch: owedA,
      repaid: repayAmount,
      olderBatchAfter: batchA1,
      youngerBatchAfter: batchB1,
    })
  })

  test("V2P-07: unclaimed paid withdrawals stay a liquidity obligation; executeWithdrawals settles both batches at once", async () => {
    const { market } = fifoFixture
    const claimableA = await chain.getAvailableWithdrawalAmount(
      market,
      lenderA,
      fifoExpiryA,
    )
    const claimableB = await chain.getAvailableWithdrawalAmount(
      market,
      lenderB,
      fifoExpiryB,
    )
    expect(
      claimableA > 0n && claimableB > 0n,
      "both lenders have a claim",
    ).toBe(true)

    // WITHDRAWALS.md: "Unclaimed paid withdrawals are part of the market's liquidity obligation."
    const state = await currentState(market)
    const unclaimed = state.normalizedUnclaimedWithdrawals
    const sum = claimableA + claimableB
    expect(
      unclaimed >= sum - 10n,
      `market still owes both claims: unclaimed ${unclaimed} vs ${sum}`,
    ).toBe(true)
    const coverage = await coverageLiquidity(market)
    expect(
      coverage >= unclaimed,
      `the collateral obligation includes the unclaimed amount: ${coverage} >= ${unclaimed}`,
    ).toBe(true)
    const borrowableWhileOwed = await borrowableAssets(market)

    // One transaction, two batches, two lenders.
    const tokenA0 = await chain.erc20Balance(asset, lenderA)
    const tokenB0 = await chain.erc20Balance(asset, lenderB)
    await send(lenderA, market, "executeWithdrawals", [
      [lenderA, lenderB],
      [fifoExpiryA, fifoExpiryB],
    ])
    expect(
      (await chain.erc20Balance(asset, lenderA)) - tokenA0,
      "lender A was paid their claim",
    ).toBe(claimableA)
    expect(
      (await chain.erc20Balance(asset, lenderB)) - tokenB0,
      "lender B was paid their claim",
    ).toBe(claimableB)

    const settled = await currentState(market)
    expect(
      settled.normalizedUnclaimedWithdrawals <= 10n,
      `the obligation is gone once claimed: ${settled.normalizedUnclaimedWithdrawals}`,
    ).toBe(true)

    await syncSubgraph()
    const statusA = await subgraph.lenderWithdrawalStatus(
      market,
      fifoExpiryA,
      lenderA,
    )
    const statusB = await subgraph.lenderWithdrawalStatus(
      market,
      fifoExpiryB,
      lenderB,
    )
    expect(statusA?.isCompleted, "subgraph marks A's withdrawal complete").toBe(
      true,
    )
    expect(statusB?.isCompleted, "subgraph marks B's withdrawal complete").toBe(
      true,
    )

    attachAgreement("V2P-07 unclaimed obligation + batched execution", {
      claimableA,
      claimableB,
      unclaimedBefore: unclaimed,
      coverageLiquidityBefore: coverage,
      borrowableWhileOwed,
      unclaimedAfter: settled.normalizedUnclaimedWithdrawals,
    })
  })

  // -------------------------------------------------------------------------------------------
  // close
  // -------------------------------------------------------------------------------------------

  test("V2P-08: closing a market zeroes the APR, locks deposits and lets the last lender exit immediately", async () => {
    // The LEN-20 shape (exit from a terminated market) with the protocol invariants attached:
    // BOP-23/25 drive the borrower's close UI, but nothing asserts what close does to the market.
    const { market } = closeFixture
    await deposit(market, lenderA, "1000")
    const borrowable =
      (await borrowableAssets(market)) - parseUnits("1", decimals)
    await send(borrower, market, "borrow", [borrowable])

    const debt = await totalDebts(market)
    const held = await totalAssets(market)
    const owed = debt > held ? debt - held : 0n
    const funding = owed + parseUnits("50", decimals)
    faucet(borrower, funding, asset)
    await chain.approve(borrower, asset, market, funding)
    await send(borrower, market, "closeMarket")
    await syncSubgraph()

    const closed = await currentState(market)
    expect(closed.isClosed, "market is closed").toBe(true)
    expect(closed.annualInterestBips, "close zeroes the lender APR").toBe(0)
    expect(
      closed.reserveRatioBips,
      "close pins the reserve ratio at 100%",
    ).toBe(10_000)
    expect(
      closed.timeDelinquent,
      "close resets the delinquency tracker (else the last lender could not redeem)",
    ).toBe(0)
    const row = (await marketRow(market))!
    expect(row.isClosed, "subgraph agrees the market is closed").toBe(true)

    const depositAfterClose = await simulate({
      account: lenderB,
      address: market,
      functionName: "depositUpTo",
      args: [parseUnits("10", decimals)],
    })
    expect(
      depositAfterClose.reverted,
      "a closed market accepts no further deposits",
    ).toBe(true)

    // A closed market queues with a ZERO batch duration, so the exit is immediate rather than
    // waiting out a cycle — the property the terminated-market exit depends on.
    const balance = await chain.marketBalance(market, lenderA)
    expect(balance > 0n, "the lender still holds a position at close").toBe(
      true,
    )
    const simulatedExpiry = await chain.queueWithdrawal(
      lenderA,
      market,
      balance,
    )
    // `chain.queueWithdrawal` returns the SIMULATED expiry — computed against the block before the
    // tx mines. On an open market with a 180 s cycle that one-second offset is invisible; on a
    // CLOSED market the batch duration is zero, so the expiry IS the mining timestamp and the
    // simulated value points at a batch that does not exist (measured: getAvailableWithdrawalAmount
    // reverting `MulDivFailed`, i.e. dividing by an empty batch's scaledTotalAmount). The written
    // state is authoritative — `previousState()` is exactly what the queue tx stored.
    const expiry = (await previousState(market)).pendingWithdrawalExpiry
    const queuedAt = await chain.blockTimestamp()
    expect(
      expiry > 0 && expiry <= queuedAt,
      `closed-market batch expires immediately: expiry ${expiry} vs now ${queuedAt} ` +
        `(simulation said ${simulatedExpiry})`,
    ).toBe(true)

    await advanceTime(2)
    const before = await chain.erc20Balance(asset, lenderA)
    const claimable = await chain.getAvailableWithdrawalAmount(
      market,
      lenderA,
      expiry,
    )
    expect(claimable > 0n, "the exit is fully funded by the close").toBe(true)
    await chain.executeWithdrawal(lenderA, market, lenderA, expiry)
    expect(
      (await chain.erc20Balance(asset, lenderA)) - before,
      "the lender was paid out in full",
    ).toBe(claimable)
    expect(
      await chain.marketBalance(market, lenderA),
      "the lender has left the market",
    ).toBe(0n)

    await syncSubgraph()
    attachAgreement("V2P-08 close semantics", {
      market,
      borrowerFunding: funding,
      closedState: {
        annualInterestBips: closed.annualInterestBips,
        reserveRatioBips: closed.reserveRatioBips,
        timeDelinquent: closed.timeDelinquent,
      },
      depositAfterClose,
      exitExpiry: expiry,
      exitPaid: claimable,
    })
  })

  // -------------------------------------------------------------------------------------------
  // sanctions and escrow
  // -------------------------------------------------------------------------------------------

  test("V2P-09: a sanctioned lender is nuked into escrow, and only an un-sanction releases it", async () => {
    // SANCTIONS_AND_ESCROW.md has no coverage anywhere on either board. It is testable here ONLY
    // because Sepolia's sanctions oracle is a permissionless `MockChainalysis`
    // (deployments/sepolia/deployments.json) whose `sanction(address)` anyone can call; on
    // mainnet the sentinel reads the real Chainalysis list and this path is untestable.
    const { market } = nukeFixture
    await chain.ensureImpersonated(SANCTIONED)
    await deposit(market, SANCTIONED, "500")
    const position = await chain.marketBalance(market, SANCTIONED)
    expect(
      position > 0n,
      "the subject holds a position before being flagged",
    ).toBe(true)

    expect(
      await sentinelIsSanctioned(borrower, SANCTIONED),
      "not sanctioned to begin with",
    ).toBe(false)
    const beforeFlag = await simulate({
      account: lenderA,
      address: market,
      functionName: "nukeFromOrbit",
      args: [SANCTIONED],
    })
    expect(
      beforeFlag.reverted,
      "nukeFromOrbit refuses an account that is not sanctioned",
    ).toBe(true)

    await setChainalysisSanction(lenderA, SANCTIONED, true)
    expect(
      await sentinelIsSanctioned(borrower, SANCTIONED),
      "the sentinel reports the flag for this borrower",
    ).toBe(true)

    // Borrower override: the sentinel is borrower-SCOPED, so an override clears it for this
    // borrower only. Exercised and then removed so the rest of the case sees the flag.
    await send(
      borrower,
      SENTINEL,
      "overrideSanction",
      [SANCTIONED],
      sentinelAbi,
    )
    expect(
      await sentinelIsSanctioned(borrower, SANCTIONED),
      "a borrower override lifts the sanction for that borrower's markets",
    ).toBe(false)
    await send(
      borrower,
      SENTINEL,
      "removeSanctionOverride",
      [SANCTIONED],
      sentinelAbi,
    )
    expect(
      await sentinelIsSanctioned(borrower, SANCTIONED),
      "removing the override restores the sanction",
    ).toBe(true)

    // nukeFromOrbit is permissionless once the flag is set: it queues the account's whole
    // position through the ORDINARY withdrawal path (so term restrictions still apply).
    await send(lenderA, market, "nukeFromOrbit", [SANCTIONED])
    expect(
      await chain.marketBalance(market, SANCTIONED),
      "the sanctioned account's balance was queued out",
    ).toBe(0n)
    // The batch the nuke created, read from the state that tx wrote (see V2P-08 on why the
    // simulated expiry a queue helper returns is not safe to key a batch lookup on).
    const expiry = (await previousState(market)).pendingWithdrawalExpiry
    expect(
      expiry,
      "a batch was created for the quarantined position",
    ).toBeGreaterThan(0)

    const now = await chain.blockTimestamp()
    if (now <= expiry) await advanceTime(expiry - now + 5)
    await send(lenderA, market, "updateState")
    await syncSubgraph()

    const escrow = await escrowAddressFor(borrower, SANCTIONED, asset)
    expect(escrow, "sentinel derives an escrow address").not.toBe(zeroAddress)
    const lenderTokensBefore = await chain.erc20Balance(asset, SANCTIONED)
    const claimable = await chain.getAvailableWithdrawalAmount(
      market,
      SANCTIONED,
      expiry,
    )
    expect(claimable > 0n, "the quarantined batch was paid").toBe(true)
    await chain.executeWithdrawal(lenderA, market, SANCTIONED, expiry)

    expect(
      await chain.erc20Balance(asset, SANCTIONED),
      "the sanctioned account received NOTHING directly",
    ).toBe(lenderTokensBefore)
    const escrowCode = await getCode(escrow)
    expect(escrowCode && escrowCode !== "0x", "escrow was created").toBe(true)
    expect(
      await escrowBalance(escrow),
      "the payout went to the escrow instead",
    ).toBe(claimable)
    expect(
      await escrowCanRelease(escrow),
      "the escrow will not release while the account is sanctioned",
    ).toBe(false)

    let releaseFailed = false
    try {
      await releaseEscrow(SANCTIONED, escrow)
    } catch {
      releaseFailed = true
    }
    expect(releaseFailed, "releaseEscrow reverts while sanctioned").toBe(true)

    // Lifting the flag is the only thing that unlocks it.
    await setChainalysisSanction(lenderA, SANCTIONED, false)
    expect(
      await escrowCanRelease(escrow),
      "escrow is releasable once clean",
    ).toBe(true)
    await releaseEscrow(SANCTIONED, escrow)
    expect(
      (await chain.erc20Balance(asset, SANCTIONED)) - lenderTokensBefore,
      "the escrowed assets reached the account",
    ).toBe(claimable)
    expect(await escrowBalance(escrow), "escrow is empty").toBe(0n)

    await syncSubgraph()
    attachAgreement("V2P-09 sanctions and escrow", {
      oracle: MOCK_CHAINALYSIS,
      sentinel: SENTINEL,
      subject: SANCTIONED,
      market,
      quarantinedExpiry: expiry,
      escrow,
      escrowed: claimable,
      formatted: formatUnits(claimable, decimals),
    })
  })

  test("teardown: the sanctions flag is cleared and the pinned fixtures were never touched", async () => {
    // A leftover flag would poison every other suite that uses this address; assert it, do not
    // merely hope for it.
    if (await isFlaggedByChainalysis(SANCTIONED)) {
      await setChainalysisSanction(lenderA, SANCTIONED, false)
    }
    expect(await isFlaggedByChainalysis(SANCTIONED)).toBe(false)
    for (const account of [lenderA, lenderB, borrower]) {
      expect(
        await isFlaggedByChainalysis(account),
        `${account} is not flagged`,
      ).toBe(false)
    }

    const protectedIds = Object.values(pins.markets).map((m) => m.toLowerCase())
    const deployed = [
      openFixture,
      fifoFixture,
      closeFixture,
      nukeFixture,
      fixedFixture,
      maturedFixture,
    ].map((f) => f.market.toLowerCase())
    for (const id of deployed) {
      expect(
        protectedIds,
        "no pinned market was used as a fixture",
      ).not.toContain(id)
    }
    attachAgreement("V2P end state", {
      deployedThisRun: deployed,
      chainNow: await chain.blockTimestamp(),
      wallNow: Math.floor(Date.now() / 1000),
    })
  })
})
