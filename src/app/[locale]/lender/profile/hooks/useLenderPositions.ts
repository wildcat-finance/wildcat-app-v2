import { gql } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

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
import { fetchHinterlightTokenUsdPrices } from "@/hooks/useTokenUsdPrices"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const GET_LENDER_PROFILE_POSITIONS = gql`
  query getLenderProfilePositions($address: String!, $statsId: ID!) {
    lenderStats(id: $statsId) {
      firstSeenTimestamp
      totalDepositedUSD
      totalWithdrawalsRequestedUSD
      totalWithdrawalsExecutedUSD
      totalInterestEarnedUSD
      numMarkets
      numActiveMarkets
    }
    lenderAccounts(
      where: { address: $address }
      orderBy: scaledBalance
      orderDirection: desc
      first: 500
    ) {
      market {
        id
        name
        borrower
        annualInterestBips
        maxTotalSupply
        scaledTotalSupply
        scaleFactor
        isDelinquent
        isIncurringPenalties
        isClosed
        asset {
          address
          symbol
          decimals
        }
      }
      scaledBalance
      totalDeposited
      totalInterestEarned
      lastScaleFactor
      addedTimestamp
    }
  }
`

type LenderProfilePositionsQuery = {
  lenderStats: {
    firstSeenTimestamp: number
    totalDepositedUSD: string
    totalWithdrawalsRequestedUSD: string
    totalWithdrawalsExecutedUSD: string
    totalInterestEarnedUSD: string
    numMarkets: number
    numActiveMarkets: number
  } | null
  lenderAccounts: Array<{
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
  }>
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

const getLiveInterestEarned = (account: {
  scaledBalance: string
  totalInterestEarned: string
  lastScaleFactor: string
  market: {
    scaleFactor: string
  }
}) => {
  const indexedInterest = BigInt(account.totalInterestEarned)
  const scaledBalance = BigInt(account.scaledBalance)
  const lastScaleFactor = BigInt(account.lastScaleFactor)
  const currentScaleFactor = BigInt(account.market.scaleFactor)

  if (scaledBalance === BigInt(0) || currentScaleFactor <= lastScaleFactor) {
    return indexedInterest
  }

  const previousBalance = normalizeScaledAmount(
    account.scaledBalance,
    account.lastScaleFactor,
  )
  const currentBalance = normalizeScaledAmount(
    account.scaledBalance,
    account.market.scaleFactor,
  )

  return indexedInterest + (currentBalance - previousBalance)
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
    enabled: !!normalizedAddress && isHinterlightSupported(chainId),
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const result = await client.query<LenderProfilePositionsQuery>({
        query: GET_LENDER_PROFILE_POSITIONS,
        variables: {
          address: normalizedAddress,
          statsId: `LENDER-STATS-${normalizedAddress}`,
        },
      })

      const { lenderAccounts, lenderStats } = result.data
      if (lenderAccounts.length === 0) return emptyPositions(normalizedAddress)

      const tokenPrices = await fetchHinterlightTokenUsdPrices(
        chainId,
        lenderAccounts.map((account) => account.market.asset.address),
      )

      const priceMap: Record<string, number> = {}
      const decimalsMap: Record<string, number> = {}

      lenderAccounts.forEach((account) => {
        priceMap[account.market.id] =
          tokenPrices[account.market.asset.address.toLowerCase()] ?? 0
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

      const totalDeposited = lenderStats
        ? Number(lenderStats.totalDepositedUSD)
        : clientTotalDeposited
      const totalInterestEarned = clientInterestEarned

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
