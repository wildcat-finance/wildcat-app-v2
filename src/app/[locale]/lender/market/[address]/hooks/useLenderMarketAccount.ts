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

import { TargetChainId } from "@/config/network"
import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { TwoStepQueryHookResult } from "@/utils/types"

export const GET_LENDER_MARKET_ACCOUNT_KEY = "get-lender-market-account"

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
  const marketAddress = market?.address.toLowerCase()
  const lenderAddress = lender?.toLowerCase()

  async function queryMarketAccount() {
    const result = await getLenderAccountForMarket(SubgraphClient, {
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
    queryKey: [
      GET_LENDER_MARKET_ACCOUNT_KEY,
      "initial",
      marketAddress,
      lenderAddress,
    ],
    refetchInterval: POLLING_INTERVAL,
    queryFn: queryMarketAccount,
    enabled,
    refetchOnMount: false,
  })

  async function updateMarketAccount() {
    if (!data || !provider) throw Error()
    if (data.market.version === MarketVersion.V1) {
      const lens = getLensContract(TargetChainId, provider)
      const update = await lens.getMarketDataWithLenderStatus(
        lenderAddress as string,
        marketAddress as string,
      )
      data.updateWith(update.lenderStatus)
      data.market.updateWith(update.market)
    } else {
      const lens = getLensV2Contract(TargetChainId, provider)
      const update = await lens.getMarketDataWithLenderStatus(
        lenderAddress as string,
        marketAddress as string,
      )
      data.updateWith(update.lenderStatus)
      data.market.updateWith(update.market)
    }
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
    queryKey: [
      GET_LENDER_MARKET_ACCOUNT_KEY,
      "update",
      marketAddress,
      lenderAddress,
    ],
    queryFn: updateMarketAccount,
    refetchInterval: POLLING_INTERVAL,
    placeholderData: keepPreviousData,
    enabled: !!data,
    refetchOnMount: false,
  })

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
