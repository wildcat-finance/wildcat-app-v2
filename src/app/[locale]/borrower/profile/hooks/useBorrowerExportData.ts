import { gql, type ApolloClient } from "@apollo/client"
import { useMutation } from "@tanstack/react-query"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient } from "@/lib/hinterlight"
import type {
  BorrowerExportData,
  BorrowerExportEvent,
  BorrowerExportMarketAggregate,
} from "@/utils/borrowerCsvExport"

export const PAGE_SIZE = 1000
export const MAX_PAGES = 10

const GET_BORROWER_EXPORT_BORROWS = gql`
  query getBorrowerExportBorrows(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    borrows(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      market {
        id
        name
        asset {
          symbol
          decimals
        }
      }
      assetAmount
      blockTimestamp
      transactionHash
    }
  }
`

const GET_BORROWER_EXPORT_REPAYS = gql`
  query getBorrowerExportRepays(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    debtRepaids(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      market {
        id
        name
        asset {
          symbol
          decimals
        }
      }
      assetAmount
      blockTimestamp
      transactionHash
    }
  }
`

const GET_BORROWER_EXPORT_APR_CHANGES = gql`
  query getBorrowerExportAprChanges(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    annualInterestBipsUpdateds(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      market {
        id
        name
        asset {
          symbol
          decimals
        }
      }
      oldAnnualInterestBips
      newAnnualInterestBips
      blockTimestamp
      transactionHash
    }
  }
`

const GET_BORROWER_EXPORT_CAPACITY_CHANGES = gql`
  query getBorrowerExportCapacityChanges(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    maxTotalSupplyUpdateds(
      where: { market_in: $marketIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      market {
        id
        name
        asset {
          symbol
          decimals
        }
      }
      oldMaxTotalSupply
      newMaxTotalSupply
      blockTimestamp
      transactionHash
    }
  }
`

const GET_BORROWER_EXPORT_DELINQUENCIES = gql`
  query getBorrowerExportDelinquencies(
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
        name
        delinquencyGracePeriod
        asset {
          symbol
          decimals
        }
      }
      isDelinquent
      blockTimestamp
      transactionHash
    }
  }
`

const GET_BORROWER_EXPORT_MARKETS = gql`
  query getBorrowerExportMarkets($marketIds: [String!]!) {
    markets(where: { id_in: $marketIds }, first: 500) {
      id
      name
      totalBorrowed
      totalRepaid
      totalBaseInterestAccrued
      totalDeposited
      totalWithdrawalsExecuted
      asset {
        symbol
        decimals
      }
    }
  }
`

const GET_BORROWER_EXPORT_LENDER_ACCOUNTS = gql`
  query getBorrowerExportLenderAccounts(
    $marketIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    lenderAccounts(
      where: { market_in: $marketIds, scaledBalance_gt: "0" }
      first: $first
      skip: $skip
    ) {
      address
      market {
        id
      }
    }
  }
`

type MarketShape = {
  id: string
  name: string
  asset: { symbol: string; decimals: number }
}

type BorrowNode = {
  market: MarketShape
  assetAmount: string
  blockTimestamp: number
  transactionHash: string
}

type RepayNode = BorrowNode

type AprChangeNode = {
  market: MarketShape
  oldAnnualInterestBips: number
  newAnnualInterestBips: number
  blockTimestamp: number
  transactionHash: string
}

type CapacityChangeNode = {
  market: MarketShape
  oldMaxTotalSupply: string
  newMaxTotalSupply: string
  blockTimestamp: number
  transactionHash: string
}

type DelinquencyNode = {
  market: MarketShape & { delinquencyGracePeriod: number }
  isDelinquent: boolean
  blockTimestamp: number
  transactionHash: string
}

type MarketAggregateNode = {
  id: string
  name: string
  totalBorrowed: string
  totalRepaid: string
  totalBaseInterestAccrued: string
  totalDeposited: string
  totalWithdrawalsExecuted: string
  asset: { symbol: string; decimals: number }
}

type LenderAccountNode = {
  address: string
  market: { id: string }
}

type FetchParams = {
  borrowerAddress: string
  marketIds: string[]
  fromTimestamp: number | null
  toTimestamp: number | null
}

const paginateAll = async <Node>(
  fetchPage: (first: number, skip: number) => Promise<Node[]>,
): Promise<Node[]> => {
  const collected: Node[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const skip = page * PAGE_SIZE
    // eslint-disable-next-line no-await-in-loop
    const batch = await fetchPage(PAGE_SIZE, skip)
    collected.push(...batch)
    if (batch.length < PAGE_SIZE) return collected
  }
  throw new Error(
    "Too many events; please narrow the date range or market selection.",
  )
}

const toBorrowEvent = (node: BorrowNode): BorrowerExportEvent => ({
  type: "Borrow",
  timestamp: node.blockTimestamp,
  marketId: node.market.id,
  marketName: node.market.name,
  assetSymbol: node.market.asset.symbol,
  assetDecimals: node.market.asset.decimals,
  amountRaw: node.assetAmount,
  txHash: node.transactionHash,
})

const toRepayEvent = (node: RepayNode): BorrowerExportEvent => ({
  type: "Repay",
  timestamp: node.blockTimestamp,
  marketId: node.market.id,
  marketName: node.market.name,
  assetSymbol: node.market.asset.symbol,
  assetDecimals: node.market.asset.decimals,
  amountRaw: node.assetAmount,
  txHash: node.transactionHash,
})

const toAprChangeEvent = (node: AprChangeNode): BorrowerExportEvent => ({
  type: "APR change",
  timestamp: node.blockTimestamp,
  marketId: node.market.id,
  marketName: node.market.name,
  assetSymbol: node.market.asset.symbol,
  assetDecimals: node.market.asset.decimals,
  oldBips: node.oldAnnualInterestBips,
  newBips: node.newAnnualInterestBips,
  txHash: node.transactionHash,
})

const toCapacityChangeEvent = (
  node: CapacityChangeNode,
): BorrowerExportEvent => ({
  type: "Capacity change",
  timestamp: node.blockTimestamp,
  marketId: node.market.id,
  marketName: node.market.name,
  assetSymbol: node.market.asset.symbol,
  assetDecimals: node.market.asset.decimals,
  oldMaxRaw: node.oldMaxTotalSupply,
  newMaxRaw: node.newMaxTotalSupply,
  txHash: node.transactionHash,
})

const HOUR_SECONDS = 3600

const buildDelinquencyEvents = (
  nodes: DelinquencyNode[],
  nowSeconds: number,
): BorrowerExportEvent[] => {
  const sorted = [...nodes].sort(
    (left, right) => left.blockTimestamp - right.blockTimestamp,
  )
  const cycles: BorrowerExportEvent[] = []
  const openByMarket = new Map<
    string,
    {
      startTimestamp: number
      market: DelinquencyNode["market"]
      txHash: string
    }
  >()

  sorted.forEach((node) => {
    const marketId = node.market.id
    if (node.isDelinquent) {
      if (!openByMarket.has(marketId)) {
        openByMarket.set(marketId, {
          startTimestamp: node.blockTimestamp,
          market: node.market,
          txHash: node.transactionHash,
        })
      }
      return
    }

    const open = openByMarket.get(marketId)
    if (!open) return

    const durationSeconds = node.blockTimestamp - open.startTimestamp
    const durationHours = durationSeconds / HOUR_SECONDS
    cycles.push({
      type: "Delinquency",
      timestamp: open.startTimestamp,
      marketId,
      marketName: open.market.name,
      assetSymbol: open.market.asset.symbol,
      assetDecimals: open.market.asset.decimals,
      startTimestamp: open.startTimestamp,
      cureTimestamp: node.blockTimestamp,
      durationHours,
      penaltyTriggered: durationSeconds > open.market.delinquencyGracePeriod,
      txHash: open.txHash,
    })
    openByMarket.delete(marketId)
  })

  openByMarket.forEach((open, marketId) => {
    const durationSeconds = nowSeconds - open.startTimestamp
    const durationHours = durationSeconds / HOUR_SECONDS
    cycles.push({
      type: "Delinquency",
      timestamp: open.startTimestamp,
      marketId,
      marketName: open.market.name,
      assetSymbol: open.market.asset.symbol,
      assetDecimals: open.market.asset.decimals,
      startTimestamp: open.startTimestamp,
      cureTimestamp: null,
      durationHours,
      penaltyTriggered: durationSeconds > open.market.delinquencyGracePeriod,
      txHash: open.txHash,
    })
  })

  return cycles
}

const buildAggregate = (
  market: MarketAggregateNode,
  lenderCount: number,
): BorrowerExportMarketAggregate => ({
  marketId: market.id,
  marketName: market.name,
  assetSymbol: market.asset.symbol,
  assetDecimals: market.asset.decimals,
  totalBaseInterestAccruedRaw: market.totalBaseInterestAccrued,
  totalRepaidRaw: market.totalRepaid,
  totalDepositedRaw: market.totalDeposited,
  totalWithdrawalsExecutedRaw: market.totalWithdrawalsExecuted,
  activeLenderCount: lenderCount,
})

export const fetchBorrowerExportData = async (
  client: ApolloClient<unknown>,
  params: FetchParams,
): Promise<BorrowerExportData> => {
  if (params.marketIds.length === 0) {
    return { events: [], aggregates: [] }
  }

  const eventVariables = {
    marketIds: params.marketIds.map((id) => id.toLowerCase()),
  }

  const [
    borrows,
    repays,
    aprChanges,
    capacityChanges,
    delinquencies,
    markets,
    lenderAccounts,
  ] = await Promise.all([
    paginateAll<BorrowNode>(async (first, skip) => {
      const result = await client.query<{ borrows: BorrowNode[] }>({
        query: GET_BORROWER_EXPORT_BORROWS,
        variables: { ...eventVariables, first, skip },
        fetchPolicy: "no-cache",
      })
      return result.data.borrows
    }),
    paginateAll<RepayNode>(async (first, skip) => {
      const result = await client.query<{ debtRepaids: RepayNode[] }>({
        query: GET_BORROWER_EXPORT_REPAYS,
        variables: { ...eventVariables, first, skip },
        fetchPolicy: "no-cache",
      })
      return result.data.debtRepaids
    }),
    paginateAll<AprChangeNode>(async (first, skip) => {
      const result = await client.query<{
        annualInterestBipsUpdateds: AprChangeNode[]
      }>({
        query: GET_BORROWER_EXPORT_APR_CHANGES,
        variables: { ...eventVariables, first, skip },
        fetchPolicy: "no-cache",
      })
      return result.data.annualInterestBipsUpdateds
    }),
    paginateAll<CapacityChangeNode>(async (first, skip) => {
      const result = await client.query<{
        maxTotalSupplyUpdateds: CapacityChangeNode[]
      }>({
        query: GET_BORROWER_EXPORT_CAPACITY_CHANGES,
        variables: { ...eventVariables, first, skip },
        fetchPolicy: "no-cache",
      })
      return result.data.maxTotalSupplyUpdateds
    }),
    paginateAll<DelinquencyNode>(async (first, skip) => {
      const result = await client.query<{
        delinquencyStatusChangeds: DelinquencyNode[]
      }>({
        query: GET_BORROWER_EXPORT_DELINQUENCIES,
        variables: { ...eventVariables, first, skip },
        fetchPolicy: "no-cache",
      })
      return result.data.delinquencyStatusChangeds
    }),
    (async () => {
      const result = await client.query<{ markets: MarketAggregateNode[] }>({
        query: GET_BORROWER_EXPORT_MARKETS,
        variables: { marketIds: eventVariables.marketIds },
        fetchPolicy: "no-cache",
      })
      return result.data.markets
    })(),
    paginateAll<LenderAccountNode>(async (first, skip) => {
      const result = await client.query<{
        lenderAccounts: LenderAccountNode[]
      }>({
        query: GET_BORROWER_EXPORT_LENDER_ACCOUNTS,
        variables: { ...eventVariables, first, skip },
        fetchPolicy: "no-cache",
      })
      return result.data.lenderAccounts
    }),
  ])

  const lenderCountByMarket = new Map<string, number>()
  lenderAccounts.forEach((account) => {
    const marketId = account.market.id
    lenderCountByMarket.set(
      marketId,
      (lenderCountByMarket.get(marketId) ?? 0) + 1,
    )
  })

  const nowSeconds = Math.floor(Date.now() / 1000)

  const events: BorrowerExportEvent[] = [
    ...borrows.map(toBorrowEvent),
    ...repays.map(toRepayEvent),
    ...aprChanges.map(toAprChangeEvent),
    ...capacityChanges.map(toCapacityChangeEvent),
    ...buildDelinquencyEvents(delinquencies, nowSeconds),
  ]

  const aggregates: BorrowerExportMarketAggregate[] = markets.map((market) =>
    buildAggregate(market, lenderCountByMarket.get(market.id) ?? 0),
  )

  return { events, aggregates }
}

export type UseBorrowerExportDataOptions = {
  borrowerAddress: `0x${string}` | undefined
  marketIds: string[]
}

export const useBorrowerExportData = ({
  borrowerAddress,
  marketIds,
}: UseBorrowerExportDataOptions) => {
  const { chainId } = useSelectedNetwork()

  return useMutation<
    BorrowerExportData,
    Error,
    { fromTimestamp: number | null; toTimestamp: number | null }
  >({
    mutationFn: async (filters) => {
      if (!borrowerAddress) throw new Error("Missing borrower address")
      const client = getHinterlightClient(chainId)
      if (!client) {
        throw new Error("Hinterlight not supported on this network")
      }
      return fetchBorrowerExportData(client, {
        borrowerAddress,
        marketIds,
        fromTimestamp: filters.fromTimestamp,
        toTimestamp: filters.toTimestamp,
      })
    },
  })
}
