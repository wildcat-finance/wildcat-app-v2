import { useCallback } from "react"

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
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { EXCLUDED_MARKETS } from "@/utils/constants"
import { isNotExcludedMarket } from "@/utils/filters"

import { shouldMarketTriggerBorrowerPenaltyWarning } from "../utils"

export type BorrowerPenaltyWarningResult = {
  shouldWarn: boolean
  triggeringMarkets: Market[]
}

export type BorrowerPenaltyWarningState =
  | "loading"
  | "clear"
  | "warning"
  | "unknown"

const borrowerPenaltyWarningStaleTime = 5 * 60 * 1000

export const useBorrowerPenaltyWarning = (market: Market | undefined) => {
  const chainId = market?.chainId as SupportedChainId | undefined
  const borrowerAddress = market?.borrower.toLowerCase()
  const network = chainId ? NETWORKS_BY_ID[chainId] : undefined
  const { provider, signer } = useEthersProvider({ chainId })
  const signerOrProvider = signer ?? provider
  const enabled =
    !!chainId && !!borrowerAddress && !!signerOrProvider && !!network

  const query = useQuery<BorrowerPenaltyWarningResult>({
    queryKey: QueryKeys.Lender.GET_BORROWER_PENALTY_WARNING(
      chainId ?? 0,
      borrowerAddress,
    ),
    queryFn: async () => {
      if (!chainId || !borrowerAddress || !signerOrProvider || !network) {
        throw new Error(
          "Borrower penalty warning prerequisites are unavailable",
        )
      }

      const subgraphClient = getSubgraphClient(chainId)
      const indexedMarkets = await getIndexedMarketList(subgraphClient, {
        chainId,
        signerOrProvider: signerOrProvider as SignerOrProvider,
        fetchPolicy: "network-only",
        filter: {
          borrower: borrowerAddress,
          excludeAddresses: EXCLUDED_MARKETS,
          isClosed: false,
        },
      })
      const updatedMarkets = await updateMarkets(
        indexedMarkets.filter(isNotExcludedMarket),
        signerOrProvider,
        network,
        { throwOnError: true },
      )
      const triggeringMarkets = updatedMarkets.filter(
        shouldMarketTriggerBorrowerPenaltyWarning,
      )

      return {
        shouldWarn: triggeringMarkets.length > 0,
        triggeringMarkets,
      }
    },
    enabled,
    staleTime: borrowerPenaltyWarningStaleTime,
    refetchOnWindowFocus: true,
    retry: false,
  })

  let state: BorrowerPenaltyWarningState
  if (!enabled || query.isPending) {
    state = "loading"
  } else if (query.isError || !query.data) {
    state = "unknown"
  } else {
    state = query.data.shouldWarn ? "warning" : "clear"
  }

  const { refetch } = query
  const refresh =
    useCallback(async (): Promise<BorrowerPenaltyWarningState> => {
      if (!enabled) return "unknown"

      try {
        const result = await refetch({ cancelRefetch: false })
        if (result.isError || !result.data) return "unknown"
        return result.data.shouldWarn ? "warning" : "clear"
      } catch {
        return "unknown"
      }
    }, [enabled, refetch])

  return {
    ...query,
    state,
    refresh,
    shouldWarn: state === "warning",
    triggeringMarkets: query.data?.triggeringMarkets ?? [],
  }
}
