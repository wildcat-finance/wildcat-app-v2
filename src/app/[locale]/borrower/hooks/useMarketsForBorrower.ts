import { useQuery } from "@tanstack/react-query"
import {
  getLensContract,
  logger,
  Market,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import {
  GetMarketsForAllBorrowersDocument,
  GetMarketsForBorrowerDocument,
  SubgraphGetMarketsForAllBorrowersQuery,
  SubgraphGetMarketsForAllBorrowersQueryVariables,
  SubgraphGetMarketsForBorrowerQuery,
  SubgraphGetMarketsForBorrowerQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { useAccount } from "wagmi"

import { NETWORKS, TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { TOKENS_ADDRESSES } from "@/utils/constants"

export const GET_BORROWER_MARKETS_LIST_KEY = "get-borrower-markets-list"

export type MarketsForBorrowerProps = {
  borrower: string | undefined
  provider: SignerOrProvider | undefined
  chainId: SupportedChainId | undefined
  enabled: boolean
} & Omit<SubgraphGetMarketsForBorrowerQueryVariables, "borrower">

export function useMarketsForBorrowerQuery({
  borrower: _borrower,
  provider,
  enabled,
  chainId,
  ...filters
}: MarketsForBorrowerProps) {
  const borrower = _borrower?.toLowerCase()

  async function queryMarketsForAllBorrowers() {
    const result = await SubgraphClient.query<
      SubgraphGetMarketsForAllBorrowersQuery,
      SubgraphGetMarketsForAllBorrowersQueryVariables
    >({
      query: GetMarketsForAllBorrowersDocument,
      variables: { ...filters },
      fetchPolicy: "network-only",
    })

    return (
      result.data.markets.map((market) =>
        Market.fromSubgraphMarketData(
          TargetChainId,
          provider as SignerOrProvider,
          market,
        ),
      ) ?? []
    )
  }

  async function queryMarketsForBorrower() {
    const result = await SubgraphClient.query<
      SubgraphGetMarketsForBorrowerQuery,
      SubgraphGetMarketsForBorrowerQueryVariables
    >({
      query: GetMarketsForBorrowerDocument,
      variables: { borrower: borrower as string, ...filters },
      fetchPolicy: "network-only",
    })

    const controller = result.data.controllers[0]
    if (controller) {
      return (
        controller.markets.map((market) =>
          Market.fromSubgraphMarketData(
            TargetChainId,
            provider as SignerOrProvider,
            market,
          ),
        ) ?? []
      )
    }

    return []
  }

  async function updateMarkets(markets: Market[]) {
    const lens = getLensContract(TargetChainId, provider as SignerOrProvider)
    let chunks: Market[][]

    if (TargetChainId === NETWORKS.Mainnet.chainId) {
      chunks = [
        ...markets
          .filter(
            (m) =>
              m.underlyingToken.address.toLowerCase() === TOKENS_ADDRESSES.WETH,
          )
          .map((m) => [m]),
        markets.filter(
          (m) =>
            m.underlyingToken.address.toLowerCase() !== TOKENS_ADDRESSES.WETH,
        ),
      ]
    } else {
      chunks = [markets]
    }

    await Promise.all(
      chunks.map(async (marketsChunk) => {
        try {
          const updates = await lens.getMarketsData(
            marketsChunk.map((m) => m.address),
          )
          marketsChunk.forEach((market, i) => {
            market.updateWith(updates[i])
          })
        } catch (err) {
          console.log("Wrong underlying network detected", err)
        }
      }),
    )
    logger.debug(`Got ${markets.length} market updates`)
    return chunks.flat()
  }

  async function getMarketsForBorrower() {
    const subgraphMarkets = await (borrower
      ? queryMarketsForBorrower
      : queryMarketsForAllBorrowers)()
    return updateMarkets(subgraphMarkets)
  }

  return useQuery({
    queryKey: [GET_BORROWER_MARKETS_LIST_KEY, borrower, chainId],
    queryFn: getMarketsForBorrower,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: false,
  })
}

export const useMarketsForBorrower = (borrower?: string) => {
  const { chainId } = useCurrentNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()
  const { isReconnecting } = useAccount()

  const signerOrProvider = signer ?? provider
  console.log(
    `logging from useMarketsForBorrower.ts: ${borrower} | have provider: ${!!provider} | isWrongNetwork: ${isWrongNetwork}`,
  )

  return useMarketsForBorrowerQuery({
    borrower,
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork && !isReconnecting,
    chainId,
  })
}
