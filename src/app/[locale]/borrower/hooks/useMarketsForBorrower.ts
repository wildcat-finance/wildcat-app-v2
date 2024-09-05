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
              m.underlyingToken.address.toLowerCase() ===
              "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          )
          .map((m) => [m]),
        markets.filter(
          (m) =>
            m.underlyingToken.address.toLowerCase() !==
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        ),
      ]
    } else {
      chunks = [markets]
    }

    console.log("DEBUG MARKET CHUNKS", chunks)

    await Promise.all(
      chunks.map(async (marketsChunk) => {
        try {
          console.log("DEBUG UPDATE REQUESTED")
          const updates = await lens.getMarketsData(
            marketsChunk.map((m) => m.address),
          )
          console.log(
            "DEBUG UPDATE ADRESSSED",
            marketsChunk.map((m) => m.address),
          )
          marketsChunk.forEach((market, i) => {
            market.updateWith(updates[i])
            if (
              market.address === "0xaedfd7255f30b651c687831b47d73b179a8adc89"
            ) {
              console.log("DEBUG UPDATED MARKET", {
                market,
                update: updates[i],
                delinquent: market.timeDelinquent,
              })
            }
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

    subgraphMarkets?.forEach((market) => {
      if (market.address === "0xaedfd7255f30b651c687831b47d73b179a8adc89") {
        console.log("DEBUG JUL MARKET SUBGRAPH", market)
      }
    })
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
