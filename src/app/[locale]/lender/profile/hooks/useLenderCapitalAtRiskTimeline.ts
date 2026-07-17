import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  collectIndexedPages,
  getDelinquencyStatusChangePage,
  getLenderDepositPage,
  getLenderTransferPage,
  getLenderWithdrawalExecutionPage,
  getLenderWithdrawalRequestPage,
  getMarketDailyStatsPage,
  getMarketInterestAccrualPage,
} from "@wildcatfi/wildcat-sdk"

import { LenderCapitalAtRiskPoint } from "@/app/[locale]/lender/profile/hooks/types"
import {
  formatDateLabel,
  formatShortDate,
  normalizeScaledAmount,
  stableRecordKey,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
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
  market: {
    id: string
    delinquencyGracePeriod: number
    asset: {
      decimals: number
    }
  }
}

type DelinquencyStatusChangeRaw = {
  market: {
    id: string
    delinquencyGracePeriod: number
  }
  isDelinquent: boolean
  blockTimestamp: number
}

type BalanceEventRaw = {
  market: {
    id: string
  }
  scaledAmount: string
  blockTimestamp: number
}

type WithdrawalRequestRaw = BalanceEventRaw & {
  normalizedAmount: string
}

type WithdrawalExecutionRaw = {
  account: {
    market: {
      id: string
    }
  }
  normalizedAmount: string
  blockTimestamp: number
}

type TransferInRaw = BalanceEventRaw & {
  from: {
    address: string
  }
}

type TransferOutRaw = BalanceEventRaw & {
  to: {
    address: string
  }
}

type MarketInterestAccrualRaw = {
  market: {
    id: string
    asset: {
      decimals: number
    }
  }
  toTimestamp: number
  delinquencyFeesAccrued: string
}

type ScaledBalanceEvent = {
  marketId: string
  timestamp: number
  scaledDelta: bigint
}

type QueueEvent = {
  marketId: string
  timestamp: number
  normalizedDelta: bigint
}

type MarketDayState = {
  startTimestamp: number
  decimals: number
  scaleFactor: string
  scaledTotalSupply: string
  price: number
  gracePeriod: number
}

type DelinquencyState = {
  isDelinquent: boolean
  startTimestamp: number
  gracePeriod: number
}

const toDayStart = (timestamp: number) =>
  Math.floor(timestamp / DAY_SECONDS) * DAY_SECONDS

const applyBigIntDelta = (
  values: Map<string, bigint>,
  marketId: string,
  delta: bigint,
) => {
  const nextValue = (values.get(marketId) ?? BigInt(0)) + delta
  values.set(marketId, nextValue > BigInt(0) ? nextValue : BigInt(0))
}

const getLatestMarketState = (
  dailyStats: Map<string, MarketDayState[]>,
  cursors: Map<string, number>,
  activeState: Map<string, MarketDayState>,
  timestamp: number,
) => {
  dailyStats.forEach((entries, marketId) => {
    let cursor = cursors.get(marketId) ?? 0

    while (
      cursor < entries.length &&
      entries[cursor].startTimestamp <= timestamp
    ) {
      activeState.set(marketId, entries[cursor])
      cursor += 1
    }

    cursors.set(marketId, cursor)

    if (!activeState.has(marketId) && entries.length > 0) {
      activeState.set(marketId, entries[0])
    }
  })
}

const getRiskBucket = (
  delinquencyState: DelinquencyState | undefined,
  timestamp: number,
) => {
  if (!delinquencyState?.isDelinquent) return "healthyUsd" as const

  return timestamp >=
    delinquencyState.startTimestamp + delinquencyState.gracePeriod
    ? ("penaltyUsd" as const)
    : ("graceUsd" as const)
}

const getUsdFromScaled = (
  scaled: bigint,
  state: MarketDayState | undefined,
) => {
  if (!state || scaled <= BigInt(0)) return 0

  return (
    toHumanAmount(
      normalizeScaledAmount(scaled.toString(), state.scaleFactor),
      state.decimals,
    ) * state.price
  )
}

const getUsdFromNormalized = (
  normalized: bigint,
  state: MarketDayState | undefined,
) => {
  if (!state || normalized <= BigInt(0)) return 0
  return toHumanAmount(normalized, state.decimals) * state.price
}

const getLenderFeeShare = (
  lenderScaledBalance: bigint,
  marketScaledSupply: string,
) => {
  const marketSupply = BigInt(marketScaledSupply)
  if (marketSupply <= BigInt(0) || lenderScaledBalance <= BigInt(0)) return 0

  return Math.min(1, Number(lenderScaledBalance) / Number(marketSupply))
}

const isZeroAddress = (address: string) =>
  address.toLowerCase() === ZERO_ADDRESS

const buildTimeline = ({
  marketIds,
  priceMap,
  marketDailyStats,
  delinquencyEvents,
  deposits,
  withdrawalRequests,
  withdrawalExecutions,
  transfersIn,
  transfersOut,
  interestAccruals,
}: {
  marketIds: string[]
  priceMap: Record<string, number>
  marketDailyStats: MarketDailyStatRaw[]
  delinquencyEvents: DelinquencyStatusChangeRaw[]
  deposits: BalanceEventRaw[]
  withdrawalRequests: WithdrawalRequestRaw[]
  withdrawalExecutions: WithdrawalExecutionRaw[]
  transfersIn: TransferInRaw[]
  transfersOut: TransferOutRaw[]
  interestAccruals: MarketInterestAccrualRaw[]
}): LenderCapitalAtRiskPoint[] => {
  const statsByMarket = new Map<
    string,
    Array<MarketDayState & { startTimestamp: number }>
  >()
  const gracePeriodByMarket = new Map<string, number>()
  const getRequiredPrice = (marketId: string, indexedPrice?: string | null) => {
    const price =
      indexedPrice !== undefined && indexedPrice !== null
        ? Number(indexedPrice)
        : priceMap[marketId] ?? priceMap[marketId.toLowerCase()]
    if (price === undefined || !Number.isFinite(price)) {
      throw new Error(`Missing USD price for market ${marketId}`)
    }
    return price
  }

  marketDailyStats.forEach((stat) => {
    const marketId = stat.market.id
    const entries = statsByMarket.get(marketId) ?? []
    const price = getRequiredPrice(marketId, stat.usdPrice)

    entries.push({
      startTimestamp: stat.startTimestamp,
      decimals: stat.market.asset.decimals,
      scaleFactor: stat.scaleFactor,
      scaledTotalSupply: stat.scaledTotalSupply,
      price,
      gracePeriod: stat.market.delinquencyGracePeriod,
    })
    statsByMarket.set(marketId, entries)
    gracePeriodByMarket.set(marketId, stat.market.delinquencyGracePeriod)
  })
  statsByMarket.forEach((entries) => {
    entries.sort((left, right) => left.startTimestamp - right.startTimestamp)
  })

  delinquencyEvents.forEach((event) => {
    gracePeriodByMarket.set(
      event.market.id,
      event.market.delinquencyGracePeriod,
    )
  })

  const scaledEvents: ScaledBalanceEvent[] = [
    ...deposits.map((event) => ({
      marketId: event.market.id,
      timestamp: event.blockTimestamp,
      scaledDelta: BigInt(event.scaledAmount),
    })),
    ...withdrawalRequests.map((event) => ({
      marketId: event.market.id,
      timestamp: event.blockTimestamp,
      scaledDelta: -BigInt(event.scaledAmount),
    })),
    ...transfersIn
      .filter((event) => !isZeroAddress(event.from.address))
      .map((event) => ({
        marketId: event.market.id,
        timestamp: event.blockTimestamp,
        scaledDelta: BigInt(event.scaledAmount),
      })),
    ...transfersOut
      .filter((event) => !isZeroAddress(event.to.address))
      .map((event) => ({
        marketId: event.market.id,
        timestamp: event.blockTimestamp,
        scaledDelta: -BigInt(event.scaledAmount),
      })),
  ].sort((left, right) => left.timestamp - right.timestamp)

  const queueEvents: QueueEvent[] = [
    ...withdrawalRequests.map((event) => ({
      marketId: event.market.id,
      timestamp: event.blockTimestamp,
      normalizedDelta: BigInt(event.normalizedAmount),
    })),
    ...withdrawalExecutions.map((event) => ({
      marketId: event.account.market.id,
      timestamp: event.blockTimestamp,
      normalizedDelta: -BigInt(event.normalizedAmount),
    })),
  ].sort((left, right) => left.timestamp - right.timestamp)

  const orderedDelinquencyEvents = delinquencyEvents
    .slice()
    .sort((left, right) => left.blockTimestamp - right.blockTimestamp)
  const orderedInterestAccruals = interestAccruals
    .filter((event) => BigInt(event.delinquencyFeesAccrued) > BigInt(0))
    .sort((left, right) => left.toTimestamp - right.toTimestamp)

  const timestamps = [
    ...marketDailyStats.map((item) => item.startTimestamp),
    ...scaledEvents.map((event) => event.timestamp),
    ...queueEvents.map((event) => event.timestamp),
    ...orderedDelinquencyEvents.map((event) => event.blockTimestamp),
    ...orderedInterestAccruals.map((event) => event.toTimestamp),
  ]

  if (timestamps.length === 0) return []

  const startDay = toDayStart(Math.min(...timestamps))
  const endDay = toDayStart(
    Math.max(...timestamps, Math.floor(Date.now() / 1000)),
  )
  const activeScaledByMarket = new Map<string, bigint>()
  const queueNormalizedByMarket = new Map<string, bigint>()
  const marketStateByDay = new Map<string, MarketDayState>()
  const marketStateCursors = new Map<string, number>()
  const delinquencyStateByMarket = new Map<string, DelinquencyState>()
  const points: LenderCapitalAtRiskPoint[] = []

  let scaledEventCursor = 0
  let queueEventCursor = 0
  let delinquencyEventCursor = 0
  let accrualCursor = 0
  let cumulativeDelinquencyFeesEarnedUsd = 0

  for (let day = startDay; day <= endDay; day += DAY_SECONDS) {
    const dayEnd = day + DAY_SECONDS

    getLatestMarketState(
      statsByMarket,
      marketStateCursors,
      marketStateByDay,
      day,
    )

    while (
      scaledEventCursor < scaledEvents.length &&
      scaledEvents[scaledEventCursor].timestamp < dayEnd
    ) {
      const event = scaledEvents[scaledEventCursor]
      applyBigIntDelta(activeScaledByMarket, event.marketId, event.scaledDelta)
      scaledEventCursor += 1
    }

    while (
      queueEventCursor < queueEvents.length &&
      queueEvents[queueEventCursor].timestamp < dayEnd
    ) {
      const event = queueEvents[queueEventCursor]
      applyBigIntDelta(
        queueNormalizedByMarket,
        event.marketId,
        event.normalizedDelta,
      )
      queueEventCursor += 1
    }

    while (
      delinquencyEventCursor < orderedDelinquencyEvents.length &&
      orderedDelinquencyEvents[delinquencyEventCursor].blockTimestamp < dayEnd
    ) {
      const event = orderedDelinquencyEvents[delinquencyEventCursor]
      delinquencyStateByMarket.set(event.market.id, {
        isDelinquent: event.isDelinquent,
        startTimestamp: event.blockTimestamp,
        gracePeriod:
          event.market.delinquencyGracePeriod ??
          gracePeriodByMarket.get(event.market.id) ??
          0,
      })
      delinquencyEventCursor += 1
    }

    while (
      accrualCursor < orderedInterestAccruals.length &&
      orderedInterestAccruals[accrualCursor].toTimestamp < dayEnd
    ) {
      const accrual = orderedInterestAccruals[accrualCursor]
      const marketState = marketStateByDay.get(accrual.market.id)
      const lenderScaledBalance =
        activeScaledByMarket.get(accrual.market.id) ?? BigInt(0)
      const feeShare = marketState
        ? getLenderFeeShare(lenderScaledBalance, marketState.scaledTotalSupply)
        : 0
      cumulativeDelinquencyFeesEarnedUsd +=
        toHumanAmount(
          accrual.delinquencyFeesAccrued,
          accrual.market.asset.decimals,
        ) *
        (marketState?.price ?? getRequiredPrice(accrual.market.id)) *
        feeShare
      accrualCursor += 1
    }

    const point: LenderCapitalAtRiskPoint = {
      date: formatDateLabel(day),
      dateShort: formatShortDate(day),
      timestamp: day,
      healthyUsd: 0,
      graceUsd: 0,
      penaltyUsd: 0,
      withdrawalQueueUsd: 0,
      cumulativeDelinquencyFeesEarnedUsd,
    }

    marketIds.forEach((marketId) => {
      const marketState = marketStateByDay.get(marketId)
      const activeUsd = getUsdFromScaled(
        activeScaledByMarket.get(marketId) ?? BigInt(0),
        marketState,
      )
      const queueUsd = getUsdFromNormalized(
        queueNormalizedByMarket.get(marketId) ?? BigInt(0),
        marketState,
      )
      const bucket = getRiskBucket(
        delinquencyStateByMarket.get(marketId),
        dayEnd,
      )

      point[bucket] += activeUsd
      point.withdrawalQueueUsd += queueUsd
    })

    points.push(point)
  }

  return points.filter(
    (point) =>
      point.healthyUsd > 0 ||
      point.graceUsd > 0 ||
      point.penaltyUsd > 0 ||
      point.withdrawalQueueUsd > 0 ||
      point.cumulativeDelinquencyFeesEarnedUsd > 0,
  )
}

export const useLenderCapitalAtRiskTimeline = ({
  lenderAddress,
  marketIds,
  priceMap,
}: {
  lenderAddress: `0x${string}` | undefined
  marketIds: string[]
  priceMap: Record<string, number>
}) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = lenderAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stablePriceMapKey = useMemo(() => stableRecordKey(priceMap), [priceMap])

  return useQuery<LenderCapitalAtRiskPoint[]>({
    queryKey: [
      ...QueryKeys.Lender.GET_PROFILE_POSITIONS(chainId, normalizedAddress),
      "capital-at-risk",
      normalizedMarketIds,
      stablePriceMapKey,
    ],
    enabled:
      !!normalizedAddress &&
      isSubgraphPricingConfigured(chainId) &&
      normalizedMarketIds.length > 0,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getConfiguredSubgraphClient(chainId)
      if (!client) throw new Error("Subgraph not configured on this network")

      const [
        indexedMarketDailyStats,
        indexedDelinquencyEvents,
        indexedDeposits,
        indexedWithdrawalRequests,
        indexedWithdrawalExecutions,
        indexedTransfersIn,
        indexedTransfersOut,
        indexedInterestAccruals,
      ] = await Promise.all([
        collectIndexedPages(
          (request) =>
            getMarketDailyStatsPage(client, {
              markets: normalizedMarketIds,
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getDelinquencyStatusChangePage(client, {
              markets: normalizedMarketIds,
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderDepositPage(client, {
              lender: normalizedAddress,
              markets: normalizedMarketIds,
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderWithdrawalRequestPage(client, {
              lender: normalizedAddress,
              markets: normalizedMarketIds,
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderWithdrawalExecutionPage(client, {
              lender: normalizedAddress,
              markets: normalizedMarketIds,
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getLenderTransferPage(client, {
              lender: normalizedAddress,
              markets: normalizedMarketIds,
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
              markets: normalizedMarketIds,
              direction: "out",
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
        collectIndexedPages(
          (request) =>
            getMarketInterestAccrualPage(client, {
              markets: normalizedMarketIds,
              fetchPolicy: "network-only",
              ...request,
            }),
          { first: 1000 },
        ),
      ])

      const marketDailyStats: MarketDailyStatRaw[] =
        indexedMarketDailyStats.map((stat) => ({
          startTimestamp: stat.startTimestamp,
          scaledTotalSupply: stat.scaledTotalSupply.toString(),
          scaleFactor: stat.scaleFactor.toString(),
          usdPrice: stat.usdPrice ?? null,
          market: {
            id: stat.market.address,
            delinquencyGracePeriod: stat.market.delinquencyGracePeriod,
            asset: { decimals: stat.market.asset.decimals },
          },
        }))
      const delinquencyEvents: DelinquencyStatusChangeRaw[] =
        indexedDelinquencyEvents.map((event) => ({
          market: {
            id: event.market.address,
            delinquencyGracePeriod: event.market.delinquencyGracePeriod,
          },
          isDelinquent: event.isDelinquent,
          blockTimestamp: Number(event.blockTimestamp),
        }))
      const deposits: BalanceEventRaw[] = indexedDeposits.map((deposit) => ({
        market: { id: deposit.market.address },
        scaledAmount: deposit.scaledAmount.toString(),
        blockTimestamp: Number(deposit.blockTimestamp),
      }))
      const withdrawalRequests: WithdrawalRequestRaw[] =
        indexedWithdrawalRequests.map((request) => ({
          market: { id: request.market.address },
          scaledAmount: request.scaledAmount.toString(),
          normalizedAmount: request.normalizedAmount.toString(),
          blockTimestamp: Number(request.blockTimestamp),
        }))
      const withdrawalExecutions: WithdrawalExecutionRaw[] =
        indexedWithdrawalExecutions.map((execution) => ({
          account: { market: { id: execution.market.address } },
          normalizedAmount: execution.normalizedAmount.toString(),
          blockTimestamp: Number(execution.blockTimestamp),
        }))
      const transfersIn: TransferInRaw[] = indexedTransfersIn.map(
        (transfer) => ({
          market: { id: transfer.market.address },
          from: { address: transfer.from },
          scaledAmount: transfer.scaledAmount.toString(),
          blockTimestamp: Number(transfer.blockTimestamp),
        }),
      )
      const transfersOut: TransferOutRaw[] = indexedTransfersOut.map(
        (transfer) => ({
          market: { id: transfer.market.address },
          to: { address: transfer.to },
          scaledAmount: transfer.scaledAmount.toString(),
          blockTimestamp: Number(transfer.blockTimestamp),
        }),
      )
      const interestAccruals: MarketInterestAccrualRaw[] =
        indexedInterestAccruals.map((accrual) => ({
          market: {
            id: accrual.market.address,
            asset: { decimals: accrual.market.asset.decimals },
          },
          toTimestamp: accrual.toTimestamp,
          delinquencyFeesAccrued: accrual.delinquencyFeesAccrued.toString(),
        }))

      return buildTimeline({
        marketIds: normalizedMarketIds,
        priceMap,
        marketDailyStats,
        delinquencyEvents,
        deposits,
        withdrawalRequests,
        withdrawalExecutions,
        transfersIn,
        transfersOut,
        interestAccruals,
      })
    },
  })
}
