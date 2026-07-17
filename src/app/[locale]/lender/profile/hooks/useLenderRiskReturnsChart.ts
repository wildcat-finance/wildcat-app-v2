import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getDelinquencyStatusChangePage,
  getIndexedMarket,
  getLenderDepositPage,
  getLenderTransferPage,
  getLenderWithdrawalExecutionPage,
  getLenderWithdrawalRequestPage,
  getMarketDailyStatsPage,
  hydrateMarketsLive,
  isSupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { LenderRiskReturnsPoint } from "@/app/[locale]/lender/profile/hooks/types"
import {
  formatDateLabel,
  formatShortDate,
  normalizeScaledAmount,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import {
  getConfiguredSubgraphClient,
  isSubgraphPricingConfigured,
} from "@/lib/subgraphCapabilities"

const DAY_SECONDS = 86_400
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

type MarketDailyStatRaw = {
  startTimestamp: number
  scaledTotalSupply: string
  scaleFactor: string
  usdPrice: string | null
  dayWithdrawalsRequested: string
  market: {
    id: string
    asset: {
      decimals: number
    }
  }
}

type DepositRaw = {
  assetAmount: string
  scaledAmount: string
  blockTimestamp: number
}

type WithdrawalRequestRaw = {
  scaledAmount: string
  normalizedAmount: string
  blockTimestamp: number
}

type WithdrawalExecutionRaw = {
  normalizedAmount: string
  blockTimestamp: number
}

type TransferInRaw = {
  from: { address: string }
  scaledAmount: string
  blockTimestamp: number
}

type TransferOutRaw = {
  to: { address: string }
  scaledAmount: string
  blockTimestamp: number
}

type DelinquencyStatusChangedRaw = {
  isDelinquent: boolean
  blockTimestamp: number
}

type MarketLiveStateRaw = {
  scaleFactor: string
  asset: { decimals: number }
}

type DelinquencyMarkArea = {
  startTimestamp: number
  endTimestamp: number
}

type RiskReturnsData = {
  points: LenderRiskReturnsPoint[]
  delinquencyPeriods: DelinquencyMarkArea[]
}

type DayBucket = {
  deposits: DepositRaw[]
  withdrawalRequests: WithdrawalRequestRaw[]
  withdrawalExecutions: WithdrawalExecutionRaw[]
  transfersIn: TransferInRaw[]
  transfersOut: TransferOutRaw[]
}

const toDayStart = (timestamp: number) =>
  Math.floor(timestamp / DAY_SECONDS) * DAY_SECONDS

const isZeroAddress = (address: string) =>
  address.toLowerCase() === ZERO_ADDRESS

const buildDelinquencyPeriods = (
  events: DelinquencyStatusChangedRaw[],
): DelinquencyMarkArea[] => {
  const periods: DelinquencyMarkArea[] = []
  let openStart: number | null = null

  events
    .slice()
    .sort((left, right) => left.blockTimestamp - right.blockTimestamp)
    .forEach((event) => {
      if (event.isDelinquent) {
        if (openStart === null) openStart = event.blockTimestamp
        return
      }

      if (openStart !== null) {
        periods.push({
          startTimestamp: openStart,
          endTimestamp: event.blockTimestamp,
        })
        openStart = null
      }
    })

  if (openStart !== null) {
    periods.push({
      startTimestamp: openStart,
      endTimestamp: Math.floor(Date.now() / 1000),
    })
  }

  return periods
}

const buildRiskReturnsData = ({
  marketDailyStats,
  marketLiveState,
  deposits,
  withdrawalRequests,
  withdrawalExecutions,
  transfersIn,
  transfersOut,
  delinquencyEvents,
  fallbackPrice,
}: {
  marketDailyStats: MarketDailyStatRaw[]
  marketLiveState: MarketLiveStateRaw | null
  deposits: DepositRaw[]
  withdrawalRequests: WithdrawalRequestRaw[]
  withdrawalExecutions: WithdrawalExecutionRaw[]
  transfersIn: TransferInRaw[]
  transfersOut: TransferOutRaw[]
  delinquencyEvents: DelinquencyStatusChangedRaw[]
  fallbackPrice: number
}): RiskReturnsData => {
  const sortedStats = [...marketDailyStats].sort(
    (left, right) => left.startTimestamp - right.startTimestamp,
  )
  const fallbackDecimals =
    sortedStats[0]?.market.asset.decimals ??
    marketLiveState?.asset.decimals ??
    18

  const statsByDay = new Map<number, MarketDailyStatRaw>()
  sortedStats.forEach((stat) => {
    statsByDay.set(toDayStart(stat.startTimestamp), stat)
  })

  const lastStatsDayStart =
    sortedStats.length > 0
      ? toDayStart(sortedStats[sortedStats.length - 1].startTimestamp)
      : -Infinity

  const filteredTransfersIn = transfersIn.filter(
    (event) => !isZeroAddress(event.from.address),
  )
  const filteredTransfersOut = transfersOut.filter(
    (event) => !isZeroAddress(event.to.address),
  )

  const lenderEventTimestamps: number[] = [
    ...deposits.map((event) => event.blockTimestamp),
    ...withdrawalRequests.map((event) => event.blockTimestamp),
    ...withdrawalExecutions.map((event) => event.blockTimestamp),
    ...filteredTransfersIn.map((event) => event.blockTimestamp),
    ...filteredTransfersOut.map((event) => event.blockTimestamp),
  ]

  const delinquencyPeriods = buildDelinquencyPeriods(delinquencyEvents)

  if (lenderEventTimestamps.length === 0) {
    return { points: [], delinquencyPeriods }
  }

  const startDay = toDayStart(Math.min(...lenderEventTimestamps))
  const endDay = toDayStart(
    Math.max(
      ...lenderEventTimestamps,
      ...sortedStats.map((stat) => stat.startTimestamp),
      Math.floor(Date.now() / 1000),
    ),
  )

  const buckets = new Map<number, DayBucket>()
  const getBucket = (timestamp: number): DayBucket => {
    const day = toDayStart(timestamp)
    const existing = buckets.get(day)
    if (existing) return existing
    const next: DayBucket = {
      deposits: [],
      withdrawalRequests: [],
      withdrawalExecutions: [],
      transfersIn: [],
      transfersOut: [],
    }
    buckets.set(day, next)
    return next
  }

  deposits.forEach((event) =>
    getBucket(event.blockTimestamp).deposits.push(event),
  )
  withdrawalRequests.forEach((event) =>
    getBucket(event.blockTimestamp).withdrawalRequests.push(event),
  )
  withdrawalExecutions.forEach((event) =>
    getBucket(event.blockTimestamp).withdrawalExecutions.push(event),
  )
  filteredTransfersIn.forEach((event) =>
    getBucket(event.blockTimestamp).transfersIn.push(event),
  )
  filteredTransfersOut.forEach((event) =>
    getBucket(event.blockTimestamp).transfersOut.push(event),
  )

  const points: LenderRiskReturnsPoint[] = []
  let activeScaled = BigInt(0)
  let pendingNormalized = BigInt(0)
  let cumulativePrincipalInUsd = 0
  let lastKnownState: MarketDailyStatRaw | undefined

  for (let day = startDay; day <= endDay; day += DAY_SECONDS) {
    const todayStats = statsByDay.get(day)
    if (todayStats) lastKnownState = todayStats

    const decimals = lastKnownState?.market.asset.decimals ?? fallbackDecimals
    const dayPrice = lastKnownState?.usdPrice
      ? Number(lastKnownState.usdPrice)
      : fallbackPrice
    const useLiveScaleFactor = !!marketLiveState && day > lastStatsDayStart
    const scaleFactor = useLiveScaleFactor
      ? marketLiveState.scaleFactor
      : lastKnownState?.scaleFactor ?? "0"

    const bucket = buckets.get(day)
    let depositsTodayUsd = 0
    let lenderWithdrawalRequestsTodayUsd = 0

    if (bucket) {
      for (let index = 0; index < bucket.deposits.length; index += 1) {
        const event = bucket.deposits[index]
        activeScaled += BigInt(event.scaledAmount)
        const usd = toHumanAmount(event.assetAmount, decimals) * dayPrice
        cumulativePrincipalInUsd += usd
        depositsTodayUsd += usd
      }

      for (
        let index = 0;
        index < bucket.withdrawalRequests.length;
        index += 1
      ) {
        const event = bucket.withdrawalRequests[index]
        const scaled = BigInt(event.scaledAmount)
        activeScaled = activeScaled > scaled ? activeScaled - scaled : BigInt(0)
        pendingNormalized += BigInt(event.normalizedAmount)
        lenderWithdrawalRequestsTodayUsd +=
          toHumanAmount(event.normalizedAmount, decimals) * dayPrice
      }

      for (
        let index = 0;
        index < bucket.withdrawalExecutions.length;
        index += 1
      ) {
        const event = bucket.withdrawalExecutions[index]
        const normalized = BigInt(event.normalizedAmount)
        pendingNormalized =
          pendingNormalized > normalized
            ? pendingNormalized - normalized
            : BigInt(0)
        cumulativePrincipalInUsd -=
          toHumanAmount(event.normalizedAmount, decimals) * dayPrice
      }

      for (let index = 0; index < bucket.transfersIn.length; index += 1) {
        const event = bucket.transfersIn[index]
        activeScaled += BigInt(event.scaledAmount)
        if (scaleFactor !== "0") {
          const normalized = normalizeScaledAmount(
            event.scaledAmount,
            scaleFactor,
          )
          cumulativePrincipalInUsd +=
            toHumanAmount(normalized, decimals) * dayPrice
        }
      }

      for (let index = 0; index < bucket.transfersOut.length; index += 1) {
        const event = bucket.transfersOut[index]
        const scaled = BigInt(event.scaledAmount)
        activeScaled = activeScaled > scaled ? activeScaled - scaled : BigInt(0)
        if (scaleFactor !== "0") {
          const normalized = normalizeScaledAmount(
            event.scaledAmount,
            scaleFactor,
          )
          cumulativePrincipalInUsd -=
            toHumanAmount(normalized, decimals) * dayPrice
        }
      }
    }

    let walletValueUsd = 0
    if (scaleFactor !== "0" && activeScaled > BigInt(0)) {
      const activeNormalized = normalizeScaledAmount(
        activeScaled.toString(),
        scaleFactor,
      )
      walletValueUsd += toHumanAmount(activeNormalized, decimals) * dayPrice
    }
    if (pendingNormalized > BigInt(0)) {
      walletValueUsd += toHumanAmount(pendingNormalized, decimals) * dayPrice
    }

    const cumulativeInterestUsd = walletValueUsd - cumulativePrincipalInUsd

    const marketWithdrawalsUsd = todayStats
      ? toHumanAmount(todayStats.dayWithdrawalsRequested, decimals) * dayPrice
      : 0
    const otherWithdrawalsUsd = Math.max(
      0,
      marketWithdrawalsUsd - lenderWithdrawalRequestsTodayUsd,
    )
    const lenderWithdrawalSharePct =
      marketWithdrawalsUsd > 0
        ? (lenderWithdrawalRequestsTodayUsd / marketWithdrawalsUsd) * 100
        : 0

    points.push({
      date: formatDateLabel(day),
      dateShort: formatShortDate(day),
      timestamp: day,
      cumulativeInterestUsd,
      depositsUsd: depositsTodayUsd,
      cumulativeNetDepositsUsd: Math.max(0, cumulativePrincipalInUsd),
      lenderWithdrawalsUsd: lenderWithdrawalRequestsTodayUsd,
      otherWithdrawalsUsd,
      marketWithdrawalsUsd,
      lenderWithdrawalSharePct,
    })
  }

  return { points, delinquencyPeriods }
}

export const useLenderRiskReturnsChart = ({
  lenderAddress,
  marketId,
  priceMap,
}: {
  lenderAddress: `0x${string}` | undefined
  marketId: string | undefined
  priceMap: Record<string, number>
}) => {
  const { chainId } = useSelectedNetwork()
  const { provider, signer } = useEthersProvider({ chainId })
  const signerOrProvider = signer ?? provider
  const normalizedAddress = lenderAddress?.toLowerCase()
  const normalizedMarketId = marketId?.toLowerCase()
  const fallbackPrice = normalizedMarketId
    ? priceMap[normalizedMarketId]
    : undefined

  return useQuery<RiskReturnsData>({
    queryKey: [
      ...QueryKeys.Lender.GET_PROFILE_POSITIONS(chainId, normalizedAddress),
      "risk-returns",
      normalizedMarketId,
      fallbackPrice,
    ],
    enabled:
      !!normalizedAddress &&
      !!normalizedMarketId &&
      !!signerOrProvider &&
      fallbackPrice !== undefined &&
      isSubgraphPricingConfigured(chainId),
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress || !normalizedMarketId) {
        throw new Error("Missing lender or market address")
      }
      if (!signerOrProvider || !isSupportedChainId(chainId)) {
        throw new Error("No provider for the selected network")
      }
      if (fallbackPrice === undefined || !Number.isFinite(fallbackPrice)) {
        throw new Error(`Missing USD price for market ${normalizedMarketId}`)
      }

      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const [
        indexedMarketDailyStats,
        indexedDeposits,
        indexedWithdrawalRequests,
        indexedWithdrawalExecutions,
        indexedTransfersIn,
        indexedTransfersOut,
        indexedDelinquencyEvents,
        indexedMarket,
      ] = await Promise.all([
        collectIndexedPages(
          (request) =>
            getMarketDailyStatsPage(client, {
              markets: [normalizedMarketId],
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderDepositPage(client, {
              lender: normalizedAddress,
              markets: [normalizedMarketId],
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderWithdrawalRequestPage(client, {
              lender: normalizedAddress,
              markets: [normalizedMarketId],
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderWithdrawalExecutionPage(client, {
              lender: normalizedAddress,
              markets: [normalizedMarketId],
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderTransferPage(client, {
              lender: normalizedAddress,
              markets: [normalizedMarketId],
              direction: "in",
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderTransferPage(client, {
              lender: normalizedAddress,
              markets: [normalizedMarketId],
              direction: "out",
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getDelinquencyStatusChangePage(client, {
              markets: [normalizedMarketId],
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        getIndexedMarket(client, {
          chainId,
          signerOrProvider,
          market: normalizedMarketId,
          fetchPolicy: "network-only",
        }),
      ])

      if (!indexedMarket) {
        throw new Error(`Market not found: ${normalizedMarketId}`)
      }
      await hydrateMarketsLive(chainId, [indexedMarket], signerOrProvider)

      const marketDailyStats: MarketDailyStatRaw[] =
        indexedMarketDailyStats.map((stat) => ({
          startTimestamp: stat.startTimestamp,
          scaledTotalSupply: stat.scaledTotalSupply.toString(),
          scaleFactor: stat.scaleFactor.toString(),
          usdPrice: stat.usdPrice ?? null,
          dayWithdrawalsRequested: stat.dayWithdrawalsRequested.toString(),
          market: {
            id: stat.market.address,
            asset: { decimals: stat.market.asset.decimals },
          },
        }))
      const deposits: DepositRaw[] = indexedDeposits.map((deposit) => ({
        assetAmount: deposit.assetAmount.toString(),
        scaledAmount: deposit.scaledAmount.toString(),
        blockTimestamp: Number(deposit.blockTimestamp),
      }))
      const withdrawalRequests: WithdrawalRequestRaw[] =
        indexedWithdrawalRequests.map((request) => ({
          scaledAmount: request.scaledAmount.toString(),
          normalizedAmount: request.normalizedAmount.toString(),
          blockTimestamp: Number(request.blockTimestamp),
        }))
      const withdrawalExecutions: WithdrawalExecutionRaw[] =
        indexedWithdrawalExecutions.map((execution) => ({
          normalizedAmount: execution.normalizedAmount.toString(),
          blockTimestamp: Number(execution.blockTimestamp),
        }))
      const transfersIn: TransferInRaw[] = indexedTransfersIn.map(
        (transfer) => ({
          from: { address: transfer.from },
          scaledAmount: transfer.scaledAmount.toString(),
          blockTimestamp: Number(transfer.blockTimestamp),
        }),
      )
      const transfersOut: TransferOutRaw[] = indexedTransfersOut.map(
        (transfer) => ({
          to: { address: transfer.to },
          scaledAmount: transfer.scaledAmount.toString(),
          blockTimestamp: Number(transfer.blockTimestamp),
        }),
      )
      const delinquencyEvents: DelinquencyStatusChangedRaw[] =
        indexedDelinquencyEvents.map((event) => ({
          isDelinquent: event.isDelinquent,
          blockTimestamp: Number(event.blockTimestamp),
        }))
      const marketLiveState: MarketLiveStateRaw = {
        scaleFactor: indexedMarket.scaleFactor.toString(),
        asset: { decimals: indexedMarket.underlyingToken.decimals },
      }

      return buildRiskReturnsData({
        marketDailyStats,
        marketLiveState,
        deposits,
        withdrawalRequests,
        withdrawalExecutions,
        transfersIn,
        transfersOut,
        delinquencyEvents,
        fallbackPrice,
      })
    },
  })
}
