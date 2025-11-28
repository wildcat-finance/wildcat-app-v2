import { useEffect } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketAccount,
  SignerOrProvider,
  getLensContract,
  getLenderAccountForMarket,
  MarketVersion,
  getLensV2Contract,
} from "@wildcatfi/wildcat-sdk"
import { SubgraphGetMarketQueryVariables } from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { constants } from "ethers"
import { useBlockNumber } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { usePageVisible } from "@/hooks/usePageVisible"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { TwoStepQueryHookResult } from "@/utils/types"

export type UseLenderProps = {
  market: Market | undefined
  lender: string | undefined
  provider: SignerOrProvider | undefined
  enabled: boolean
} & Omit<SubgraphGetMarketQueryVariables, "market">

export function useLenderMarketAccountQuery({
  market,
  lender,
  provider,
  enabled,
  ...filters
}: UseLenderProps): TwoStepQueryHookResult<MarketAccount | undefined> {
  const subgraphClient = useSubgraphClient()
  const marketAddress = market?.address.toLowerCase()
  const lenderAddress = lender?.toLowerCase()
  const { chainId: targetChainId } = useSelectedNetwork()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const isVisible = usePageVisible()
  const refetchInterval = isVisible ? POLLING_INTERVAL : false

  async function queryMarketAccount() {
    if (!market || !lender || market.chainId !== targetChainId) throw Error()
    const result = await getLenderAccountForMarket(subgraphClient, {
      market: market as Market,
      lender: lenderAddress as string,
      fetchPolicy: "network-only",
      ...filters,
    })

    return result
  }

  const {
    data,
    isLoading: isLoadingInitial,
    refetch: refetchInitial,
    isError: isErrorInitial,
    failureReason: errorInitial,
  } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKET_ACCOUNT(
      targetChainId,
      marketAddress,
      lenderAddress,
      "initial",
    ),
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    queryFn: queryMarketAccount,
    enabled,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  })

  async function updateMarketAccount() {
    if (!data || !provider || !market || market.chainId !== targetChainId)
      throw Error()
    if (data.market.version === MarketVersion.V1) {
      const lens = getLensContract(market.chainId, provider)
      const update = await lens.getMarketDataWithLenderStatus(
        lenderAddress as string,
        marketAddress as string,
      )
      data.updateWith(update.lenderStatus)
      data.market.updateWith(update.market)
    } else {
      const lens = getLensV2Contract(market.chainId, provider)
      const update = await lens.getMarketDataWithLenderStatus(
        lenderAddress as string,
        marketAddress as string,
      )
      data.updateWith(update.lenderStatus)
      data.market.updateWith(update.market)
    }
    // @TODO Check chain id here
    if (market && market.provider !== provider) {
      market.provider = provider
    }
    return data
  }

  const {
    data: updatedLender,
    isLoading: isLoadingUpdate,
    isPaused: isPendingUpdate,
    refetch: refetchUpdate,
    isError: isErrorUpdate,
    failureReason: errorUpdate,
  } = useQuery({
    queryKey: QueryKeys.Lender.GET_MARKET_ACCOUNT(
      targetChainId,
      marketAddress,
      lenderAddress,
      "update",
    ),
    queryFn: updateMarketAccount,
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: !!data && isVisible,
    refetchOnMount: false,
  })

  useEffect(() => {
    if (
      data &&
      provider &&
      data.market.provider &&
      data.market.provider !== provider
    ) {
      data.market.provider = provider
    }
  }, [provider])

  useEffect(() => {
    if (!data || !isVisible || blockNumber === undefined) return
    refetchUpdate()
  }, [blockNumber, data, isVisible, refetchUpdate])

  return {
    data: updatedLender ?? data,
    isLoadingInitial,
    isErrorInitial,
    errorInitial: errorInitial as Error | null,
    refetchInitial,
    isLoadingUpdate,
    isPendingUpdate,
    isErrorUpdate,
    errorUpdate: errorUpdate as Error | null,
    refetchUpdate,
  }
}

export const useLenderMarketAccount = (market: Market | undefined) => {
  const { address, signer, provider, isWrongNetwork } = useEthersProvider()
  const signerOrProvider = signer ?? provider

  return useLenderMarketAccountQuery({
    market,
    lender: address ?? constants.AddressZero,
    provider: signerOrProvider,
    enabled: !!market && !!signerOrProvider && !isWrongNetwork,
  })
}
