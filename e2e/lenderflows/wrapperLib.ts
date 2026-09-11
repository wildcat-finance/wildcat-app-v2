/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { getDeploymentAddress } from "@wildcatfi/wildcat-sdk"
import {
  BaseError,
  ContractFunctionRevertedError,
  keccak256,
  toHex,
  zeroAddress,
} from "viem"

import {
  erc4626Abi,
  marketExtrasAbi,
  marketGenerationAbi,
  wrapperFactoryAbi,
} from "../lib/abis"
import * as chain from "../lib/chain"
import { gql, type Address } from "../lib/env"

/**
 * ERC-4626 wrapper helpers, shared by the LEN-28…31 lifecycle cases and the UAT-6 (WRP-*)
 * deployment/closure cases.
 *
 * ---------------------------------------------------------------------------------------------
 * VERIFIED GENERATION SEMANTICS — read from the deployed stack on THIS fork (RPC probes recorded
 * in the suites' agreements), reconciled with the sources cited below. Every assertion in the
 * wrapper specs cites one of these:
 *
 *  - `Wildcat4626WrapperFactory` (v2.5-protocol/src/vault/Wildcat4626WrapperFactory.sol) is a
 *    FACADE. `_probeRounding` (:85) staticcalls `scaledTransferRounding()`:
 *      * declared == keccak256("scaleAmountDown")  -> V2.5 market, wrapper deployed HERE (:156)
 *        and recorded both in the facade registry and on the market via `registerWrapper` (:158);
 *      * NOT declared (pre-V2.5, half-up scaling)  -> forwarded to the immutable `v1Factory`
 *        (:144-147 for createWrapper, :128-131 for discovery);
 *      * declared with a different id              -> `UnsupportedMarketRounding` (:151).
 *    => `registeredWrapper()` MUST NOT be used to discover a legacy market's wrapper: the
 *       function does not exist there and the call reverts. `wrapperForMarket()` on the facade is
 *       the one discovery path that answers for BOTH generations.
 *  - One canonical wrapper per market, on both generations: the facade reverts
 *    `WrapperAlreadyExists` from its own registry (:141) and the forwarded v1 factory raises the
 *    same error for markets it already serves.
 *  - Shares ARE the market's SCALED balance. `deposit` mints `scaledAfter - scaledBefore` of the
 *    wrapper's own market position and reverts `SharesMismatch` unless that equals the previewed
 *    conversion (Wildcat4626Wrapper.sol:284-317); `withdraw`/`redeem` burn the exact scaled
 *    amount the market transfer moves (:361-438). Scaled balances are interest-INVARIANT, so a
 *    scaled delta is proof of a real transfer and never of accrued interest dust.
 *  - Shares are therefore non-rebasing while `convertToAssets` grows with the market's
 *    `scaleFactor` (kb/deployed-stack/ERC4626_WRAPPER.md "Important Behavior").
 *  - Unwrapping yields MARKET tokens, not the underlying: exiting to the underlying still needs
 *    the market's queue/claim flow (ERC4626_WRAPPER.md "Mental Model").
 */

export const RAY = 10n ** 27n

/** Rounding id a V2.5 market declares for scaled transfers (Wildcat4626WrapperFactory.sol:53). */
export const FLOOR_ROUNDING = keccak256(toHex("scaleAmountDown"))

/** The factory the SDK/app actually transacts against — the V2.5 facade on this chain. */
export const WRAPPER_FACTORY = getDeploymentAddress(
  11155111,
  "Wildcat4626WrapperFactory",
).toLowerCase() as Address

// ---------- generation ----------

export type MarketGeneration = {
  /** `scaledTransferRounding()` answered (V2.5+) rather than reverting (legacy). */
  declaresRounding: boolean
  rounding: string | null
  /** Declared rounding is the floor id this wrapper generation implements. */
  roundsFloor: boolean
  /** `registeredWrapper()` — only queried when the market declares a rounding. */
  registeredWrapper: Address | null
  label: "v2.5" | "legacy"
}

/**
 * Establish a market's wrapper generation WITHOUT assuming V2.5 APIs exist on it.
 * `registeredWrapper()` is only called once the rounding probe proved the market is V2.5.
 */
export const marketGeneration = async (
  market: Address,
): Promise<MarketGeneration> => {
  const rounding = await chain.publicClient
    .readContract({
      address: market,
      abi: marketGenerationAbi,
      functionName: "scaledTransferRounding",
    })
    .catch(() => null)
  if (rounding === null) {
    return {
      declaresRounding: false,
      rounding: null,
      roundsFloor: false,
      registeredWrapper: null,
      label: "legacy",
    }
  }
  const registered = (await chain.publicClient
    .readContract({
      address: market,
      abi: marketGenerationAbi,
      functionName: "registeredWrapper",
    })
    .catch(() => null)) as Address | null
  return {
    declaresRounding: true,
    rounding,
    roundsFloor: rounding === FLOOR_ROUNDING,
    registeredWrapper:
      registered && registered !== zeroAddress
        ? (registered.toLowerCase() as Address)
        : null,
    label: "v2.5",
  }
}

// ---------- factory ----------

/** Generation-agnostic discovery: the facade answers for V2.5 markets and forwards legacy ones. */
export const wrapperForMarket = async (market: Address) => {
  const wrapper = (await chain.publicClient.readContract({
    address: WRAPPER_FACTORY,
    abi: wrapperFactoryAbi,
    functionName: "wrapperForMarket",
    args: [market],
  })) as Address
  return wrapper === zeroAddress ? null : (wrapper.toLowerCase() as Address)
}

export const isFloorRoundingMarket = (market: Address) =>
  chain.publicClient.readContract({
    address: WRAPPER_FACTORY,
    abi: wrapperFactoryAbi,
    functionName: "isFloorRoundingMarket",
    args: [market],
  })

export const factoryV1 = async () =>
  (
    (await chain.publicClient.readContract({
      address: WRAPPER_FACTORY,
      abi: wrapperFactoryAbi,
      functionName: "v1Factory",
    })) as Address
  ).toLowerCase() as Address

/** eth_call only — proves the duplicate/rounding guard without writing to the shared fork. */
export const simulateCreateWrapper = async (params: {
  account: Address
  market: Address
  factory?: Address
}): Promise<{ reverted: boolean; errorName?: string; message?: string }> => {
  try {
    await chain.publicClient.simulateContract({
      account: params.account,
      address: params.factory ?? WRAPPER_FACTORY,
      abi: wrapperFactoryAbi,
      functionName: "createWrapper",
      args: [params.market],
    })
    return { reverted: false }
  } catch (error) {
    const reverted =
      error instanceof BaseError
        ? error.walk((e) => e instanceof ContractFunctionRevertedError)
        : null
    return {
      reverted: true,
      errorName:
        reverted instanceof ContractFunctionRevertedError
          ? reverted.data?.errorName
          : undefined,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Find the `createWrapper` transaction the APP just sent, so a deployment case can assert WHO
 * signed it (the UAT asks whether lender-side deployment works or the build is borrower-only).
 * Scans forward from `fromBlock` for a transaction addressed to the configured factory.
 */
export const findWrapperDeployTx = async (fromBlock: bigint) => {
  const head = await chain.publicClient.getBlockNumber({ cacheTime: 0 })
  for (let n = fromBlock + 1n; n <= head; n += 1n) {
    const block = await chain.publicClient.getBlock({
      blockNumber: n,
      includeTransactions: true,
    })
    for (const tx of block.transactions) {
      if (typeof tx === "string") continue
      if ((tx.to ?? "").toLowerCase() !== WRAPPER_FACTORY) continue
      return {
        from: tx.from.toLowerCase() as Address,
        hash: tx.hash,
        blockNumber: Number(n),
      }
    }
  }
  return null
}

// ---------- wrapper writes (chain-side; hygiene only — the specs drive the UI) ----------

/** Fixed generous gas, mirroring lib/chain: estimation runs against the pre-time-travel block. */
const GAS = 5_000_000n

const wrapperRedeemAbi = [
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
] as const

/**
 * Redeem every share back to market tokens. Setup hygiene: a crashed run can leave a wrapped
 * position behind, and LEN-31/WRP-* assert on a zero-share end state.
 */
export const wrapperRedeemAll = async (owner: Address, wrapper: Address) => {
  const shares = await wrapperRead<bigint>(wrapper, "balanceOf", [owner])
  if (shares === 0n) return 0n
  const hash = await chain.walletFor(owner).writeContract({
    address: wrapper,
    abi: wrapperRedeemAbi,
    functionName: "redeem",
    args: [shares, owner, owner],
    gas: GAS,
  })
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  chain.recordTx(receipt, { functionName: "redeem", args: [shares, owner] })
  if (receipt.status !== "success")
    throw new Error(`wrapper redeem reverted (${hash})`)
  return shares
}

// ---------- wrapper views ----------

const wrapperRead = <T>(
  wrapper: Address,
  functionName: string,
  args?: readonly unknown[],
  blockNumber?: bigint,
) =>
  chain.publicClient.readContract({
    address: wrapper,
    abi: erc4626Abi,
    functionName: functionName as never,
    args: args as never,
    ...(blockNumber === undefined ? {} : { blockNumber }),
  }) as unknown as Promise<T>

export const wrapperTotalSupply = (wrapper: Address, blockNumber?: bigint) =>
  wrapperRead<bigint>(wrapper, "totalSupply", undefined, blockNumber)

/** Share balance AT a past block — evidence for a state that has since been unwound. */
export const wrapperSharesAt = (
  wrapper: Address,
  owner: Address,
  blockNumber: bigint,
) => wrapperRead<bigint>(wrapper, "balanceOf", [owner], blockNumber)

/** Block of the market's indexed `MarketClosed` event (the exact termination block). */
export const marketClosedAtBlock = async (market: Address) => {
  const rows = (
    await gql<{ marketCloseds: { blockNumber: string }[] }>(
      `{ marketCloseds(where: { market: "${market.toLowerCase()}" }, orderBy: blockNumber, orderDirection: desc, first: 1) { blockNumber } }`,
    )
  ).marketCloseds
  return rows[0] ? BigInt(rows[0].blockNumber) : null
}

export const wrapperTotalAssets = (wrapper: Address) =>
  wrapperRead<bigint>(wrapper, "totalAssets")

export const wrapperConvertToShares = (wrapper: Address, assets: bigint) =>
  wrapperRead<bigint>(wrapper, "convertToShares", [assets])

export const wrapperPreviewWithdraw = (wrapper: Address, assets: bigint) =>
  wrapperRead<bigint>(wrapper, "previewWithdraw", [assets])

export const wrapperMaxRedeem = (wrapper: Address, owner: Address) =>
  wrapperRead<bigint>(wrapper, "maxRedeem", [owner])

export const wrapperMaxDeposit = (wrapper: Address, owner: Address) =>
  wrapperRead<bigint>(wrapper, "maxDeposit", [owner])

export const wrapperSymbol = (wrapper: Address) =>
  wrapperRead<string>(wrapper, "symbol")

export const wrapperAsset = async (wrapper: Address) =>
  (await wrapperRead<Address>(wrapper, "asset")).toLowerCase() as Address

// ---------- market scaled state ----------

/**
 * Scaled balance — the interest-INVARIANT quantity. Market (normalized) balances rebase upward
 * every block, so only a scaled delta distinguishes a real transfer from accrued interest.
 * `blockNumber` pins the read so a wrap/unwrap can be measured against the exact mined block.
 */
export const scaledBalanceOf = (
  market: Address,
  owner: Address,
  blockNumber?: bigint,
) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketExtrasAbi,
    functionName: "scaledBalanceOf",
    args: [owner],
    ...(blockNumber === undefined ? {} : { blockNumber }),
  })

/**
 * Stored scale factor. A market's `_transfer` runs `_getUpdatedState()` and writes the accrued
 * state back, so reading this AT the block that mined a transfer returns exactly the scale factor
 * that transfer scaled with.
 */
export const marketScaleFactor = (market: Address, blockNumber?: bigint) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketExtrasAbi,
    functionName: "scaleFactor",
    ...(blockNumber === undefined ? {} : { blockNumber }),
  })

/** `scaleAmountDown` — the V2.5 market transfer's scaling (floor). */
export const scaleAmountDown = (amount: bigint, scaleFactor: bigint) =>
  (amount * RAY) / scaleFactor

/** Pre-V2.5 markets scale half-up; kept explicit so the legacy expectation is not guesswork. */
export const scaleAmountHalfUp = (amount: bigint, scaleFactor: bigint) =>
  (amount * RAY + scaleFactor / 2n) / scaleFactor

/** Smallest normalized amount whose floor-scaling moves exactly `shares` (`_convertToAssetsUp`). */
export const normalizeAmountUp = (shares: bigint, scaleFactor: bigint) =>
  (shares * scaleFactor + RAY - 1n) / RAY

export const normalizeAmountDown = (shares: bigint, scaleFactor: bigint) =>
  (shares * scaleFactor) / RAY

// ---------- subgraph ----------

export type IndexedWrapper = {
  id: string
  marketAddress: string
  factory: { id: string; label: string; generation: string; indexed: boolean }
}

/** The indexed wrapper row (factory generation is the subgraph's own provenance label). */
export const indexedWrapperForMarket = async (market: Address) =>
  (
    await gql<{ wildcat4626Wrappers: IndexedWrapper[] }>(
      `{ wildcat4626Wrappers(where: { marketAddress: "${market.toLowerCase()}" }) {
        id marketAddress factory { id label generation indexed } } }`,
    )
  ).wildcat4626Wrappers[0] ?? null

/**
 * Was this market's wrapper opted into AT CREATION (the MKT-22 case) rather than deployed
 * post-hoc? Chain state cannot tell them apart — registration is write-once either way — so the
 * indexed deployment event is the oracle: the staged create-market deploy sends
 * token -> market -> wrapper in consecutive blocks, while a post-hoc deployment lands hundreds of
 * blocks later.
 */
export const wrapperDeployedAtCreation = async (
  market: Address,
  slackBlocks = 5,
) => {
  const rows = (
    await gql<{
      wildcat4626WrapperDeployeds: {
        blockNumber: string
        market: { createdAtBlock: string } | null
      }[]
    }>(
      `{ wildcat4626WrapperDeployeds(where: { marketAddress: "${market.toLowerCase()}" }) {
        blockNumber market { createdAtBlock } } }`,
    )
  ).wildcat4626WrapperDeployeds
  const row = rows[0]
  if (!row?.market) return false
  return Number(row.blockNumber) - Number(row.market.createdAtBlock) <= slackBlocks
}

/** Every wrapper-factory generation the fork subgraph indexes (COMPATIBILITY.md requires all). */
export const indexedWrapperFactories = async () =>
  (
    await gql<{
      wildcat4626WrapperFactories: {
        id: string
        label: string
        generation: string
        indexed: boolean
        deploymentTarget: boolean
      }[]
    }>(
      `{ wildcat4626WrapperFactories(first: 20) {
        id label generation indexed deploymentTarget } }`,
    )
  ).wildcat4626WrapperFactories
