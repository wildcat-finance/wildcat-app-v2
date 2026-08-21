import { useQuery } from "@tanstack/react-query"
import { getIndexedMarketList } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { isNotExcludedMarket } from "@/utils/filters"
import { refetchOnMountIfInvalidated } from "@/utils/marketListQueries"

import { GetMarketsProps } from "./interface"

export function useGetOthersMarketsQuery({
  provider,
  enabled,
  chainId,
}: GetMarketsProps) {
  const { address } = useAccount()
  const subgraphClient = useSubgraphClient()
  const network = useSelectedNetwork()

  async function queryAllMarkets() {
    if (!chainId || !provider) return []
    const markets = await getIndexedMarketList(subgraphClient, {
      chainId,
      fetchPolicy: "network-only",
      signerOrProvider: provider,
      filter: { excludeAddresses: EXCLUDED_MARKETS },
    })
    return markets.filter(
      (market) =>
        isNotExcludedMarket(market) &&
        market.borrower.toLowerCase() !== address?.toLowerCase(),
    )
  }

  async function getAllMarkets() {
    const subgraphMarkets = await queryAllMarkets()
    return updateMarkets(subgraphMarkets, provider, network)
  }

  return useQuery({
    queryKey: QueryKeys.Borrower.GET_ALL_MARKETS(network.chainId, address),
    queryFn: getAllMarkets,
    refetchInterval: POLLING_INTERVAL,
    enabled,
    refetchOnMount: refetchOnMountIfInvalidated,
  })
}

export const useGetOthersMarkets = () => {
  const { chainId } = useSelectedNetwork()
  const { isWrongNetwork, provider, signer } = useEthersProvider()

  const signerOrProvider = signer ?? provider

  return useGetOthersMarketsQuery({
    provider: signerOrProvider,
    enabled: !!signerOrProvider && !isWrongNetwork,
    chainId,
  })
}
