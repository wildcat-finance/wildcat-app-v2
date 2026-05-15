import { gql, type ApolloClient } from "@apollo/client"
import { useMutation } from "@tanstack/react-query"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getHinterlightClient } from "@/lib/hinterlight"
import type {
  LenderExportEvent,
  LenderExportEventType,
} from "@/utils/lenderCsvExport"

export const PAGE_SIZE = 1000
export const MAX_PAGES = 10

const GET_LENDER_EXPORT_DEPOSITS = gql`
  query getLenderExportDeposits(
    $accountIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    deposits(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      market {
        id
        name
        borrower
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

const GET_LENDER_EXPORT_WITHDRAWAL_REQUESTS = gql`
  query getLenderExportWithdrawalRequests(
    $accountIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    withdrawalRequests(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      market {
        id
        name
        borrower
        asset {
          symbol
          decimals
        }
      }
      normalizedAmount
      blockTimestamp
      transactionHash
    }
  }
`

const GET_LENDER_EXPORT_WITHDRAWAL_EXECUTIONS = gql`
  query getLenderExportWithdrawalExecutions(
    $accountIds: [String!]!
    $first: Int!
    $skip: Int!
  ) {
    withdrawalExecutions(
      where: { account_in: $accountIds }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      account {
        market {
          id
          name
          borrower
          asset {
            symbol
            decimals
          }
        }
      }
      normalizedAmount
      blockTimestamp
      transactionHash
    }
  }
`

type MarketShape = {
  id: string
  name: string
  borrower: string
  asset: { symbol: string; decimals: number }
}

type DepositNode = {
  market: MarketShape
  assetAmount: string
  blockTimestamp: number
  transactionHash: string
}

type WithdrawalRequestNode = {
  market: MarketShape
  normalizedAmount: string
  blockTimestamp: number
  transactionHash: string
}

type WithdrawalExecutionNode = {
  account: { market: MarketShape }
  normalizedAmount: string
  blockTimestamp: number
  transactionHash: string
}

type FetchParams = {
  lenderAddress: string
  marketIds: string[]
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

const toDepositEvent = (node: DepositNode): LenderExportEvent => ({
  timestamp: node.blockTimestamp,
  marketId: node.market.id,
  marketName: node.market.name,
  borrowerAddress: node.market.borrower,
  type: "Deposit" as LenderExportEventType,
  amountRaw: node.assetAmount,
  assetSymbol: node.market.asset.symbol,
  assetDecimals: node.market.asset.decimals,
  txHash: node.transactionHash,
})

const toWithdrawalRequestEvent = (
  node: WithdrawalRequestNode,
): LenderExportEvent => ({
  timestamp: node.blockTimestamp,
  marketId: node.market.id,
  marketName: node.market.name,
  borrowerAddress: node.market.borrower,
  type: "Withdrawal Request" as LenderExportEventType,
  amountRaw: node.normalizedAmount,
  assetSymbol: node.market.asset.symbol,
  assetDecimals: node.market.asset.decimals,
  txHash: node.transactionHash,
})

const toWithdrawalExecutionEvent = (
  node: WithdrawalExecutionNode,
): LenderExportEvent => ({
  timestamp: node.blockTimestamp,
  marketId: node.account.market.id,
  marketName: node.account.market.name,
  borrowerAddress: node.account.market.borrower,
  type: "Withdrawal Execution" as LenderExportEventType,
  amountRaw: node.normalizedAmount,
  assetSymbol: node.account.market.asset.symbol,
  assetDecimals: node.account.market.asset.decimals,
  txHash: node.transactionHash,
})

export const fetchLenderExportData = async (
  client: ApolloClient<unknown>,
  params: FetchParams,
): Promise<LenderExportEvent[]> => {
  if (params.marketIds.length === 0) return []

  const accountIds = params.marketIds.map(
    (marketId) =>
      `LENDER-${marketId.toLowerCase()}-${params.lenderAddress.toLowerCase()}`,
  )

  const [deposits, withdrawalRequests, withdrawalExecutions] =
    await Promise.all([
      paginateAll<DepositNode>(async (first, skip) => {
        const result = await client.query<{ deposits: DepositNode[] }>({
          query: GET_LENDER_EXPORT_DEPOSITS,
          variables: { accountIds, first, skip },
          fetchPolicy: "no-cache",
        })
        return result.data.deposits
      }),
      paginateAll<WithdrawalRequestNode>(async (first, skip) => {
        const result = await client.query<{
          withdrawalRequests: WithdrawalRequestNode[]
        }>({
          query: GET_LENDER_EXPORT_WITHDRAWAL_REQUESTS,
          variables: { accountIds, first, skip },
          fetchPolicy: "no-cache",
        })
        return result.data.withdrawalRequests
      }),
      paginateAll<WithdrawalExecutionNode>(async (first, skip) => {
        const result = await client.query<{
          withdrawalExecutions: WithdrawalExecutionNode[]
        }>({
          query: GET_LENDER_EXPORT_WITHDRAWAL_EXECUTIONS,
          variables: { accountIds, first, skip },
          fetchPolicy: "no-cache",
        })
        return result.data.withdrawalExecutions
      }),
    ])

  return [
    ...deposits.map(toDepositEvent),
    ...withdrawalRequests.map(toWithdrawalRequestEvent),
    ...withdrawalExecutions.map(toWithdrawalExecutionEvent),
  ]
}

export type UseLenderExportDataOptions = {
  lenderAddress: `0x${string}` | undefined
  marketIds: string[]
}

export const useLenderExportData = ({
  lenderAddress,
  marketIds,
}: UseLenderExportDataOptions) => {
  const { chainId } = useSelectedNetwork()

  return useMutation<LenderExportEvent[], Error, void>({
    mutationFn: async () => {
      if (!lenderAddress) throw new Error("Missing lender address")
      const client = getHinterlightClient(chainId)
      if (!client) {
        throw new Error("Hinterlight not supported on this network")
      }
      return fetchLenderExportData(client, {
        lenderAddress,
        marketIds,
      })
    },
  })
}
