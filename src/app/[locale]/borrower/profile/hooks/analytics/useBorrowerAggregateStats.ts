import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  formatDate,
  formatElapsed,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { fetchHinterlightTokenUsdPrices } from "@/hooks/useTokenUsdPrices"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_BORROWER_PROFILE_ANALYTICS = gql`
  query getBorrowerProfileAnalytics($borrower: String!, $statsId: ID!) {
    borrowerStats(id: $statsId) {
      totalDepositedUSD
      totalBorrowedUSD
      totalRepaidUSD
      totalWithdrawalsRequestedUSD
      totalWithdrawalsExecutedUSD
      totalBaseInterestAccruedUSD
      totalDelinquencyFeesAccruedUSD
      totalProtocolFeesAccruedUSD
      numMarkets
      numActiveMarkets
      numDelinquentMarkets
      numClosedMarkets
      numBatchesExpired
      numBatchesExpiredUnpaid
      numBatchesPaidLate
    }
    markets(
      where: { borrower: $borrower }
      orderBy: createdAt
      orderDirection: asc
      first: 500
    ) {
      id
      name
      createdAt
      isClosed
      annualInterestBips
      delinquencyGracePeriod
      maxTotalSupply
      totalDebtUSD
      asset {
        address
        symbol
        decimals
      }
    }
  }
`

type BorrowerProfileAnalyticsQuery = {
  borrowerStats: {
    totalDepositedUSD: string
    totalBorrowedUSD: string
    totalRepaidUSD: string
    totalWithdrawalsRequestedUSD: string
    totalWithdrawalsExecutedUSD: string
    totalBaseInterestAccruedUSD: string
    totalDelinquencyFeesAccruedUSD: string
    totalProtocolFeesAccruedUSD: string
    numMarkets: number
    numActiveMarkets: number
    numDelinquentMarkets: number
    numClosedMarkets: number
    numBatchesExpired: number
    numBatchesExpiredUnpaid: number
    numBatchesPaidLate: number
  } | null
  markets: Array<{
    id: string
    name: string
    createdAt: number
    isClosed: boolean
    annualInterestBips: number
    delinquencyGracePeriod: number
    maxTotalSupply: string
    totalDebtUSD: string
    asset: {
      address: string
      symbol: string
      decimals: number
    }
  }>
}

const emptyAnalytics = (address: string): BorrowerProfileAnalytics => ({
  address,
  firstMarketCreated: "—",
  timeOnProtocol: "—",
  activeMarkets: 0,
  closedMarkets: 0,
  assetsUsed: [],
  totalDebt: 0,
  totalCapacity: 0,
  avgApr: 0,
  totalBorrowed: 0,
  totalRepaid: 0,
  marketIds: [],
  nameMap: {},
  gracePeriodMap: {},
  priceMap: {},
  decimalsMap: {},
})

export const useBorrowerAggregateStats = (
  borrowerAddress: `0x${string}` | undefined,
  externalChainId?: number,
) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const normalizedAddress = borrowerAddress?.toLowerCase()

  return useQuery<BorrowerProfileAnalytics>({
    queryKey: QueryKeys.Borrower.GET_PROFILE_ANALYTICS(
      chainId,
      normalizedAddress,
    ),
    enabled: !!normalizedAddress && isHinterlightSupported(chainId),
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing borrower address")

      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const result = await client.query<BorrowerProfileAnalyticsQuery>({
        query: GET_BORROWER_PROFILE_ANALYTICS,
        variables: {
          borrower: normalizedAddress,
          statsId: `BORROWER-STATS-${normalizedAddress}`,
        },
      })

      const { markets, borrowerStats } = result.data
      if (markets.length === 0) return emptyAnalytics(normalizedAddress)

      const priceMap = await fetchHinterlightTokenUsdPrices(
        chainId,
        markets.map((market) => market.asset.address),
      )

      const nameMap: Record<string, string> = {}
      const gracePeriodMap: Record<string, number> = {}
      const decimalsMap: Record<string, number> = {}
      const marketPriceMap: Record<string, number> = {}

      markets.forEach((market) => {
        nameMap[market.id] = market.name
        gracePeriodMap[market.id] = market.delinquencyGracePeriod
        decimalsMap[market.id] = market.asset.decimals
        marketPriceMap[market.id] =
          priceMap[market.asset.address.toLowerCase()] ?? 0
      })

      const activeMarkets = markets.filter((market) => !market.isClosed)

      const totalDebt = activeMarkets.reduce(
        (sum, market) => sum + Number(market.totalDebtUSD),
        0,
      )

      const totalCapacity = activeMarkets.reduce((sum, market) => {
        const capacity =
          toHumanAmount(market.maxTotalSupply, market.asset.decimals) *
          (marketPriceMap[market.id] ?? 0)
        return sum + capacity
      }, 0)

      const avgApr =
        totalDebt > 0
          ? activeMarkets.reduce((sum, market) => {
              const debt = Number(market.totalDebtUSD)
              return sum + (market.annualInterestBips / 100) * debt
            }, 0) / totalDebt
          : 0

      const earliestCreatedAt = markets[0]?.createdAt ?? 0

      return {
        address: normalizedAddress,
        firstMarketCreated: earliestCreatedAt
          ? formatDate(earliestCreatedAt)
          : "—",
        timeOnProtocol: earliestCreatedAt
          ? formatElapsed(Math.floor(Date.now() / 1000) - earliestCreatedAt)
          : "—",
        activeMarkets: activeMarkets.length,
        closedMarkets: markets.filter((market) => market.isClosed).length,
        assetsUsed: Array.from(
          new Set(markets.map((market) => market.asset.symbol)),
        ),
        totalDebt,
        totalCapacity,
        avgApr,
        totalBorrowed: Number(borrowerStats?.totalBorrowedUSD ?? 0),
        totalRepaid: Number(borrowerStats?.totalRepaidUSD ?? 0),
        marketIds: markets.map((market) => market.id),
        nameMap,
        gracePeriodMap,
        priceMap: marketPriceMap,
        decimalsMap,
      }
    },
  })
}
