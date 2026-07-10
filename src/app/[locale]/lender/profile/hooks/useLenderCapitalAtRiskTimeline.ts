import { useMemo } from "react"

import { gql, TypedDocumentNode } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import { LenderCapitalAtRiskPoint } from "@/app/[locale]/lender/profile/hooks/types"
import {
  formatDateLabel,
  formatShortDate,
  normalizeScaledAmount,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const PAGE_SIZE = 1000
const DAY_SECONDS = 86_400
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

type PageVariables = {
  first: number
  skip: number
}

type MarketIdsPageVariables = PageVariables & {
  marketIds: string[]
}

type AccountIdsPageVariables = PageVariables & {
  accountIds: string[]
}

const GET_MARKET_DAILY_STATS = gql`
  query getLenderRiskMarketDailyStats(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    marketDailyStats: marketDailyStats_collection(
      where: { market_in: $marketIds }
      orderBy: startTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      startTimestamp
      scaledTotalSupply
      scaleFactor
      usdPrice
      market {
        id
        delinquencyGracePeriod
        asset {
          decimals
        }
      }
    }
  }
`

const GET_DELINQUENCY_STATUS_CHANGES = gql`
  query getLenderRiskDelinquencyStatusChanges(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    delinquencyStatusChangeds(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      market {
        id
        delinquencyGracePeriod
      }
      isDelinquent
      blockTimestamp
    }
  }
`

const GET_LENDER_DEPOSITS = gql`
  query getLenderRiskDeposits(
    $accountIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    deposits(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      market {
        id
      }
      scaledAmount
      blockTimestamp
    }
  }
`

const GET_LENDER_WITHDRAWAL_REQUESTS = gql`
  query getLenderRiskWithdrawalRequests(
    $accountIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    withdrawalRequests(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      market {
        id
      }
      scaledAmount
      normalizedAmount
      blockTimestamp
    }
  }
`

const GET_LENDER_WITHDRAWAL_EXECUTIONS = gql`
  query getLenderRiskWithdrawalExecutions(
    $accountIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    withdrawalExecutions(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      account {
        market {
          id
        }
      }
      normalizedAmount
      blockTimestamp
    }
  }
`

const GET_LENDER_TRANSFERS_IN = gql`
  query getLenderRiskTransfersIn(
    $accountIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    transfers(
      where: { to_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      market {
        id
      }
      from {
        address
      }
      scaledAmount
      blockTimestamp
    }
  }
`

const GET_LENDER_TRANSFERS_OUT = gql`
  query getLenderRiskTransfersOut(
    $accountIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    transfers(
      where: { from_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      market {
        id
      }
      to {
        address
      }
      scaledAmount
      blockTimestamp
    }
  }
`

const GET_MARKET_INTEREST_ACCRUALS = gql`
  query getLenderRiskMarketInterestAccruals(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    marketInterestAccrueds(
      where: { market_in: $marketIds }
      orderBy: toTimestamp
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      market {
        id
        asset {
          decimals
        }
      }
      toTimestamp
      delinquencyFeesAccrued
    }
  }
`

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

type MarketDailyStatsPage = {
  marketDailyStats: MarketDailyStatRaw[]
}

type DelinquencyStatusChangesPage = {
  delinquencyStatusChangeds: DelinquencyStatusChangeRaw[]
}

type DepositsPage = {
  deposits: BalanceEventRaw[]
}

type WithdrawalRequestsPage = {
  withdrawalRequests: WithdrawalRequestRaw[]
}

type WithdrawalExecutionsPage = {
  withdrawalExecutions: WithdrawalExecutionRaw[]
}

type TransfersInPage = {
  transfers: TransferInRaw[]
}

type TransfersOutPage = {
  transfers: TransferOutRaw[]
}

type MarketInterestAccrualsPage = {
  marketInterestAccrueds: MarketInterestAccrualRaw[]
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

const fetchAllPages = async <TItem, TVariables extends PageVariables>(
  client: NonNullable<ReturnType<typeof getHinterlightClient>>,
  query: TypedDocumentNode<Record<string, TItem[]>, TVariables>,
  field: string,
  variables: Omit<TVariables, "first" | "skip">,
  skip = 0,
  items: TItem[] = [],
): Promise<TItem[]> => {
  const page = await client.query<Record<string, TItem[]>, TVariables>({
    query,
    variables: {
      ...variables,
      first: PAGE_SIZE,
      skip,
    } as TVariables,
  })
  const pageItems = page.data[field] ?? []
  const nextItems = [...items, ...pageItems]

  if (pageItems.length < PAGE_SIZE) return nextItems
  return fetchAllPages(
    client,
    query,
    field,
    variables,
    skip + PAGE_SIZE,
    nextItems,
  )
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

  marketDailyStats.forEach((stat) => {
    const marketId = stat.market.id
    const entries = statsByMarket.get(marketId) ?? []
    const price = stat.usdPrice
      ? Number(stat.usdPrice)
      : priceMap[marketId] ?? 0

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
        (marketState?.price ?? priceMap[accrual.market.id] ?? 0) *
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
  const stablePriceMapKey = useMemo(() => JSON.stringify(priceMap), [priceMap])

  return useQuery<LenderCapitalAtRiskPoint[]>({
    queryKey: [
      ...QueryKeys.Lender.GET_PROFILE_POSITIONS(chainId, normalizedAddress),
      "capital-at-risk",
      normalizedMarketIds,
      stablePriceMapKey,
    ],
    enabled:
      !!normalizedAddress &&
      isHinterlightSupported(chainId) &&
      normalizedMarketIds.length > 0,
    refetchOnMount: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!normalizedAddress) throw new Error("Missing lender address")

      const client = getHinterlightClient(chainId)
      if (!client) throw new Error("Hinterlight not supported on this network")

      const accountIds = normalizedMarketIds.map(
        (marketId) => `LENDER-${marketId.toLowerCase()}-${normalizedAddress}`,
      )

      const [
        marketDailyStats,
        delinquencyEvents,
        deposits,
        withdrawalRequests,
        withdrawalExecutions,
        transfersIn,
        transfersOut,
        interestAccruals,
      ] = await Promise.all([
        fetchAllPages<MarketDailyStatRaw, MarketIdsPageVariables>(
          client,
          GET_MARKET_DAILY_STATS,
          "marketDailyStats",
          {
            marketIds: normalizedMarketIds,
          },
        ),
        fetchAllPages<DelinquencyStatusChangeRaw, MarketIdsPageVariables>(
          client,
          GET_DELINQUENCY_STATUS_CHANGES,
          "delinquencyStatusChangeds",
          {
            marketIds: normalizedMarketIds,
          },
        ),
        fetchAllPages<BalanceEventRaw, AccountIdsPageVariables>(
          client,
          GET_LENDER_DEPOSITS,
          "deposits",
          { accountIds },
        ),
        fetchAllPages<WithdrawalRequestRaw, AccountIdsPageVariables>(
          client,
          GET_LENDER_WITHDRAWAL_REQUESTS,
          "withdrawalRequests",
          {
            accountIds,
          },
        ),
        fetchAllPages<WithdrawalExecutionRaw, AccountIdsPageVariables>(
          client,
          GET_LENDER_WITHDRAWAL_EXECUTIONS,
          "withdrawalExecutions",
          {
            accountIds,
          },
        ),
        fetchAllPages<TransferInRaw, AccountIdsPageVariables>(
          client,
          GET_LENDER_TRANSFERS_IN,
          "transfers",
          { accountIds },
        ),
        fetchAllPages<TransferOutRaw, AccountIdsPageVariables>(
          client,
          GET_LENDER_TRANSFERS_OUT,
          "transfers",
          { accountIds },
        ),
        fetchAllPages<MarketInterestAccrualRaw, MarketIdsPageVariables>(
          client,
          GET_MARKET_INTEREST_ACCRUALS,
          "marketInterestAccrueds",
          {
            marketIds: normalizedMarketIds,
          },
        ),
      ])

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
