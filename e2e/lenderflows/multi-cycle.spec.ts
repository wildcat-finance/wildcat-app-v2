/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { parseUnits } from "viem"

import {
  account0,
  account1,
  account2,
  findOpenBatchExpiry,
  hooksTimingConfig,
  periodicTiming,
  pinnedMarkets,
  selfCleanWithdrawals,
  settleUnpaidBatches,
  unpaidBatchExpiries,
  type PeriodicConfig,
} from "./lib"
import { marketStateV2Abi } from "../lib/abis"
import * as chain from "../lib/chain"
import {
  advanceTime,
  faucet,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "../lib/env"
import { attachAgreement } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test } from "../lib/test"

/**
 * UAT 5 Lender Flows — LEN-24 "Cycles inside a window"
 * (runsheet `uat_5 Lender Flows.tsv:32`: "With window > cycle (M6/M9 params): two lenders file
 * requests more than one cycle apart WITHIN the same window. Determine whether multiple
 * withdrawal cycles run inside one window (open protocol question flagged in the 30 Jul
 * session): record grouping, cycle end times and claims for both requests.")
 *
 * THIS TEST IS AN OBSERVATION, NOT AN EXPECTATION.
 *
 * The runsheet row preserves an OPEN protocol question, and
 * COVERAGE-SUGGESTIONS-2026-09-08 §7 is explicit about what that means for automation: "Use it
 * as a targeted observation/reconciliation task first; turn the resolved intended behavior into
 * assertions. Do not mark any observed grouping as a pass until the expectation is established."
 *
 * So the pass criterion here is a SUCCESSFUL, INTERNALLY CONSISTENT OBSERVATION:
 *   - both requests are accepted inside one withdrawal window, more than one cycle apart;
 *   - chain and subgraph agree about every batch, expiry and per-lender status they produced;
 *   - both lenders are paid what they asked for.
 * The GROUPING itself — one batch or two, and where the cycle ends land relative to the window —
 * is recorded verbatim in the journal and in an `attachAgreement` labelled with the owner
 * question. Nothing below asserts a grouping, and nothing below should be turned into an
 * assertion until the owner resolves the question.
 *
 * Fixture: the pinned periodic market (`pins.markets.periodic`, UAT M6 — period 1800s, window
 * 900s, withdrawal cycle 360s), the only market on this board where a window is long enough to
 * contain more than one cycle. The E2E-created periodic markets (MKT-06/07) are deployed with
 * the wizard's default 1-hour cycle, which is LONGER than their windows, so the scenario is
 * structurally impossible there — see the skip reason below.
 *
 * State hygiene: this file leaves nothing behind — both lenders' batches are claimed in full
 * before it ends, so `periodic.spec.ts` (which sorts after it and shares the market) still finds
 * a clean queue.
 *
 * COMPARISON NOTE: rows pair by UAT id (`e2e/lib/compare.ts`), not by suite+title, so moving a
 * case between files no longer de-pairs it. The main worktree keeps its fixme, so the gap still
 * shows on that side.
 */
test.describe.serial(
  "lender flows: multiple cycles inside one periodic window (LEN-24)",
  () => {
    test.setTimeout(600_000)

    const market = pinnedMarkets.periodic.toLowerCase() as Address
    /** The two lenders whose requests are more than one cycle apart. */
    const lenderA = account1
    const lenderB = account2

    let token: Address
    let decimals = 18
    let cycle = 0
    let cfg: PeriodicConfig
    let withdrawAmount = 0n
    let fixtureUsable = false

    const requireFixture = () =>
      test.skip(
        !fixtureUsable,
        "no periodic market whose withdrawal WINDOW is long enough for two requests more than one CYCLE apart (needs window > 2 × cycle) — the pinned UAT M6 market is the only such fixture; MKT-06/07 deploy with a 1h cycle inside 10/30m windows",
      )

    /** The market's own view of the pending batch key (0 = no batch currently accumulating). */
    const pendingWithdrawalExpiry = async () =>
      Number(
        (
          await chain.publicClient.readContract({
            address: market,
            abi: marketStateV2Abi,
            functionName: "currentState",
          })
        ).pendingWithdrawalExpiry,
      )

    /**
     * Land inside an OPEN window with at least `needed` seconds left in it. Bounded: at most two
     * period hops, so a mis-derived schedule fails loudly instead of buying unlimited chain time.
     */
    const landInWindow = async (needed: number) => {
      for (let hop = 0; ; hop += 1) {
        const now = await chain.blockTimestamp()
        const timing = periodicTiming(cfg, now)
        if (
          timing.isOpen &&
          timing.currentWindowEnd !== undefined &&
          timing.currentWindowEnd - now >= needed
        ) {
          return {
            now,
            windowStart: timing.currentWindowEnd - cfg.withdrawalWindowDuration,
            windowEnd: timing.currentWindowEnd,
          }
        }
        expect(hop, "landing in a usable window takes at most two hops").toBeLessThan(
          2,
        )
        await advanceTime(timing.nextWindowStart - now + 5)
      }
    }

    test("setup: schedule, hygiene, two funded positions", async () => {
      await syncChainTimeToWallClock()
      const m = await subgraph.market(market)
      expect(m, "pinned periodic market exists on the fork subgraph").not.toBeNull()
      token = m!.asset.address as Address
      decimals = m!.asset.decimals
      cycle = Number(m!.withdrawalBatchDuration)
      const timingCfg = await hooksTimingConfig(market)
      expect(timingCfg, "hooksConfig present").not.toBeNull()
      cfg = timingCfg!
      withdrawAmount = parseUnits("20", decimals)

      // The scenario is only meaningful when a whole extra cycle fits inside one window.
      fixtureUsable =
        cfg.periodDuration > 0 &&
        !cfg.periodicTermClosed &&
        cfg.withdrawalWindowDuration < cfg.periodDuration &&
        cycle > 0 &&
        cfg.withdrawalWindowDuration > 2 * cycle + 60
      attachAgreement("LEN-24 fixture schedule", {
        market,
        name: m!.name,
        periodDuration: cfg.periodDuration,
        withdrawalWindowDuration: cfg.withdrawalWindowDuration,
        withdrawalBatchDuration: cycle,
        firstWithdrawalWindowStart: cfg.firstWithdrawalWindowStart,
        wholeCyclesPerWindow: cycle
          ? Math.floor(cfg.withdrawalWindowDuration / cycle)
          : 0,
        usable: fixtureUsable,
      })
      requireFixture()

      // Hygiene: a crashed run can leave pending/unpaid batches that would silently merge this
      // observation into somebody else's batch. Clean ALL three lender accounts that touch this
      // market across the board, then prove the queue is empty.
      for (const account of [account0, lenderA, lenderB])
        faucet(account, parseUnits("1", 18))
      // Order matters (CONVENTIONS "State hygiene"): expire any still-PENDING batch first —
      // otherwise request A below silently joins it and the grouping observation is about
      // somebody else's batch — then settle the unpaid queue, then claim leftovers.
      const pendingAtStart = await pendingWithdrawalExpiry()
      if (pendingAtStart > 0) {
        const now = await chain.blockTimestamp()
        if (now <= pendingAtStart) await advanceTime(pendingAtStart - now + 2)
        await chain.updateState(account0, market)
      }
      if ((await unpaidBatchExpiries(market)).length > 0)
        await settleUnpaidBatches(lenderA, market, token, decimals)
      for (const account of [account0, lenderA, lenderB])
        await selfCleanWithdrawals(account, market)
      await syncSubgraph()
      expect(await unpaidBatchExpiries(market), "no unpaid batches left").toEqual(
        [],
      )

      // Both lenders need a position big enough for their request. Deposits are window-
      // independent on a periodic market (recorded by LEN-25), so this needs no schedule care.
      const minimum = BigInt(m!.hooksConfig?.minimumDeposit ?? "0")
      const topUp = minimum + parseUnits("1", decimals)
      for (const account of [lenderA, lenderB]) {
        if ((await chain.marketBalance(market, account)) < withdrawAmount * 2n) {
          faucet(account, topUp * 2n, token)
          await chain.approve(account, token, market, topUp * 2n)
          await chain.depositUpTo(account, market, topUp)
        }
        expect(
          await chain.marketBalance(market, account),
          `lender ${account} holds a position`,
        ).toBeGreaterThan(withdrawAmount)
      }
      await syncSubgraph()
    })

    test("LEN-24: two lenders request more than one cycle apart inside one window", async () => {
      requireFixture()

      // Room for: request A, a full cycle + margin, request B, and B's own cycle + margin.
      const needed = 2 * cycle + 90
      const landed = await landInWindow(needed)
      expect(
        await pendingWithdrawalExpiry(),
        "no batch is already accumulating — otherwise request A would join a stranger's batch and the grouping observation would be meaningless",
      ).toBe(0)

      // ---------- request A, near the top of the window ----------
      const queuedAtA = await chain.blockTimestamp()
      await chain.queueWithdrawal(lenderA, market, withdrawAmount)
      await syncSubgraph()
      const expiryA = await findOpenBatchExpiry(market, lenderA, cycle)
      const pendingAfterA = await pendingWithdrawalExpiry()

      // ---------- move MORE than one full cycle, staying inside the same window ----------
      const gap = cycle + 30
      await advanceTime(gap)
      const queuedAtB = await chain.blockTimestamp()
      expect(
        queuedAtB - queuedAtA,
        "the two requests really are more than one cycle apart",
      ).toBeGreaterThan(cycle)
      expect(
        periodicTiming(cfg, queuedAtB).isOpen,
        "…and both land inside the SAME window",
      ).toBe(true)
      expect(
        queuedAtB,
        "…the same window, not a later one",
      ).toBeLessThan(landed.windowEnd)

      await chain.queueWithdrawal(lenderB, market, withdrawAmount)
      await syncSubgraph()
      const expiryB = await findOpenBatchExpiry(market, lenderB, cycle)

      // ---------- OBSERVATION (recorded, never asserted): grouping + cycle end times ----------
      const grouped = expiryA === expiryB
      const batchA = await subgraph.withdrawalBatch(market, expiryA)
      const batchB = await subgraph.withdrawalBatch(market, expiryB)
      const observation = {
        grouping: grouped
          ? "SAME batch — both in-window requests share one expiry"
          : "SEPARATE batches — a second cycle started inside the same window",
        windowStart: landed.windowStart,
        windowEnd: landed.windowEnd,
        windowDuration: cfg.withdrawalWindowDuration,
        cycleDuration: cycle,
        requestA: {
          lender: lenderA,
          queuedAt: queuedAtA,
          secondsIntoWindow: queuedAtA - landed.windowStart,
          batchExpiry: expiryA,
          expirySecondsIntoWindow: expiryA - landed.windowStart,
          expiryInsideWindow: expiryA <= landed.windowEnd,
          cycleLength: expiryA - queuedAtA,
        },
        requestB: {
          lender: lenderB,
          queuedAt: queuedAtB,
          secondsIntoWindow: queuedAtB - landed.windowStart,
          batchExpiry: expiryB,
          expirySecondsIntoWindow: expiryB - landed.windowStart,
          expiryInsideWindow: expiryB <= landed.windowEnd,
          cycleLength: expiryB - queuedAtB,
        },
        gapBetweenRequests: queuedAtB - queuedAtA,
        pendingBatchKeyAfterA: pendingAfterA,
        indexedBatchA: batchA && {
          expiry: batchA.expiry,
          lenderWithdrawalsCount: batchA.lenderWithdrawalsCount,
          totalNormalizedRequests: batchA.totalNormalizedRequests,
        },
        indexedBatchB: batchB && {
          expiry: batchB.expiry,
          lenderWithdrawalsCount: batchB.lenderWithdrawalsCount,
          totalNormalizedRequests: batchB.totalNormalizedRequests,
        },
      }

      // ---------- consistency: chain and subgraph tell the same story ----------
      // These are the real assertions. They hold whatever the grouping turns out to be.
      for (const [label, lender, batchExpiry] of [
        ["A", lenderA, expiryA],
        ["B", lenderB, expiryB],
      ] as const) {
        const onChain = await chain.getAccountWithdrawalStatus(
          market,
          lender,
          batchExpiry,
        )
        const indexed = await subgraph.lenderWithdrawalStatus(
          market,
          batchExpiry,
          lender,
        )
        expect(
          onChain.scaledAmount,
          `request ${label} exists on chain in batch ${batchExpiry}`,
        ).toBeGreaterThan(0n)
        expect(
          indexed,
          `request ${label} is indexed against the same batch`,
        ).not.toBeNull()
        expect(
          Number(indexed!.batchExpiry),
          `request ${label}: chain batch key == indexed batch key`,
        ).toBe(batchExpiry)
        expect(
          BigInt(indexed!.totalNormalizedRequests),
          `request ${label}: the indexed request is what the lender asked for`,
        ).toBe(withdrawAmount)
      }
      expect(
        batchA,
        "batch A is indexed (a grouped observation reads the same row twice — still valid)",
      ).not.toBeNull()
      expect(batchB, "batch B is indexed").not.toBeNull()

      // ---------- claims: settle whatever grouping produced, and record the outcome ----------
      const lastExpiry = Math.max(expiryA, expiryB)
      const nowBeforeSettle = await chain.blockTimestamp()
      if (nowBeforeSettle <= lastExpiry)
        await advanceTime(lastExpiry - nowBeforeSettle + 2)
      await chain.updateState(account0, market)
      await syncSubgraph()
      const settledAt = await chain.blockTimestamp()

      const claims: Record<string, unknown>[] = []
      for (const [label, lender, batchExpiry] of [
        ["A", lenderA, expiryA],
        ["B", lenderB, expiryB],
      ] as const) {
        const claimable = await chain.getAvailableWithdrawalAmount(
          market,
          lender,
          batchExpiry,
        )
        const before = await chain.erc20Balance(token, lender)
        if (claimable > 0n)
          await chain.executeWithdrawal(lender, market, lender, batchExpiry)
        const received = (await chain.erc20Balance(token, lender)) - before
        claims.push({
          request: label,
          lender,
          batchExpiry,
          claimable: claimable.toString(),
          received: received.toString(),
          claimedAt: await chain.blockTimestamp(),
          claimInsideWindow: periodicTiming(cfg, await chain.blockTimestamp())
            .isOpen,
        })
        // Invariant regardless of grouping: the lender is paid what they requested (scale
        // rounding can leave a couple of wei behind — CONVENTIONS "Amounts").
        expect(
          withdrawAmount - received <= 20n,
          `request ${label} paid in full: asked ${withdrawAmount}, received ${received}`,
        ).toBe(true)
      }

      await syncSubgraph()
      for (const [label, lender, batchExpiry] of [
        ["A", lenderA, expiryA],
        ["B", lenderB, expiryB],
      ] as const) {
        const indexed = await subgraph.lenderWithdrawalStatus(
          market,
          batchExpiry,
          lender,
        )
        expect(
          indexed!.isCompleted,
          `request ${label} is settled in the indexer too`,
        ).toBe(true)
        expect(
          BigInt(indexed!.totalNormalizedRequests) -
            BigInt(indexed!.normalizedAmountWithdrawn) <=
            20n,
          `request ${label}: nothing but dust outstanding`,
        ).toBe(true)
      }
      expect(
        await unpaidBatchExpiries(market),
        "the observation leaves no unpaid batch behind for periodic.spec.ts",
      ).toEqual([])

      attachAgreement("LEN-24 multi-cycle-in-window OBSERVATION", {
        OWNER_QUESTION:
          "expected grouping unresolved — recorded observed behavior. The 30 Jul session flagged whether MULTIPLE withdrawal cycles may run inside ONE withdrawal window; this run records what the deployed v2.5 hooks + market actually did and asserts only chain/subgraph consistency and full payment. Do NOT convert the grouping fields below into assertions until the owner states the intended behaviour.",
        observed: observation,
        claims,
        settledAt,
        chainTimeConsumedSeconds: settledAt - landed.now,
        oraclesAgreed: true,
      })
    })
  },
)
