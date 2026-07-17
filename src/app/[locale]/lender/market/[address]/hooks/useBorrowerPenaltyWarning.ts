import { useQuery } from "@tanstack/react-query"
import {
  getIndexedMarketList,
  getSubgraphClient,
  Market,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { updateMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets"
import { NETWORKS_BY_ID } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { isNotExcludedMarket } from "@/utils/filters"

import { shouldMarketTriggerBorrowerPenaltyWarning } from "../utils"

type BorrowerPenaltyWarningResult = {
  shouldWarn: boolean
  triggeringMarkets: Market[]
}

const emptyBorrowerPenaltyWarningResult: BorrowerPenaltyWarningResult = {
  shouldWarn: false,
  triggeringMarkets: [],
}

export const useBorrowerPenaltyWarning = (market: Market | undefined) => {
  const chainId = market?.chainId as SupportedChainId | undefined
  const borrowerAddress = market?.borrower.toLowerCase()
  const network = chainId ? NETWORKS_BY_ID[chainId] : undefined
  const { provider, signer } = useEthersProvider({ chainId })
  const signerOrProvider = signer ?? provider

  const query = useQuery<BorrowerPenaltyWarningResult>({
    queryKey: QueryKeys.Lender.GET_BORROWER_PENALTY_WARNING(
      chainId ?? 0,
      borrowerAddress,
    ),
    queryFn: async () => {
      if (!chainId || !borrowerAddress || !signerOrProvider || !network) {
        return emptyBorrowerPenaltyWarningResult
      }

      const subgraphClient = getSubgraphClient(chainId)
      const indexedMarkets = await getIndexedMarketList(subgraphClient, {
        chainId,
        signerOrProvider: signerOrProvider as SignerOrProvider,
        fetchPolicy: "network-only",
        filter: {
          borrower: borrowerAddress,
          excludeAddresses: EXCLUDED_MARKETS,
        },
      })
      const updatedMarkets = await updateMarkets(
        indexedMarkets.filter(isNotExcludedMarket),
        signerOrProvider,
        network,
      )
      const triggeringMarkets = updatedMarkets.filter(
        shouldMarketTriggerBorrowerPenaltyWarning,
      )

      return {
        shouldWarn: triggeringMarkets.length > 0,
        triggeringMarkets,
      }
    },
    refetchInterval: POLLING_INTERVAL,
    enabled: !!chainId && !!borrowerAddress && !!signerOrProvider && !!network,
    refetchOnMount: false,
  })

  return {
    ...query,
    shouldWarn: query.data?.shouldWarn ?? false,
    triggeringMarkets: query.data?.triggeringMarkets ?? [],
  }
}
