"use client"

import { useQuery } from "@tanstack/react-query"
import {
  SupportedChainId,
  getMarketsWithEvents,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"
import { providers } from "ethers"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"

const CHAIN_ID = SupportedChainId.Mainnet

const subgraphClient = getSubgraphClient(CHAIN_ID)

const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? ""
}`
const provider = new providers.JsonRpcProvider(rpcUrl)

export function useEmbedMarkets() {
  const { data: markets, isLoading: isLoadingMarkets } = useQuery({
    queryKey: ["embed-markets"],
    queryFn: () =>
      getMarketsWithEvents(subgraphClient, {
        chainId: CHAIN_ID,
        fetchPolicy: "network-only",
        signerOrProvider: provider,
      }),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  })

  const { data: borrowers, isLoading: isLoadingBorrowers } = useQuery({
    queryKey: ["embed-borrower-names"],
    queryFn: async () => {
      const res = await fetch(`/api/borrower-names?chainId=${CHAIN_ID}`)
      return res.json() as Promise<BorrowerWithName[]>
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  return {
    markets: markets ?? [],
    borrowers,
    isLoading: isLoadingMarkets || isLoadingBorrowers,
  }
}
