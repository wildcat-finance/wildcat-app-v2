import { gql } from "@apollo/client"
import {
  DEFAULT_DELINQUENCY_PERIOD,
  getMarketDefaultStatus,
  getSubgraphClient,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import {
  isUnsignedInteger,
  LegacyDefaultSnapshot,
  LegacyDelinquencyChange,
  reconstructLegacyDefault,
} from "@wildcatfi/wildcat-sdk/dist/internal/legacy-default"

export type DefaultedMarket = {
  address: string
  borrower: string
  defaultedAt?: number
}

export type DefaultedMarketsData = {
  markets: Record<string, DefaultedMarket>
  unknown: string[]
}

const MARKETS_PAGE_SIZE = 200
const HISTORY_PAGE_SIZE = 1000

const DEFAULT_HISTORIES_QUERY = gql`
  query getDefaultHistories(
    $first: Int!
    $skip: Int!
    $createdBefore: Int!
    $historyFirst: Int!
  ) {
    markets(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: asc
      where: {
        delinquencyStatusChangedIndex_gt: 0
        createdAt_lt: $createdBefore
      }
    ) {
      id
      borrower
      createdAt
      delinquencyFeeBips
      delinquencyGracePeriod
      delinquencyStatusChangedIndex
      timeDelinquent
      isDelinquent
      isClosed
      lastInterestAccruedTimestamp
      marketClosedEvent {
        timestamp
      }
      delinquencyRecords(
        first: $historyFirst
        orderBy: delinquencyStatusChangedIndex
        orderDirection: asc
      ) {
        id
        delinquencyStatusChangedIndex
        isDelinquent
        blockNumber
        blockTimestamp
        blockLogIndex
      }
    }
    _meta {
      deployment
      hasIndexingErrors
      block {
        number
        timestamp
      }
    }
  }
`

type DefaultHistory = LegacyDefaultSnapshot & {
  borrower: string
  delinquencyRecords: LegacyDelinquencyChange[]
}

type DefaultHistoriesResult = {
  markets: DefaultHistory[]
  _meta: {
    deployment?: string | null
    hasIndexingErrors?: boolean | null
    block: { number?: number | null; timestamp?: number | null }
  } | null
}

const getIndexedBlock = (meta: DefaultHistoriesResult["_meta"]) => {
  const number = meta?.block.number
  const timestamp = meta?.block.timestamp
  if (
    !meta?.deployment ||
    meta.hasIndexingErrors !== false ||
    !isUnsignedInteger(number) ||
    !isUnsignedInteger(timestamp)
  )
    return undefined
  return { number, timestamp }
}

export const isDefaultedMarketsData = (
  value: unknown,
): value is DefaultedMarketsData => {
  if (!value || typeof value !== "object") return false
  const { markets, unknown } = value as Partial<DefaultedMarketsData>
  return (
    !!markets &&
    typeof markets === "object" &&
    Array.isArray(unknown) &&
    unknown.every((address) => typeof address === "string") &&
    Object.values(markets).every(
      (market) =>
        typeof market?.address === "string" &&
        typeof market.borrower === "string",
    )
  )
}

export const fetchDefaultedMarkets = async (
  chainId: SupportedChainId,
  signal?: AbortSignal,
): Promise<DefaultedMarketsData> => {
  const client = getSubgraphClient(chainId)
  const createdBefore =
    Math.floor(Date.now() / 1000) - DEFAULT_DELINQUENCY_PERIOD

  const markets: DefaultedMarketsData["markets"] = {}
  const unknown: string[] = []
  const longHistories: DefaultHistory[] = []

  for (let skip = 0; ; skip += MARKETS_PAGE_SIZE) {
    const {
      data: { markets: page, _meta: meta },
      // eslint-disable-next-line no-await-in-loop
    } = await client.query<DefaultHistoriesResult>({
      query: DEFAULT_HISTORIES_QUERY,
      variables: {
        first: MARKETS_PAGE_SIZE,
        skip,
        createdBefore,
        historyFirst: HISTORY_PAGE_SIZE,
      },
      fetchPolicy: "no-cache",
      context: { fetchOptions: { signal } },
    })

    const block = getIndexedBlock(meta)

    page.forEach((history) => {
      const { delinquencyRecords, borrower, ...snapshot } = history
      const address = snapshot.id.toLowerCase()
      if (!block) {
        unknown.push(address)
        return
      }
      if (snapshot.delinquencyStatusChangedIndex > delinquencyRecords.length) {
        longHistories.push(history)
        return
      }
      const defaultedAt = reconstructLegacyDefault(
        snapshot,
        delinquencyRecords,
        block.timestamp,
        block.number,
      )
      if (defaultedAt === undefined) unknown.push(address)
      else if (defaultedAt !== null)
        markets[address] = {
          address,
          borrower: borrower.toLowerCase(),
          defaultedAt,
        }
    })

    if (page.length < MARKETS_PAGE_SIZE) break
  }

  const readLongHistory = async ({
    id,
    borrower,
    lastInterestAccruedTimestamp,
  }: DefaultHistory) => {
    const address = id.toLowerCase()
    try {
      const status = await getMarketDefaultStatus(client, {
        market: { address, chainId, lastInterestAccruedTimestamp },
        signal,
      })
      if (status.isDefaulted === undefined) unknown.push(address)
      else if (status.isDefaulted)
        markets[address] = {
          address,
          borrower: borrower.toLowerCase(),
          defaultedAt: status.defaultedAt,
        }
    } catch {
      if (!signal?.aborted) unknown.push(address)
    }
  }

  await Promise.all(longHistories.map(readLongHistory))
  signal?.throwIfAborted()

  return { markets, unknown }
}
