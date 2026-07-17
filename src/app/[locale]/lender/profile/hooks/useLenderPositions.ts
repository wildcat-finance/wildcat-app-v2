import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getLenderAnalyticsProfile,
  getLenderPositionPage,
  rayMul,
} from "@wildcatfi/wildcat-sdk"

import {
  LenderPositionRow,
  LenderPositionsData,
} from "@/app/[locale]/lender/profile/hooks/types"
import {
  formatDate,
  formatElapsed,
  normalizeScaledAmount,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { fetchIndexedTokenUsdPrices } from "@/hooks/useTokenUsdPrices"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

type LenderPositionRaw = {
  market: {
    id: string
    name: string
    borrower: string
    annualInterestBips: number
    maxTotalSupply: string
    scaledTotalSupply: string
    scaleFactor: string
    isDelinquent: boolean
    isIncurringPenalties: boolean
    isClosed: boolean
    asset: {
      address: string
      symbol: string
      decimals: number
    }
  }
  scaledBalance: string
  totalDeposited: string
  totalInterestEarned: string
  lastScaleFactor: string
  addedTimestamp: number
}

const getPositionStatus = (
  isClosed: boolean,
  isIncurringPenalties: boolean,
  isDelinquent: boolean,
): LenderPositionRow["status"] => {
  if (isClosed) return "Closed"
  if (isIncurringPenalties) return "Penalty"
  if (isDelinquent) return "Delinquent"
  return "Active"
}

// Mirrors @wildcatfi/wildcat-sdk MarketAccount.processInterestAccrued: takes the
// subgraph-indexed totalInterestEarned and adds the accrual implied by the
// market's current scaleFactor vs the lender's lastScaleFactor. Delegates the
// scaleFactor multiplication to the SDK's rayMul so the math has one source of
// truth (including HALF_RAY rounding, which the JS BigInt version omitted).
const getLiveInterestEarned = (account: {
  scaledBalance: string
  totalInterestEarned: string
  lastScaleFactor: string
  market: { scaleFactor: string }
}): string => {
  const scaledBalance = BigInt(account.scaledBalance)
  const lastScaleFactor = BigInt(account.lastScaleFactor)
  const currentScaleFactor = BigInt(account.market.scaleFactor)
  const indexedInterest = BigInt(account.totalInterestEarned)

  if (scaledBalance === BigInt(0) || currentScaleFactor <= lastScaleFactor) {
    return indexedInterest.toString()
  }

  const previousBalance = rayMul(scaledBalance, lastScaleFactor)
  const currentBalance = rayMul(scaledBalance, currentScaleFactor)
  return (indexedInterest + (currentBalance - previousBalance)).toString()
}

const emptyPositions = (address: string): LenderPositionsData => ({
  profile: {
    address,
    firstDeposit: "—",
    timeOnProtocol: "—",
    activePositions: 0,
    totalPositions: 0,
    assetsUsed: [],
    totalBalance: 0,
    totalDeposited: 0,
    totalInterestEarned: 0,
    effectiveYield: 0,
  },
  positions: [],
  marketIds: [],
  decimalsMap: {},
  priceMap: {},
})

export const useLenderPositions = (
  lenderAddress: `0x${string}` | undefined,
) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = lenderAddress?.toLowerCase()

  return useQuery<LenderPositionsData>({
    queryKey: QueryKeys.Lender.GET_PROFILE_POSITIONS(
      chainId,
      normalizedAddress,
    ),
    enabled: !!normalizedAddress && isSubgraphPricingConfigured(chainId),
    refetchOnMount: false,
    refetchInterval: 60_000,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const [profile, indexedPositions] = await Promise.all([
        getLenderAnalyticsProfile(client, {
          lender: normalizedAddress,
          fetchPolicy: "network-only",
        }),
        collectIndexedPages(
          (request) =>
            getLenderPositionPage(client, {
              lender: normalizedAddress,
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
      ])
      const lenderAccounts: LenderPositionRaw[] = indexedPositions.map(
        (account) => ({
          market: {
            id: account.market.address,
            name: account.market.name,
            borrower: account.market.borrower,
            annualInterestBips: account.market.annualInterestBips,
            maxTotalSupply: account.market.maxTotalSupply.toString(),
            scaledTotalSupply: account.market.scaledTotalSupply.toString(),
            scaleFactor: account.market.scaleFactor.toString(),
            isDelinquent: account.market.isDelinquent,
            isIncurringPenalties: account.market.isIncurringPenalties,
            isClosed: account.market.isClosed,
            asset: {
              address: account.market.asset.address,
              symbol: account.market.asset.symbol,
              decimals: account.market.asset.decimals,
            },
          },
          scaledBalance: account.scaledBalance.toString(),
          totalDeposited: account.totalDeposited.toString(),
          totalInterestEarned: account.totalInterestEarned.toString(),
          lastScaleFactor: account.lastScaleFactor.toString(),
          addedTimestamp: account.addedTimestamp,
        }),
      )

      if (lenderAccounts.length === 0) return emptyPositions(normalizedAddress)
      const lenderStats = profile.stats

      const { prices: tokenPrices } = await fetchIndexedTokenUsdPrices(
        chainId,
        lenderAccounts.map((account) => account.market.asset.address),
      )

      const priceMap: Record<string, number> = {}
      const decimalsMap: Record<string, number> = {}

      lenderAccounts.forEach((account) => {
        const price = tokenPrices[account.market.asset.address.toLowerCase()]
        if (price === undefined) {
          throw new Error(`Missing USD price for market ${account.market.id}`)
        }
        priceMap[account.market.id] = price
        decimalsMap[account.market.id] = account.market.asset.decimals
      })

      const positions = lenderAccounts.map<LenderPositionRow>((account) => {
        const price = priceMap[account.market.id] ?? 0
        const currentTokenBalance = toHumanAmount(
          normalizeScaledAmount(
            account.scaledBalance,
            account.market.scaleFactor,
          ),
          account.market.asset.decimals,
        )
        const currentBalance = currentTokenBalance * price
        const totalDeposited =
          toHumanAmount(account.totalDeposited, account.market.asset.decimals) *
          price
        const interestEarned =
          toHumanAmount(
            getLiveInterestEarned(account),
            account.market.asset.decimals,
          ) * price
        const totalSupply =
          toHumanAmount(
            normalizeScaledAmount(
              account.market.scaledTotalSupply,
              account.market.scaleFactor,
            ),
            account.market.asset.decimals,
          ) * price
        const capacity =
          toHumanAmount(
            account.market.maxTotalSupply,
            account.market.asset.decimals,
          ) * price

        return {
          id: account.market.id,
          marketId: account.market.id,
          marketName: account.market.name,
          borrower: account.market.borrower,
          asset: account.market.asset.symbol,
          currentBalance,
          currentTokenBalance,
          totalDeposited,
          interestEarned,
          apr: account.market.annualInterestBips / 100,
          utilization: capacity > 0 ? (totalSupply / capacity) * 100 : 0,
          status: getPositionStatus(
            account.market.isClosed,
            account.market.isIncurringPenalties,
            account.market.isDelinquent,
          ),
          addedDate: formatDate(account.addedTimestamp),
        }
      })

      const derivedBalance = positions.reduce(
        (sum, position) => sum + position.currentBalance,
        0,
      )
      const clientTotalDeposited = positions.reduce(
        (sum, position) => sum + position.totalDeposited,
        0,
      )
      const clientInterestEarned = positions.reduce(
        (sum, position) => sum + position.interestEarned,
        0,
      )

      // Aggregates use the subgraph's priced-at-time USD values so the header
      // totals share the same price basis (totalDeposited had this behaviour
      // already; totalInterestEarned used current price and could disagree on
      // volatile assets). Per-row interest stays at current price because the
      // subgraph does not expose per-LenderAccount USD aggregates.
      const totalDeposited = lenderStats
        ? Number(lenderStats.totalDepositedUSD)
        : clientTotalDeposited
      const totalInterestEarned = lenderStats
        ? Number(lenderStats.totalInterestEarnedUSD)
        : clientInterestEarned

      const firstSeenTimestamp =
        lenderStats?.firstSeenTimestamp ??
        Math.min(...lenderAccounts.map((account) => account.addedTimestamp))

      return {
        profile: {
          address: normalizedAddress,
          firstDeposit: firstSeenTimestamp
            ? formatDate(firstSeenTimestamp)
            : "—",
          timeOnProtocol: firstSeenTimestamp
            ? formatElapsed(Math.floor(Date.now() / 1000) - firstSeenTimestamp)
            : "—",
          activePositions: positions.filter(
            (position) =>
              position.currentBalance > 0 && position.status !== "Closed",
          ).length,
          totalPositions: positions.length,
          assetsUsed: Array.from(
            new Set(positions.map((position) => position.asset)),
          ),
          totalBalance: derivedBalance,
          totalDeposited,
          totalInterestEarned,
          effectiveYield:
            totalDeposited > 0
              ? (totalInterestEarned / totalDeposited) * 100
              : 0,
        },
        positions,
        marketIds: positions.map((position) => position.marketId),
        decimalsMap,
        priceMap,
      }
    },
  })
}
