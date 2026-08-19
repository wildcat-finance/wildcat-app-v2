import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { tokenAmountComparator } from "@/utils/comparators"
import { getDisplayLenderAprBips } from "@/utils/marketApr"

export type MarketAccountComparator = (
  a: MarketAccount,
  b: MarketAccount,
) => number

const byAprDesc: MarketAccountComparator = (a, b) =>
  getDisplayLenderAprBips(b.market) - getDisplayLenderAprBips(a.market)

const byWithdrawalCycleAsc: MarketAccountComparator = (a, b) =>
  a.market.withdrawalBatchDuration - b.market.withdrawalBatchDuration

const byRemainingCapacityDesc: MarketAccountComparator = (a, b) => {
  const capA = a.market.maxTotalSupply.sub(a.market.totalSupply)
  const capB = b.market.maxTotalSupply.sub(b.market.totalSupply)
  return tokenAmountComparator(capB, capA)
}

const byMarketAddressAsc: MarketAccountComparator = (a, b) =>
  a.market.address.toLowerCase().localeCompare(b.market.address.toLowerCase())

const compareChain =
  (...cmps: MarketAccountComparator[]): MarketAccountComparator =>
  (a, b) => {
    for (let i = 0; i < cmps.length; i += 1) {
      const r = cmps[i](a, b)
      if (r !== 0) return r
    }
    return 0
  }

export const compareByHighestYield = compareChain(
  byAprDesc,
  byWithdrawalCycleAsc,
  byRemainingCapacityDesc,
  byMarketAddressAsc,
)

export const compareByShortestCycle = compareChain(
  byWithdrawalCycleAsc,
  byAprDesc,
  byRemainingCapacityDesc,
  byMarketAddressAsc,
)

export const compareByCurrentAprBestInMarket = compareByHighestYield
