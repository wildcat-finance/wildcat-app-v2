import { normalizeScaled, toHuman } from "./format"
import {
  ETHEREUM_MAINNET_SUBGRAPH_URL,
  PLASMA_MAINNET_SUBGRAPH_URL,
  querySubgraph,
} from "./subgraph"

const SECONDS_PER_DAY = 86400
const DAYS_30 = 30
const DAYS_7 = 7
const TVL_LOOKBACK_BUFFER_DAYS = 14

export type ChainStats = {
  tvlNow: number
  tvlMonthAgo: number | null
  totalLenderFeesNow: number
  totalLenderFeesMonthAgo: number | null
  activeMarkets: number
  newMarketsLast7d: number
  aprWeightedSumByDebt: number
  totalActiveDebtUSD: number
}

type EthMarket = {
  id: string
  scaledTotalSupply: string
  scaleFactor: string
  annualInterestBips: number
  isClosed: boolean
  asset: { decimals: number; address: string }
}

type EthSnapshot = {
  markets: EthMarket[]
  tokenDailyPrices: { token: { address: string }; priceUSD: string }[]
  tokens: { address: string; isUsdStablecoin: boolean }[]
  newMarkets: { id: string }[]
  protocolStats: { totalBaseInterestAccruedUSD: string } | null
}

type EthMonthFees = {
  monthAgoFees: { totalBaseInterestAccruedUSD: string }[]
}

type EthMonthSnapshots = {
  monthAgoSnaps: {
    market: { id: string }
    scaledTotalSupply: string
    scaleFactor: string
    usdPrice: string | null
  }[]
}

export async function fetchEthereumMainnetStats(): Promise<ChainStats> {
  const now = Math.floor(Date.now() / 1000)
  const weekAgo = now - DAYS_7 * SECONDS_PER_DAY
  const monthAgo = now - DAYS_30 * SECONDS_PER_DAY
  const monthLookbackStart =
    monthAgo - TVL_LOOKBACK_BUFFER_DAYS * SECONDS_PER_DAY

  const [snap, monthFees, monthSnaps] = await Promise.all([
    querySubgraph<EthSnapshot>(
      ETHEREUM_MAINNET_SUBGRAPH_URL,
      `{
        markets(first: 1000) {
          id scaledTotalSupply scaleFactor annualInterestBips isClosed
          asset { decimals address }
        }
        tokenDailyPrices(first: 1000, orderBy: timestamp, orderDirection: desc) {
          token { address } priceUSD
        }
        tokens(first: 1000) { address isUsdStablecoin }
        newMarkets: markets(first: 1000, where: { createdAt_gte: ${weekAgo} }) {
          id
        }
        protocolStats(id: "PROTOCOL_STATS") {
          totalBaseInterestAccruedUSD
        }
      }`,
    ),
    querySubgraph<EthMonthFees>(
      ETHEREUM_MAINNET_SUBGRAPH_URL,
      `{
        monthAgoFees: protocolDailyStats_collection(
          first: 1, orderBy: startTimestamp, orderDirection: desc,
          where: { startTimestamp_lte: ${monthAgo} }
        ) {
          totalBaseInterestAccruedUSD
        }
      }`,
    ),
    querySubgraph<EthMonthSnapshots>(
      ETHEREUM_MAINNET_SUBGRAPH_URL,
      `{
        monthAgoSnaps: marketDailyStats_collection(
          first: 1000, orderBy: startTimestamp, orderDirection: desc,
          where: {
            startTimestamp_gte: ${monthLookbackStart},
            startTimestamp_lte: ${monthAgo}
          }
        ) {
          market { id }
          scaledTotalSupply scaleFactor usdPrice
        }
      }`,
    ),
  ])

  const stableAddrs = new Set<string>()
  snap.tokens.forEach((t) => {
    if (t.isUsdStablecoin) stableAddrs.add(t.address.toLowerCase())
  })
  const priceByToken = new Map<string, number>()
  snap.tokenDailyPrices.forEach((tp) => {
    const a = tp.token.address.toLowerCase()
    if (!priceByToken.has(a)) priceByToken.set(a, Number(tp.priceUSD))
  })
  stableAddrs.forEach((a) => {
    if (!priceByToken.has(a)) priceByToken.set(a, 1)
  })
  const getPrice = (address: string): number =>
    priceByToken.get(address.toLowerCase()) ?? 0

  let tvlNow = 0
  let aprWeightedSumByDebt = 0
  let activeMarkets = 0
  const assetByMarket = new Map<string, EthMarket["asset"]>()
  snap.markets.forEach((m) => {
    assetByMarket.set(m.id, m.asset)
    if (m.isClosed) return
    const debtRaw = normalizeScaled(m.scaledTotalSupply, m.scaleFactor)
    const debtUSD =
      toHuman(debtRaw, m.asset.decimals) * getPrice(m.asset.address)
    tvlNow += debtUSD
    aprWeightedSumByDebt += (m.annualInterestBips / 100) * debtUSD
    activeMarkets += 1
  })

  let tvlMonthAgo: number | null = null
  if (monthSnaps.monthAgoSnaps.length > 0) {
    const latestByMarket = new Map<
      string,
      EthMonthSnapshots["monthAgoSnaps"][number]
    >()
    monthSnaps.monthAgoSnaps.forEach((s) => {
      if (!latestByMarket.has(s.market.id)) latestByMarket.set(s.market.id, s)
    })
    let acc = 0
    latestByMarket.forEach((s, marketId) => {
      const asset = assetByMarket.get(marketId)
      if (!asset) return
      const debtRaw = normalizeScaled(s.scaledTotalSupply, s.scaleFactor)
      const tokenAmount = toHuman(debtRaw, asset.decimals)
      let price: number
      if (s.usdPrice != null) price = Number(s.usdPrice)
      else if (stableAddrs.has(asset.address.toLowerCase())) price = 1
      else price = getPrice(asset.address)
      acc += tokenAmount * price
    })
    tvlMonthAgo = acc
  }

  const totalLenderFeesNow = snap.protocolStats
    ? Number(snap.protocolStats.totalBaseInterestAccruedUSD)
    : 0
  const totalLenderFeesMonthAgo = monthFees.monthAgoFees[0]
    ? Number(monthFees.monthAgoFees[0].totalBaseInterestAccruedUSD)
    : null

  return {
    tvlNow,
    tvlMonthAgo,
    totalLenderFeesNow,
    totalLenderFeesMonthAgo,
    activeMarkets,
    newMarketsLast7d: snap.newMarkets.length,
    aprWeightedSumByDebt,
    totalActiveDebtUSD: tvlNow,
  }
}

type PlasmaMarket = {
  id: string
  scaledTotalSupply: string
  scaleFactor: string
  annualInterestBips: number
  isClosed: boolean
  totalBaseInterestAccrued: string
  asset: { symbol: string; decimals: number; address: string }
}

const isUsdPeggedSymbol = (symbol: string): boolean => /^USD/i.test(symbol)

export async function fetchPlasmaMainnetStats(): Promise<ChainStats> {
  const now = Math.floor(Date.now() / 1000)
  const weekAgo = now - DAYS_7 * SECONDS_PER_DAY

  const data = await querySubgraph<{
    markets: PlasmaMarket[]
    newMarkets: { id: string }[]
  }>(
    PLASMA_MAINNET_SUBGRAPH_URL,
    `{
      markets(first: 1000) {
        id scaledTotalSupply scaleFactor annualInterestBips isClosed
        totalBaseInterestAccrued
        asset { symbol decimals address }
      }
      newMarkets: markets(first: 1000, where: { createdAt_gte: ${weekAgo} }) {
        id
      }
    }`,
  )

  let tvlNow = 0
  let totalLenderFeesNow = 0
  let aprWeightedSumByDebt = 0
  let activeMarkets = 0

  data.markets.forEach((m) => {
    const price = isUsdPeggedSymbol(m.asset.symbol) ? 1 : 0
    const dec = m.asset.decimals

    if (!m.isClosed) {
      const debtRaw = normalizeScaled(m.scaledTotalSupply, m.scaleFactor)
      const debtUSD = toHuman(debtRaw, dec) * price
      tvlNow += debtUSD
      aprWeightedSumByDebt += (m.annualInterestBips / 100) * debtUSD
      activeMarkets += 1
    }
    totalLenderFeesNow += toHuman(m.totalBaseInterestAccrued, dec) * price
  })

  return {
    tvlNow,
    tvlMonthAgo: null,
    totalLenderFeesNow,
    totalLenderFeesMonthAgo: null,
    activeMarkets,
    newMarketsLast7d: data.newMarkets.length,
    aprWeightedSumByDebt,
    totalActiveDebtUSD: tvlNow,
  }
}

const MAINNET_CHAIN_ID = 1
const PRICE_FEED_URLS: Record<number, string> = {
  [MAINNET_CHAIN_ID]: ETHEREUM_MAINNET_SUBGRAPH_URL,
}

type TokenPricesQuery = {
  tokens: { address: string; isUsdStablecoin: boolean }[]
  tokenDailyPrices: { token: { address: string }; priceUSD: string }[]
}

export async function fetchTokenUsdPrices(
  chainId: number,
  addresses: string[],
): Promise<Record<string, number>> {
  const url = PRICE_FEED_URLS[chainId]
  if (!url || addresses.length === 0) return {}

  const normalized = Array.from(new Set(addresses.map((a) => a.toLowerCase())))
  const inList = JSON.stringify(normalized)

  const data = await querySubgraph<TokenPricesQuery>(
    url,
    `{
      tokens(first: 1000, where: { address_in: ${inList} }) {
        address isUsdStablecoin
      }
      tokenDailyPrices(
        first: 1000, orderBy: timestamp, orderDirection: desc,
        where: { token_: { address_in: ${inList} } }
      ) {
        token { address } priceUSD
      }
    }`,
  )

  const prices: Record<string, number> = {}
  data.tokens.forEach((t) => {
    if (t.isUsdStablecoin) prices[t.address.toLowerCase()] = 1
  })
  data.tokenDailyPrices.forEach((p) => {
    const a = p.token.address.toLowerCase()
    if (prices[a] !== undefined) return
    const v = Number(p.priceUSD)
    if (Number.isFinite(v)) prices[a] = v
  })
  return prices
}
