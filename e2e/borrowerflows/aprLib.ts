/* eslint-disable no-await-in-loop, import/no-extraneous-dependencies */
import { expect, type Page } from "@playwright/test"
import type { Hex } from "viem"

import { BORROWER } from "./lib"
import {
  marketAprExecutionAbi,
  marketStateV2Abi,
  periodicAprErrorsAbi,
  periodicHooksAbi,
  revolvingMarketAbi,
} from "../lib/abis"
import * as chain from "../lib/chain"
import { advanceTime, type Address } from "../lib/env"

/**
 * Shared reads/writes for the two v2.5-only pricing surfaces:
 *   - REVOLVING markets (commitment fee + utilization APR)  -> apr-rcf-operations.spec.ts
 *   - PERIODIC-TERM markets (APR reduction proposals)       -> apr-periodic.spec.ts
 *
 * Kept out of borrowerflows/lib.ts so the 800-line page-4 helper file does not grow another
 * generation-specific surface; both specs import from here.
 */

const GAS = 5_000_000n

const waitTx = async (hash: Hex, meta?: chain.TxMeta) => {
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  chain.recordTx(receipt, meta)
  if (receipt.status !== "success")
    throw new Error(
      `transaction ${hash} reverted (block ${receipt.blockNumber})`,
    )
  return receipt
}

// ---------- market state ----------

export type LiveMarketState = {
  isClosed: boolean
  maxTotalSupply: bigint
  accruedProtocolFees: bigint
  normalizedUnclaimedWithdrawals: bigint
  scaledTotalSupply: bigint
  scaledPendingWithdrawals: bigint
  pendingWithdrawalExpiry: number
  isDelinquent: boolean
  timeDelinquent: number
  protocolFeeBips: bigint
  annualInterestBips: bigint
  reserveRatioBips: bigint
  scaleFactor: bigint
  lastInterestAccruedTimestamp: number
}

/**
 * `currentState()` — the contract's own projection of the stored state to the CURRENT block
 * (lib/abis.ts#marketStateV2Abi). Read it immediately after an `updateState()` and before any
 * further mining: at the block that wrote the state the projection is a no-op, so the returned
 * `scaleFactor`/`lastInterestAccruedTimestamp` are exactly what is stored. Interleaving a
 * `syncSubgraph()` mines a block and silently turns the read into a 1-second projection.
 */
export const liveMarketState = async (
  market: Address,
): Promise<LiveMarketState> => {
  const s = await chain.publicClient.readContract({
    address: market,
    abi: marketStateV2Abi,
    functionName: "currentState",
  })
  return {
    isClosed: s.isClosed,
    maxTotalSupply: BigInt(s.maxTotalSupply),
    accruedProtocolFees: BigInt(s.accruedProtocolFees),
    normalizedUnclaimedWithdrawals: BigInt(s.normalizedUnclaimedWithdrawals),
    scaledTotalSupply: BigInt(s.scaledTotalSupply),
    scaledPendingWithdrawals: BigInt(s.scaledPendingWithdrawals),
    pendingWithdrawalExpiry: Number(s.pendingWithdrawalExpiry),
    isDelinquent: s.isDelinquent,
    timeDelinquent: Number(s.timeDelinquent),
    protocolFeeBips: BigInt(s.protocolFeeBips),
    annualInterestBips: BigInt(s.annualInterestBips),
    reserveRatioBips: BigInt(s.reserveRatioBips),
    scaleFactor: BigInt(s.scaleFactor),
    lastInterestAccruedTimestamp: Number(s.lastInterestAccruedTimestamp),
  }
}

// ---------- revolving (RCF) ----------

/** `commitmentFeeBips()` — backed by an `internal immutable` with no setter. */
export const commitmentFeeBips = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: revolvingMarketAbi,
    functionName: "commitmentFeeBips",
  })

/** `_drawnAmount` — maintained by `_onBorrow` / `_onRepay`, capped at outstanding debt. */
export const drawnAmount = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: revolvingMarketAbi,
    functionName: "drawnAmount",
  })

/** True when the market exposes the revolving getters (a STANDARD market reverts both). */
export const isRevolvingMarket = async (market: Address) =>
  commitmentFeeBips(market).then(
    () => true,
    () => false,
  )

// ---------- periodic term hooks ----------

export type PeriodicSchedule = {
  firstWithdrawalWindowStart: number
  periodDuration: number
  withdrawalWindowDuration: number
  isClosed: boolean
  minimumDeposit: bigint
}

export const periodicSchedule = async (
  hooks: Address,
  market: Address,
): Promise<PeriodicSchedule> => {
  const m = await chain.publicClient.readContract({
    address: hooks,
    abi: periodicHooksAbi,
    functionName: "getHookedMarket",
    args: [market],
  })
  return {
    firstWithdrawalWindowStart: Number(m.firstWithdrawalWindowStart),
    periodDuration: Number(m.periodDuration),
    withdrawalWindowDuration: Number(m.withdrawalWindowDuration),
    isClosed: m.isClosed,
    minimumDeposit: BigInt(m.minimumDeposit),
  }
}

export type PendingAprProposal = {
  proposedAprBips: number
  proposalTimestamp: number
  responseWindowStart: number
  responseWindowEnd: number
}

/** PeriodicTermHooks.getPendingAprChange (:443). `proposalTimestamp === 0` means "none". */
export const pendingAprProposal = async (
  hooks: Address,
  market: Address,
): Promise<PendingAprProposal | undefined> => {
  const [change, start, end] = await chain.publicClient.readContract({
    address: hooks,
    abi: periodicHooksAbi,
    functionName: "getPendingAprChange",
    args: [market],
  })
  if (Number(change.proposalTimestamp) === 0) return undefined
  return {
    proposedAprBips: Number(change.annualInterestBips),
    proposalTimestamp: Number(change.proposalTimestamp),
    responseWindowStart: Number(start),
    responseWindowEnd: Number(end),
  }
}

export const withdrawalWindowOpen = (hooks: Address, market: Address) =>
  chain.publicClient.readContract({
    address: hooks,
    abi: periodicHooksAbi,
    functionName: "isWithdrawalWindowOpen",
    args: [market],
  })

export const proposeAprOnChain = async (
  hooks: Address,
  market: Address,
  bips: number,
) =>
  waitTx(
    await chain.walletFor(BORROWER).writeContract({
      address: hooks,
      abi: periodicHooksAbi,
      functionName: "proposeAnnualInterestBips",
      args: [market, bips],
      gas: GAS,
    }),
    { functionName: "proposeAnnualInterestBips", args: [market, bips] },
  )

/** WildcatMarketConfig.executePendingAnnualInterestBipsReduction (:214) — permissionless. */
export const executePendingAprReduction = async (
  from: Address,
  market: Address,
) =>
  waitTx(
    await chain.walletFor(from).writeContract({
      address: market,
      abi: marketAprExecutionAbi,
      functionName: "executePendingAnnualInterestBipsReduction",
      gas: GAS,
    }),
    { functionName: "executePendingAnnualInterestBipsReduction" },
  )

/**
 * Simulate an arbitrary write and report whether it reverts, with the revert reason when the
 * node returns one. Negative branches assert the SPECIFIC custom error, never "it failed" — so
 * the periodic-APR custom errors are merged into every ABI here. Without them viem reports
 * "Unable to decode signature 0x…" and a `toContain("Foo")` assertion can never pass.
 */
export const simulateWrite = async (params: {
  account: Address
  address: Address
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any
  functionName: string
  args?: readonly unknown[]
}): Promise<{ reverted: boolean; message: string }> => {
  try {
    await chain.publicClient.simulateContract({
      account: params.account,
      address: params.address,
      abi: [...params.abi, ...periodicAprErrorsAbi],
      functionName: params.functionName as never,
      args: params.args as never,
    })
    return { reverted: false, message: "" }
  } catch (error) {
    return {
      reverted: true,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

// ---------- window schedule maths (PeriodicTermHooks.sol:468 / :478) ----------

/** `_isWithdrawalWindowOpen`: (t - start) % period < windowDuration, and never before start. */
export const windowOpenAt = (cfg: PeriodicSchedule, ts: number) => {
  if (ts < cfg.firstWithdrawalWindowStart) return false
  return (
    (ts - cfg.firstWithdrawalWindowStart) % cfg.periodDuration <
    cfg.withdrawalWindowDuration
  )
}

/** `_getNextWithdrawalWindowStart`: the start of the NEXT window strictly after `ts`. */
export const nextWindowStartAt = (cfg: PeriodicSchedule, ts: number) => {
  if (ts < cfg.firstWithdrawalWindowStart) return cfg.firstWithdrawalWindowStart
  const periodsElapsed = Math.floor(
    (ts - cfg.firstWithdrawalWindowStart) / cfg.periodDuration,
  )
  return (
    cfg.firstWithdrawalWindowStart + (periodsElapsed + 1) * cfg.periodDuration
  )
}

// ---------- time ----------

/**
 * Move chain time forward to (at least) `targetTs`. Chain time is one-way: a target already in
 * the past is a no-op, and the caller must treat that as a scheduling bug rather than silently
 * asserting on the wrong window.
 */
export const advanceChainTo = async (targetTs: number, label: string) => {
  const now = await chain.blockTimestamp()
  const delta = targetTs - now
  if (delta <= 0) return { advancedBy: 0, from: now, to: now }
  if (delta > 6 * 3600)
    throw new Error(
      `refusing to advance chain time by ${delta}s for "${label}" — this suite's windows are ` +
        `minutes-to-hours; a jump this large means the schedule was mis-derived`,
    )
  await advanceTime(delta)
  return { advancedBy: delta, from: now, to: await chain.blockTimestamp() }
}

/**
 * Playwright installs a page clock ONCE (lib/page.ts#alignBrowserClockToChain); after any
 * advanceTime it is left behind the chain and the app keeps classifying windows/expiries with a
 * stale now (CONVENTIONS "Time"). Re-point every already-clocked page after a jump.
 */
export const resyncPageClock = async (page: Page) => {
  await page.clock.setSystemTime((await chain.blockTimestamp()) * 1000)
}

// ---------- page oracles ----------

/** A `ParametersItem` row (src/components/ParametersItem) located by its title text. */
export const parameterRow = (page: Page, title: string) =>
  page
    .getByTestId("parameters-item")
    .filter({ has: page.getByText(title, { exact: true }) })

/** The row's value text, i.e. everything after the title. */
export const readParameterValue = async (page: Page, title: string) => {
  const row = parameterRow(page, title)
  await expect(row).toHaveCount(1, { timeout: 60_000 })
  const text = (await row.innerText()).replace(/\s+/g, " ").trim()
  return text.slice(title.length).trim()
}

/** Mirrors src/utils/formatters.ts#formatBps (2dp, trailing zeroes stripped). */
export const formatBps = (bips: number | bigint) => {
  const pct = Number(bips) / 100
  return String(parseFloat(pct.toFixed(2)))
}
