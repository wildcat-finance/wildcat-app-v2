import { ChainStats } from "./queries"

export type LandingStats = {
  tvl: number
  tvlChangePct30d: number | null
  avgAprWeighted: number
  totalLenderFees: number
  lenderFeesChange30dAbs: number | null
  activeMarkets: number
  newMarkets7d: number
}

export function aggregateChainStats(chains: ChainStats[]): LandingStats {
  let tvl = 0
  let totalLenderFees = 0
  let activeMarkets = 0
  let newMarkets7d = 0
  let aprWeightedSum = 0
  let aprDenom = 0

  // Chains without historical fields (e.g. Plasma) carry their CURRENT value
  // into the "month ago" bucket so they contribute equally to numerator and
  // denominator — net effect: those chains nudge the absolute total but don't
  // distort the protocol-wide delta percentage.
  let tvlNowScope = 0
  let tvlMonthAgoScope = 0
  let feesNowScope = 0
  let feesMonthAgoScope = 0
  let anyTvlMonth = false
  let anyFeesMonth = false

  chains.forEach((c) => {
    tvl += c.tvlNow
    totalLenderFees += c.totalLenderFeesNow
    activeMarkets += c.activeMarkets
    newMarkets7d += c.newMarketsLast7d
    aprWeightedSum += c.aprWeightedSumByDebt
    aprDenom += c.totalActiveDebtUSD

    tvlNowScope += c.tvlNow
    if (c.tvlMonthAgo !== null) {
      anyTvlMonth = true
      tvlMonthAgoScope += c.tvlMonthAgo
    } else {
      tvlMonthAgoScope += c.tvlNow
    }

    feesNowScope += c.totalLenderFeesNow
    if (c.totalLenderFeesMonthAgo !== null) {
      anyFeesMonth = true
      feesMonthAgoScope += c.totalLenderFeesMonthAgo
    } else {
      feesMonthAgoScope += c.totalLenderFeesNow
    }
  })

  return {
    tvl,
    tvlChangePct30d:
      anyTvlMonth && tvlMonthAgoScope > 0
        ? (tvlNowScope / tvlMonthAgoScope - 1) * 100
        : null,
    avgAprWeighted: aprDenom > 0 ? aprWeightedSum / aprDenom : 0,
    totalLenderFees,
    lenderFeesChange30dAbs: anyFeesMonth
      ? feesNowScope - feesMonthAgoScope
      : null,
    activeMarkets,
    newMarkets7d,
  }
}
