import { querySubgraph, querySubgraphAll } from "./useSubgraphQuery"
import {
  type RawMarket,
  type ProtocolStats,
  type MarketSnapshot,
  type CompositionSlice,
  type DistributionBucket,
  toHuman,
  normalizeScaled,
  truncAddr,
} from "../constants"

// --- Fetch latest token prices from subgraph TokenDailyPrice ---

export async function fetchLatestTokenPrices(
  tokenAddresses: string[],
): Promise<Record<string, number>> {
  if (tokenAddresses.length === 0) return {}
  const lowerAddrs = tokenAddresses.map((a) => a.toLowerCase())
  const tokenIds = lowerAddrs.map((a) => `"TKN-${a}"`)
  const data = await querySubgraph<{
    tokenDailyPrices: {
      token: { address: string }
      priceUSD: string
    }[]
    tokens: { address: string; isUsdStablecoin: boolean }[]
  }>(`{
    tokenDailyPrices(
      first: 1000,
      orderBy: timestamp,
      orderDirection: desc,
      where: { token_in: [${tokenIds.join(",")}] }
    ) {
      token { address }
      priceUSD
    }
    tokens(where: { id_in: [${tokenIds.join(",")}] }) {
      address
      isUsdStablecoin
    }
  }`)

  const prices: Record<string, number> = {}
  // Default stablecoins to $1
  data.tokens.forEach((t) => {
    if (t.isUsdStablecoin) {
      prices[t.address.toLowerCase()] = 1
    }
  })
  // Override with actual prices (most recent first, keep first per token)
  data.tokenDailyPrices.forEach((tp) => {
    const addr = tp.token.address.toLowerCase()
    if (!(addr in prices)) {
      prices[addr] = Number(tp.priceUSD)
    }
  })
  return prices
}

// --- All markets (current snapshot) ---

function getMarketType(m: RawMarket): string {
  if (m.hooks?.kind === "OpenTerm") return "Open-term"
  if (m.hooks?.kind === "FixedTerm") return "Fixed-term"
  return "Unknown"
}

export async function fetchAllMarkets(): Promise<{
  stats: ProtocolStats
  markets: MarketSnapshot[]
  byAsset: CompositionSlice[]
  byBorrower: CompositionSlice[]
}> {
  const raw = await querySubgraph<{ markets: RawMarket[] }>(`{
    markets(first: 1000, orderBy: scaledTotalSupply, orderDirection: desc) {
      id name borrower
      asset { symbol decimals address }
      hooks { kind }
      annualInterestBips reserveRatioBips delinquencyFeeBips delinquencyGracePeriod
      maxTotalSupply scaledTotalSupply scaleFactor
      isDelinquent isIncurringPenalties isClosed
      totalBorrowed totalRepaid
      totalBaseInterestAccrued totalDelinquencyFeesAccrued totalProtocolFeesAccrued
      createdAt
    }
  }`)

  const lenderData = await querySubgraph<{
    lenderAccounts: { address: string }[]
  }>(`{
    lenderAccounts(first: 1000, where: { scaledBalance_gt: "0" }) { address }
  }`)
  const uniqueLenders = new Set(lenderData.lenderAccounts.map((l) => l.address))
    .size

  const uniqueAssets = [
    ...new Set(raw.markets.map((m) => m.asset.address.toLowerCase())),
  ]
  const prices = await fetchLatestTokenPrices(uniqueAssets)
  const getPrice = (address: string): number =>
    prices[address.toLowerCase()] ?? 0

  const snapshots: MarketSnapshot[] = []
  let tvl = 0
  let totalProtocolFees = 0
  let totalLenderInterest = 0
  let totalDelinquencyFees = 0
  let healthy = 0
  let delinquent = 0
  let penalty = 0
  let closed = 0
  let openTerm = 0
  let fixedTerm = 0
  let aprWeightedSum = 0
  const borrowerSet = new Set<string>()
  const assetMap = new Map<string, number>()
  const borrowerMap = new Map<string, number>()

  raw.markets.forEach((m) => {
    const dec = m.asset.decimals
    const price = getPrice(m.asset.address)
    const debtRaw = normalizeScaled(m.scaledTotalSupply, m.scaleFactor)
    const debt = toHuman(debtRaw, dec)
    const capacity = toHuman(m.maxTotalSupply, dec)
    const debtUSD = debt * price
    const capacityUSD = capacity * price
    const apr = m.annualInterestBips / 100
    const pfUSD = toHuman(m.totalProtocolFeesAccrued, dec) * price
    const liUSD = toHuman(m.totalBaseInterestAccrued, dec) * price
    const dfUSD = toHuman(m.totalDelinquencyFeesAccrued, dec) * price
    const mt = getMarketType(m)

    snapshots.push({
      id: m.id,
      name: m.name,
      borrower: m.borrower,
      assetSymbol: m.asset.symbol,
      assetAddress: m.asset.address,
      assetDecimals: dec,
      debt: debtUSD,
      capacity: capacityUSD,
      apr,
      utilization: capacity > 0 ? (debt / capacity) * 100 : 0,
      isDelinquent: m.isDelinquent,
      isIncurringPenalties: m.isIncurringPenalties,
      isClosed: m.isClosed,
      marketType: mt,
      protocolFees: pfUSD,
      lenderInterest: liUSD,
    })

    if (m.isClosed) {
      closed += 1
    } else {
      tvl += debtUSD
      aprWeightedSum += apr * debtUSD
      if (m.isIncurringPenalties) penalty += 1
      else if (m.isDelinquent) delinquent += 1
      else healthy += 1
    }

    totalProtocolFees += pfUSD
    totalLenderInterest += liUSD
    totalDelinquencyFees += dfUSD
    borrowerSet.add(m.borrower)
    if (mt === "Open-term") openTerm += 1
    else if (mt === "Fixed-term") fixedTerm += 1

    if (debtUSD > 0.01) {
      assetMap.set(
        m.asset.symbol,
        (assetMap.get(m.asset.symbol) || 0) + debtUSD,
      )
      const bLabel = m.name.split(" ")[0] || truncAddr(m.borrower)
      borrowerMap.set(bLabel, (borrowerMap.get(bLabel) || 0) + debtUSD)
    }
  })

  const toSlices = (map: Map<string, number>): CompositionSlice[] => {
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1])
    const total = entries.reduce((s, [, v]) => s + v, 0)
    const top = entries.slice(0, 8)
    const other = entries.slice(8).reduce((s, [, v]) => s + v, 0)
    const slices = top.map(([name, value]) => ({
      name,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
    }))
    if (other > 0.01)
      slices.push({ name: "Other", value: other, pct: (other / total) * 100 })
    return slices
  }

  return {
    stats: {
      tvl,
      activeMarkets: healthy + delinquent + penalty,
      healthyMarkets: healthy,
      delinquentMarkets: delinquent,
      penaltyMarkets: penalty,
      closedMarkets: closed,
      totalBorrowers: borrowerSet.size,
      totalLenders: uniqueLenders,
      openTermCount: openTerm,
      fixedTermCount: fixedTerm,
      avgAPRWeighted: tvl > 0 ? aprWeightedSum / tvl : 0,
      totalProtocolFees,
      totalLenderInterest,
      totalDelinquencyFees,
    },
    markets: snapshots,
    byAsset: toSlices(assetMap),
    byBorrower: toSlices(borrowerMap),
  }
}

// --- Distribution data (derived from market snapshots) ---

export function computeDistributions(markets: MarketSnapshot[]): {
  aprDist: DistributionBucket[]
  utilDist: DistributionBucket[]
} {
  const active = markets.filter((m) => !m.isClosed && m.debt > 0.01)

  const aprBuckets = new Map<string, number>()
  const aprRanges = [
    "0-2%",
    "2-4%",
    "4-6%",
    "6-8%",
    "8-10%",
    "10-12%",
    "12-15%",
    "15%+",
  ]
  const aprThresholds = [2, 4, 6, 8, 10, 12, 15, Infinity]
  aprRanges.forEach((r) => aprBuckets.set(r, 0))
  active.forEach((m) => {
    const idx = aprThresholds.findIndex((t) => m.apr < t)
    if (idx >= 0) {
      aprBuckets.set(
        aprRanges[idx],
        (aprBuckets.get(aprRanges[idx]) || 0) + m.debt,
      )
    }
  })

  const utilBuckets = new Map<string, number>()
  const utilRanges = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"]
  const utilThresholds = [20, 40, 60, 80, 101]
  utilRanges.forEach((r) => utilBuckets.set(r, 0))
  active.forEach((m) => {
    const idx = utilThresholds.findIndex((t) => m.utilization < t)
    if (idx >= 0) {
      utilBuckets.set(
        utilRanges[idx],
        (utilBuckets.get(utilRanges[idx]) || 0) + m.debt,
      )
    }
  })

  return {
    aprDist: aprRanges.map((range) => ({
      range,
      count: aprBuckets.get(range) || 0,
    })),
    utilDist: utilRanges.map((range) => ({
      range,
      count: utilBuckets.get(range) || 0,
    })),
  }
}

// --- Growth metrics (30d) ---

export async function fetchGrowthMetrics(): Promise<{
  newMarkets30d: number
  newLenders30d: number
  crossPollination: number
  revenueConcentration: number
}> {
  const now = Math.floor(Date.now() / 1000)
  const thirtyDaysAgo = now - 30 * 86400

  const [recentMarkets, recentLenders, allLenders, allMarkets] =
    await Promise.all([
      querySubgraph<{ markets: { id: string }[] }>(`{
      markets(where: { createdAt_gte: ${thirtyDaysAgo} }) { id }
    }`).then((d) => d.markets),
      querySubgraph<{ lenderAccounts: { address: string }[] }>(`{
      lenderAccounts(first: 1000, where: { addedTimestamp_gte: ${thirtyDaysAgo}, scaledBalance_gt: "0" }) { address }
    }`).then((d) => d.lenderAccounts),
      querySubgraphAll<{ address: string; market: { borrower: string } }>(
        (skip) =>
          `{ lenderAccounts(first: 1000, skip: ${skip}, where: { scaledBalance_gt: "0" }) { address market { borrower } } }`,
        "lenderAccounts",
      ),
      querySubgraph<{
        markets: {
          borrower: string
          totalProtocolFeesAccrued: string
          asset: { decimals: number; address: string }
        }[]
      }>(`{
      markets(first: 1000) { borrower totalProtocolFeesAccrued asset { decimals address } }
    }`).then((d) => d.markets),
    ])

  const lenderBorrowers = new Map<string, Set<string>>()
  allLenders.forEach((la) => {
    const s = lenderBorrowers.get(la.address) || new Set()
    s.add(la.market.borrower)
    lenderBorrowers.set(la.address, s)
  })
  const totalActive = lenderBorrowers.size
  const multiBook = [...lenderBorrowers.values()].filter(
    (s) => s.size >= 2,
  ).length

  const feeAssets = [
    ...new Set(allMarkets.map((m) => m.asset.address.toLowerCase())),
  ]
  const feePrices = await fetchLatestTokenPrices(feeAssets)
  const getFeePrice = (address: string): number =>
    feePrices[address.toLowerCase()] ?? 0

  const borrowerFees = new Map<string, number>()
  let totalFees = 0
  allMarkets.forEach((m) => {
    const f =
      toHuman(m.totalProtocolFeesAccrued, m.asset.decimals) *
      getFeePrice(m.asset.address)
    borrowerFees.set(m.borrower, (borrowerFees.get(m.borrower) || 0) + f)
    totalFees += f
  })
  const sortedFees = [...borrowerFees.values()].sort((a, b) => b - a)
  const top3 = sortedFees.slice(0, 3).reduce((s, v) => s + v, 0)

  return {
    newMarkets30d: recentMarkets.length,
    newLenders30d: new Set(recentLenders.map((l) => l.address)).size,
    crossPollination:
      totalActive > 0 ? Math.round((multiBook / totalActive) * 100) : 0,
    revenueConcentration:
      totalFees > 0 ? Math.round((top3 / totalFees) * 100) : 0,
  }
}
