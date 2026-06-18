import { useMemo } from "react"

import { gql, TypedDocumentNode } from "@apollo/client"
import { useQuery } from "@tanstack/react-query"

import {
  LenderInterestBreakdown,
  LenderInterestBreakdownEntry,
} from "@/app/[locale]/lender/profile/hooks/types"
import {
  normalizeScaledAmount,
  toHumanAmount,
} from "@/components/Profile/shared/analytics"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient, isHinterlightSupported } from "@/lib/hinterlight"

const PAGE_SIZE = 1000
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
  query getLenderInterestMarketDailyStats(
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
      }
    }
  }
`

const GET_LENDER_DEPOSITS = gql`
  query getLenderInterestDeposits(
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
      assetAmount
      scaledAmount
      blockTimestamp
    }
  }
`

const GET_LENDER_WITHDRAWAL_REQUESTS = gql`
  query getLenderInterestWithdrawalRequests(
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
  query getLenderInterestWithdrawalExecutions(
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
  query getLenderInterestTransfersIn(
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
  query getLenderInterestTransfersOut(
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
  query getLenderInterestMarketAccruals(
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
      }
      toTimestamp
      baseInterestAccrued
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
  }
}

type DepositRaw = {
  market: { id: string }
  assetAmount: string
  scaledAmount: string
  blockTimestamp: number
}

type WithdrawalRequestRaw = {
  market: { id: string }
  scaledAmount: string
  normalizedAmount: string
  blockTimestamp: number
}

type WithdrawalExecutionRaw = {
  account: { market: { id: string } }
  normalizedAmount: string
  blockTimestamp: number
}

type TransferInRaw = {
  market: { id: string }
  from: { address: string }
  scaledAmount: string
  blockTimestamp: number
}

type TransferOutRaw = {
  market: { id: string }
  to: { address: string }
  scaledAmount: string
  blockTimestamp: number
}

type MarketInterestAccrualRaw = {
  market: { id: string }
  toTimestamp: number
  baseInterestAccrued: string
  delinquencyFeesAccrued: string
}

type DayState = {
  startTimestamp: number
  scaleFactor: string
  scaledTotalSupply: string
  price: number
}

type MarketAccum = {
  activeScaled: bigint
  pendingNormalized: bigint
  principalUsd: number
  baseUsd: number
  penaltyUsd: number
}

type ReplayEvent =
  | {
      kind: "deposit"
      marketId: string
      ts: number
      scaled: bigint
      asset: bigint
    }
  | {
      kind: "withdrawalRequest"
      marketId: string
      ts: number
      scaled: bigint
      normalized: bigint
    }
  | {
      kind: "withdrawalExecution"
      marketId: string
      ts: number
      normalized: bigint
    }
  | { kind: "transferIn"; marketId: string; ts: number; scaled: bigint }
  | { kind: "transferOut"; marketId: string; ts: number; scaled: bigint }
  | {
      kind: "accrual"
      marketId: string
      ts: number
      base: bigint
      penalty: bigint
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

const isZeroAddress = (address: string) =>
  address.toLowerCase() === ZERO_ADDRESS

const getLenderShare = (
  lenderScaledBalance: bigint,
  marketScaledSupply: string,
) => {
  const marketSupply = BigInt(marketScaledSupply)
  if (marketSupply <= BigInt(0) || lenderScaledBalance <= BigInt(0)) return 0
  return Math.min(1, Number(lenderScaledBalance) / Number(marketSupply))
}

const emptyEntry = (): LenderInterestBreakdownEntry => ({
  baseUsd: 0,
  penaltyUsd: 0,
  totalInterestUsd: 0,
  inHandUsd: 0,
  inProtocolUsd: 0,
})

const emptyBreakdown = (): LenderInterestBreakdown => ({
  portfolio: emptyEntry(),
  byMarket: {},
})

const buildInterestBreakdown = ({
  marketIds,
  priceMap,
  decimalsMap,
  marketDailyStats,
  deposits,
  withdrawalRequests,
  withdrawalExecutions,
  transfersIn,
  transfersOut,
  interestAccruals,
}: {
  marketIds: string[]
  priceMap: Record<string, number>
  decimalsMap: Record<string, number>
  marketDailyStats: MarketDailyStatRaw[]
  deposits: DepositRaw[]
  withdrawalRequests: WithdrawalRequestRaw[]
  withdrawalExecutions: WithdrawalExecutionRaw[]
  transfersIn: TransferInRaw[]
  transfersOut: TransferOutRaw[]
  interestAccruals: MarketInterestAccrualRaw[]
}): LenderInterestBreakdown => {
  const statsByMarket = new Map<string, DayState[]>()
  marketDailyStats.forEach((stat) => {
    const marketId = stat.market.id
    const entries = statsByMarket.get(marketId) ?? []
    entries.push({
      startTimestamp: stat.startTimestamp,
      scaleFactor: stat.scaleFactor,
      scaledTotalSupply: stat.scaledTotalSupply,
      price: stat.usdPrice ? Number(stat.usdPrice) : priceMap[marketId] ?? 0,
    })
    statsByMarket.set(marketId, entries)
  })
  statsByMarket.forEach((entries) =>
    entries.sort((left, right) => left.startTimestamp - right.startTimestamp),
  )

  const stateCursors = new Map<string, number>()
  const lastStateByMarket = new Map<string, DayState>()
  const getStateAt = (marketId: string, ts: number): DayState | undefined => {
    const entries = statsByMarket.get(marketId)
    if (!entries || entries.length === 0) return lastStateByMarket.get(marketId)

    let cursor = stateCursors.get(marketId) ?? 0
    while (cursor < entries.length && entries[cursor].startTimestamp <= ts) {
      lastStateByMarket.set(marketId, entries[cursor])
      cursor += 1
    }
    stateCursors.set(marketId, cursor)
    return lastStateByMarket.get(marketId) ?? entries[0]
  }

  const events: ReplayEvent[] = [
    ...deposits.map(
      (event): ReplayEvent => ({
        kind: "deposit",
        marketId: event.market.id,
        ts: event.blockTimestamp,
        scaled: BigInt(event.scaledAmount),
        asset: BigInt(event.assetAmount),
      }),
    ),
    ...withdrawalRequests.map(
      (event): ReplayEvent => ({
        kind: "withdrawalRequest",
        marketId: event.market.id,
        ts: event.blockTimestamp,
        scaled: BigInt(event.scaledAmount),
        normalized: BigInt(event.normalizedAmount),
      }),
    ),
    ...withdrawalExecutions.map(
      (event): ReplayEvent => ({
        kind: "withdrawalExecution",
        marketId: event.account.market.id,
        ts: event.blockTimestamp,
        normalized: BigInt(event.normalizedAmount),
      }),
    ),
    ...transfersIn
      .filter((event) => !isZeroAddress(event.from.address))
      .map(
        (event): ReplayEvent => ({
          kind: "transferIn",
          marketId: event.market.id,
          ts: event.blockTimestamp,
          scaled: BigInt(event.scaledAmount),
        }),
      ),
    ...transfersOut
      .filter((event) => !isZeroAddress(event.to.address))
      .map(
        (event): ReplayEvent => ({
          kind: "transferOut",
          marketId: event.market.id,
          ts: event.blockTimestamp,
          scaled: BigInt(event.scaledAmount),
        }),
      ),
    ...interestAccruals.map(
      (event): ReplayEvent => ({
        kind: "accrual",
        marketId: event.market.id,
        ts: event.toTimestamp,
        base: BigInt(event.baseInterestAccrued),
        penalty: BigInt(event.delinquencyFeesAccrued),
      }),
    ),
  ].sort((left, right) => left.ts - right.ts)

  const accums = new Map<string, MarketAccum>()
  const getAccum = (marketId: string): MarketAccum => {
    const existing = accums.get(marketId)
    if (existing) return existing
    const next: MarketAccum = {
      activeScaled: BigInt(0),
      pendingNormalized: BigInt(0),
      principalUsd: 0,
      baseUsd: 0,
      penaltyUsd: 0,
    }
    accums.set(marketId, next)
    return next
  }

  events.forEach((event) => {
    const accum = getAccum(event.marketId)
    const decimals = decimalsMap[event.marketId] ?? 18
    const state = getStateAt(event.marketId, event.ts)
    const price = state?.price ?? priceMap[event.marketId] ?? 0

    switch (event.kind) {
      case "deposit": {
        accum.activeScaled += event.scaled
        accum.principalUsd += toHumanAmount(event.asset, decimals) * price
        break
      }
      case "withdrawalRequest": {
        accum.activeScaled =
          accum.activeScaled > event.scaled
            ? accum.activeScaled - event.scaled
            : BigInt(0)
        accum.pendingNormalized += event.normalized
        break
      }
      case "withdrawalExecution": {
        accum.pendingNormalized =
          accum.pendingNormalized > event.normalized
            ? accum.pendingNormalized - event.normalized
            : BigInt(0)
        accum.principalUsd -= toHumanAmount(event.normalized, decimals) * price
        break
      }
      case "transferIn": {
        accum.activeScaled += event.scaled
        if (state && state.scaleFactor !== "0") {
          const normalized = normalizeScaledAmount(
            event.scaled.toString(),
            state.scaleFactor,
          )
          accum.principalUsd += toHumanAmount(normalized, decimals) * price
        }
        break
      }
      case "transferOut": {
        accum.activeScaled =
          accum.activeScaled > event.scaled
            ? accum.activeScaled - event.scaled
            : BigInt(0)
        if (state && state.scaleFactor !== "0") {
          const normalized = normalizeScaledAmount(
            event.scaled.toString(),
            state.scaleFactor,
          )
          accum.principalUsd -= toHumanAmount(normalized, decimals) * price
        }
        break
      }
      case "accrual": {
        const share = state
          ? getLenderShare(accum.activeScaled, state.scaledTotalSupply)
          : 0
        if (share > 0) {
          accum.baseUsd += toHumanAmount(event.base, decimals) * price * share
          accum.penaltyUsd +=
            toHumanAmount(event.penalty, decimals) * price * share
        }
        break
      }
      default:
        break
    }
  })

  const byMarket: Record<string, LenderInterestBreakdownEntry> = {}
  const portfolio = emptyEntry()

  marketIds.forEach((marketId) => {
    const accum = accums.get(marketId)
    if (!accum) {
      byMarket[marketId] = emptyEntry()
      return
    }

    const decimals = decimalsMap[marketId] ?? 18
    const marketStats = statsByMarket.get(marketId)
    const latestState = marketStats?.[marketStats.length - 1]
    const currentScaleFactor = latestState?.scaleFactor ?? "0"
    const price = priceMap[marketId] ?? latestState?.price ?? 0

    let walletValueUsd = 0
    if (currentScaleFactor !== "0" && accum.activeScaled > BigInt(0)) {
      const activeNormalized = normalizeScaledAmount(
        accum.activeScaled.toString(),
        currentScaleFactor,
      )
      walletValueUsd += toHumanAmount(activeNormalized, decimals) * price
    }
    if (accum.pendingNormalized > BigInt(0)) {
      walletValueUsd += toHumanAmount(accum.pendingNormalized, decimals) * price
    }

    const totalInterestUsd = accum.baseUsd + accum.penaltyUsd
    const inProtocolUsd = Math.min(
      totalInterestUsd,
      Math.max(0, walletValueUsd - accum.principalUsd),
    )
    const inHandUsd = Math.max(0, totalInterestUsd - inProtocolUsd)

    const entry: LenderInterestBreakdownEntry = {
      baseUsd: accum.baseUsd,
      penaltyUsd: accum.penaltyUsd,
      totalInterestUsd,
      inHandUsd,
      inProtocolUsd,
    }
    byMarket[marketId] = entry

    portfolio.baseUsd += entry.baseUsd
    portfolio.penaltyUsd += entry.penaltyUsd
    portfolio.totalInterestUsd += entry.totalInterestUsd
    portfolio.inHandUsd += entry.inHandUsd
    portfolio.inProtocolUsd += entry.inProtocolUsd
  })

  return { portfolio, byMarket }
}

export const useLenderInterestBreakdown = ({
  lenderAddress,
  marketIds,
  priceMap,
  decimalsMap,
}: {
  lenderAddress: `0x${string}` | undefined
  marketIds: string[]
  priceMap: Record<string, number>
  decimalsMap: Record<string, number>
}) => {
  const { chainId } = useSelectedNetwork()
  const normalizedAddress = lenderAddress?.toLowerCase()
  const normalizedMarketIds = useMemo(() => [...marketIds].sort(), [marketIds])
  const stablePriceMapKey = useMemo(() => JSON.stringify(priceMap), [priceMap])

  return useQuery<LenderInterestBreakdown>({
    queryKey: [
      ...QueryKeys.Lender.GET_PROFILE_POSITIONS(chainId, normalizedAddress),
      "interest-breakdown",
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
          { marketIds: normalizedMarketIds },
        ),
        fetchAllPages<DepositRaw, AccountIdsPageVariables>(
          client,
          GET_LENDER_DEPOSITS,
          "deposits",
          { accountIds },
        ),
        fetchAllPages<WithdrawalRequestRaw, AccountIdsPageVariables>(
          client,
          GET_LENDER_WITHDRAWAL_REQUESTS,
          "withdrawalRequests",
          { accountIds },
        ),
        fetchAllPages<WithdrawalExecutionRaw, AccountIdsPageVariables>(
          client,
          GET_LENDER_WITHDRAWAL_EXECUTIONS,
          "withdrawalExecutions",
          { accountIds },
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
          { marketIds: normalizedMarketIds },
        ),
      ])

      if (interestAccruals.length === 0 && deposits.length === 0) {
        return emptyBreakdown()
      }

      return buildInterestBreakdown({
        marketIds: normalizedMarketIds,
        priceMap,
        decimalsMap,
        marketDailyStats,
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
