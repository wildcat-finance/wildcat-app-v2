import { useQuery } from "@tanstack/react-query"
import {
  getBorrowerAnalyticsProfile,
  getIndexedMarketList,
  isSupportedChainId,
  Market,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"

import { BorrowerProfileAnalytics } from "@/app/[locale]/borrower/profile/hooks/analytics/types"
import {
  formatDate,
  formatElapsed,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { fetchIndexedTokenUsdPrices } from "@/hooks/useTokenUsdPrices"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

const MARKET_PAGE_SIZE = 1_000

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
  unpricedMarketIds: [],
  decimalsMap: {},
})

export const useBorrowerAggregateStats = (
  borrowerAddress: `0x${string}` | undefined,
  externalChainId?: number,
) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const normalizedAddress = borrowerAddress?.toLowerCase()
  const { provider, signer } = useEthersProvider({ chainId })
  const signerOrProvider = signer ?? provider

  return useQuery<BorrowerProfileAnalytics>({
    queryKey: QueryKeys.Borrower.GET_PROFILE_ANALYTICS(
      chainId,
      normalizedAddress,
    ),
    enabled:
      !!normalizedAddress &&
      !!signerOrProvider &&
      isSubgraphPricingConfigured(chainId),
    refetchOnMount: false,
    refetchInterval: 60_000,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing borrower address")
      if (!isSupportedChainId(chainId) || !signerOrProvider) {
        throw new Error("Unsupported borrower analytics network")
      }

      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const getMarketPage = (skip: number) =>
        getIndexedMarketList(client, {
          chainId,
          signerOrProvider: signerOrProvider as SignerOrProvider,
          filter: { borrower: normalizedAddress },
          first: MARKET_PAGE_SIZE,
          skip,
          orderBy: "createdAt",
          direction: "asc",
          fetchPolicy: "network-only",
        })

      const getRemainingMarkets = async (skip: number): Promise<Market[]> => {
        const page = await getMarketPage(skip)
        if (page.length < MARKET_PAGE_SIZE) return page
        return [
          ...page,
          ...(await getRemainingMarkets(skip + MARKET_PAGE_SIZE)),
        ]
      }

      const [profile, firstMarketPage] = await Promise.all([
        getBorrowerAnalyticsProfile(client, {
          borrower: normalizedAddress,
          fetchPolicy: "network-only",
        }),
        getMarketPage(0),
      ])
      const markets =
        firstMarketPage.length < MARKET_PAGE_SIZE
          ? firstMarketPage
          : [
              ...firstMarketPage,
              ...(await getRemainingMarkets(MARKET_PAGE_SIZE)),
            ]

      if (markets.length === 0) return emptyAnalytics(normalizedAddress)
      const borrowerStats = profile.stats

      const { prices: priceMap, unpriced } = await fetchIndexedTokenUsdPrices(
        chainId,
        markets.map((market) => market.underlyingToken.address),
      )

      const nameMap: Record<string, string> = {}
      const gracePeriodMap: Record<string, number> = {}
      const decimalsMap: Record<string, number> = {}
      const marketPriceMap: Record<string, number> = {}
      const unpricedMarketIds: string[] = []

      markets.forEach((market) => {
        nameMap[market.address] = market.name
        gracePeriodMap[market.address] = market.delinquencyGracePeriod
        decimalsMap[market.address] = market.underlyingToken.decimals
        const tokenAddress = market.underlyingToken.address.toLowerCase()
        const price = priceMap[tokenAddress]
        if (price === undefined) {
          if (unpriced[tokenAddress]) unpricedMarketIds.push(market.address)
        } else {
          marketPriceMap[market.address] = price
        }
      })

      const activeMarkets = markets.filter((market) => !market.isClosed)
      const hasUnpricedActiveMarket = activeMarkets.some(
        (market) => marketPriceMap[market.address] === undefined,
      )

      const totalDebt = hasUnpricedActiveMarket
        ? undefined
        : activeMarkets.reduce(
            (sum, market) =>
              sum +
              toHumanAmount(
                market.totalDebts.raw,
                market.underlyingToken.decimals,
              ) *
                (marketPriceMap[market.address] as number),
            0,
          )

      const totalCapacity = hasUnpricedActiveMarket
        ? undefined
        : activeMarkets.reduce((sum, market) => {
            const capacity =
              toHumanAmount(
                market.maxTotalSupply.raw,
                market.underlyingToken.decimals,
              ) * (marketPriceMap[market.address] as number)
            return sum + capacity
          }, 0)

      let avgApr: number | undefined
      if (totalDebt === undefined) {
        avgApr = undefined
      } else if (totalDebt === 0) {
        avgApr = 0
      } else {
        avgApr =
          activeMarkets.reduce((sum, market) => {
            const debt =
              toHumanAmount(
                market.totalDebts.raw,
                market.underlyingToken.decimals,
              ) * (marketPriceMap[market.address] as number)
            return sum + (market.annualInterestBips / 100) * debt
          }, 0) / totalDebt
      }

      const earliestCreatedAt = Number(
        markets[0]?.provenance?.createdAt.blockTimestamp ?? 0,
      )

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
          new Set(markets.map((market) => market.underlyingToken.symbol)),
        ),
        totalDebt,
        totalCapacity,
        avgApr,
        totalBorrowed: Number(borrowerStats?.totalBorrowedUSD ?? 0),
        totalRepaid: Number(borrowerStats?.totalRepaidUSD ?? 0),
        marketIds: markets.map((market) => market.address),
        nameMap,
        gracePeriodMap,
        priceMap: marketPriceMap,
        unpricedMarketIds,
        decimalsMap,
      }
    },
  })
}
