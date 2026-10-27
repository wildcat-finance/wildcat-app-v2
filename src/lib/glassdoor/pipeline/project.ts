import { BigNumber, utils } from "ethers"

import { erc20Interface, metadataInterface } from "../../export/abi/registry"
import { requiredLiquidity } from "../../export/ledger/buildMarketDataset"
import { ExportRpc, toBlockHex } from "../../export/sources/rpc"
import { MarketStateAt } from "../datasetMetrics"

// Markets without new events are not rebuilt. Their stored summary is combined
// with one batched read of their state at the publication's block, so
// interest, the grace clock and silent tails move with time on quiet markets.

export type CutBlock = { number: number; hash: string; timestamp: number }

export type MarketRef = { address: string; assetAddress: string }

type DecodedState = {
  isClosed: boolean
  maxTotalSupply: BigNumber
  accruedProtocolFees: BigNumber
  normalizedUnclaimedWithdrawals: BigNumber
  scaledTotalSupply: BigNumber
  scaledPendingWithdrawals: BigNumber
  pendingWithdrawalExpiry: number
  isDelinquent: boolean
  timeDelinquent: number
  protocolFeeBips: number
  annualInterestBips: number
  reserveRatioBips: number
  scaleFactor: BigNumber
  lastInterestAccruedTimestamp: number
}

const big = (value: unknown) => BigInt(BigNumber.from(value).toString())

const call = (to: string, data: string, block: string) => ({
  method: "eth_call",
  params: [{ to, data }, block],
})

/** currentState(), asset balance, totalDebts() and totalSupply() at the cut. */
export async function readStatesAtCut(
  rpc: ExportRpc,
  markets: MarketRef[],
  cut: CutBlock,
): Promise<MarketStateAt[]> {
  if (markets.length === 0) return []
  const block = toBlockHex(cut.number)
  const results = await rpc.batch<string>(
    markets.flatMap(({ address, assetAddress }) => [
      call(
        address,
        metadataInterface.encodeFunctionData("currentState"),
        block,
      ),
      call(
        assetAddress,
        erc20Interface.encodeFunctionData("balanceOf", [address]),
        block,
      ),
      call(address, metadataInterface.encodeFunctionData("totalDebts"), block),
      call(address, metadataInterface.encodeFunctionData("totalSupply"), block),
    ]),
  )
  return markets.map((_, index) => {
    const [stateRaw, assetsRaw, debtsRaw, supplyRaw] = results.slice(
      index * 4,
      index * 4 + 4,
    )
    const state = metadataInterface.decodeFunctionResult(
      "currentState",
      stateRaw,
    )[0] as DecodedState
    const scaledTotalSupply = big(state.scaledTotalSupply)
    const normalizedUnclaimedWithdrawals = big(
      state.normalizedUnclaimedWithdrawals,
    )
    return {
      timestamp: cut.timestamp,
      totalAssetsRaw: String(
        big(erc20Interface.decodeFunctionResult("balanceOf", assetsRaw)[0]),
      ),
      requiredLiquidityRaw: String(
        requiredLiquidity({
          scaledTotalSupply,
          scaledPendingWithdrawals: big(state.scaledPendingWithdrawals),
          reserveRatioBips: BigInt(state.reserveRatioBips),
          scaleFactor: big(state.scaleFactor),
          accruedProtocolFees: big(state.accruedProtocolFees),
          normalizedUnclaimedWithdrawals,
        }),
      ),
      scaledTotalSupplyRaw: String(scaledTotalSupply),
      totalSupplyRaw: String(
        big(
          metadataInterface.decodeFunctionResult("totalSupply", supplyRaw)[0],
        ),
      ),
      totalDebtsRaw: String(
        big(metadataInterface.decodeFunctionResult("totalDebts", debtsRaw)[0]),
      ),
      normalizedUnclaimedWithdrawalsRaw: String(normalizedUnclaimedWithdrawals),
      maxTotalSupplyRaw: String(big(state.maxTotalSupply)),
      timeDelinquentSeconds: Number(state.timeDelinquent),
      pendingWithdrawalExpiry: Number(state.pendingWithdrawalExpiry),
      annualInterestBips: Number(state.annualInterestBips),
      protocolFeeBips: Number(state.protocolFeeBips),
      reserveRatioBips: Number(state.reserveRatioBips),
      isClosed: state.isClosed,
    }
  })
}

const hooksInterface = new utils.Interface([
  "function hooks() view returns (uint256)",
])
const GET_HOOKED_MARKET = utils.id("getHookedMarket(address)").slice(0, 10)

/**
 * minimumDeposit from a HookedMarket struct returned by the market's hooks
 * instance. The struct differs by template: v2.0.0 OpenTermHooks returns 5
 * words with the minimum at index 3, FixedTermHooks 9 words with it at 4.
 */
export function minimumDepositFrom(raw: string) {
  const word = (index: number) =>
    String(BigInt(`0x${raw.slice(2 + index * 64, 2 + (index + 1) * 64)}`))
  const words = (raw.length - 2) / 64
  if (words === 5) return word(3)
  if (words === 9) return word(4)
  return undefined
}

/** Each market's minimum deposit (D03) at the cut, by market address. */
export async function readMinimumDeposits(
  rpc: ExportRpc,
  markets: MarketRef[],
  cut: CutBlock,
) {
  if (markets.length === 0) return new Map<string, string>()
  const block = toBlockHex(cut.number)
  // The hooks address is the top 160 bits of the market's hooks config.
  const hooks = (
    await rpc.batch<string>(
      markets.map(({ address }) =>
        call(address, hooksInterface.encodeFunctionData("hooks"), block),
      ),
    )
  ).map((config) => `0x${config.slice(2).padStart(64, "0").slice(0, 40)}`)
  const structs = await rpc.batch<string>(
    markets.map(({ address }, index) =>
      call(
        hooks[index],
        GET_HOOKED_MARKET + utils.hexZeroPad(address, 32).slice(2),
        block,
      ),
    ),
  )
  const deposits = new Map<string, string>()
  markets.forEach(({ address }, index) => {
    const minimum = minimumDepositFrom(structs[index])
    if (minimum !== undefined) deposits.set(address, minimum)
  })
  return deposits
}

/**
 * The closure check behind Completions verified (S33): at the block of the
 * MarketClosed event, totalAssets() >= totalDebts() and not delinquent.
 */
export async function readClosure(
  rpc: ExportRpc,
  market: MarketRef,
  closedBlock: number,
) {
  const block = toBlockHex(closedBlock)
  const [stateRaw, assetsRaw, debtsRaw] = await rpc.batch<string>([
    call(
      market.address,
      metadataInterface.encodeFunctionData("currentState"),
      block,
    ),
    call(
      market.assetAddress,
      erc20Interface.encodeFunctionData("balanceOf", [market.address]),
      block,
    ),
    call(
      market.address,
      metadataInterface.encodeFunctionData("totalDebts"),
      block,
    ),
  ])
  const state = metadataInterface.decodeFunctionResult(
    "currentState",
    stateRaw,
  )[0] as DecodedState
  const assets = big(
    erc20Interface.decodeFunctionResult("balanceOf", assetsRaw)[0],
  )
  const debts = big(
    metadataInterface.decodeFunctionResult("totalDebts", debtsRaw)[0],
  )
  return {
    block: closedBlock,
    verified: assets >= debts && !state.isDelinquent,
  }
}
