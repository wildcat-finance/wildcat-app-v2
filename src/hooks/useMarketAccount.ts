import { useEffect } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  getLenderAccountForMarket,
  getLensContract,
  getLensV2Contract,
  MarketVersion,
  Market,
  MarketAccount,
  getSubgraphClient,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"
import { SubgraphGetMarketQueryVariables } from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { constants } from "ethers"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { TwoStepQueryHookResult } from "@/utils/types"

export type UseMarketAccountProps = {
  market: Market | undefined
  account: string | undefined
  provider: SignerOrProvider | undefined
  enabled: boolean
} & Omit<SubgraphGetMarketQueryVariables, "market">

export function useMarketAccountQuery({
  market,
  account,
  provider,
  enabled,
  ...filters
}: UseMarketAccountProps): TwoStepQueryHookResult<MarketAccount | undefined> {
  const marketAddress = market?.address.toLowerCase()
  const accountAddress = account?.toLowerCase()

  const { chainId } = useSelectedNetwork()
  const targetChainId = market?.chainId ?? chainId
  const subgraphClient =
    typeof targetChainId === "number"
      ? getSubgraphClient(targetChainId)
      : undefined

  async function queryMarketAccount() {
    if (!market || !account || !subgraphClient) throw Error()
    const result = await getLenderAccountForMarket(subgraphClient, {
      market: market as Market,
      lender: accountAddress as string,
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
    queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.INITIAL(
      targetChainId,
      marketAddress,
      accountAddress,
    ),
    refetchInterval: POLLING_INTERVAL,
    queryFn: queryMarketAccount,
    enabled: enabled && !!subgraphClient,
    refetchOnMount: false,
  })

  async function updateMarketAccount() {
    if (!data || !provider || !market) throw Error()
    if (data.market.version === MarketVersion.V1) {
      const lens = getLensContract(market.chainId, provider)
      const update = await lens.getMarketDataWithLenderStatus(
        accountAddress as string,
        marketAddress as string,
      )
      data.updateWith(update.lenderStatus)
      data.market.updateWith(update.market)
    } else {
      const lens = getLensV2Contract(market.chainId, provider)
      const update = await lens.getMarketDataWithLenderStatus(
        accountAddress as string,
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
    data: updatedAccount,
    isLoading: isLoadingUpdate,
    isPaused: isPendingUpdate,
    refetch: refetchUpdate,
    isError: isErrorUpdate,
    failureReason: errorUpdate,
  } = useQuery({
    queryKey: QueryKeys.Markets.GET_MARKET_ACCOUNT.UPDATE(
      targetChainId,
      marketAddress,
      accountAddress,
    ),
    queryFn: updateMarketAccount,
    refetchInterval: POLLING_INTERVAL,
    placeholderData: keepPreviousData,
    enabled: !!data,
    refetchOnMount: false,
  })

  useEffect(() => {
    if (data && provider && data.market.provider !== provider) {
      data.market.provider = provider
    }
  }, [provider, data])

  return {
    data: updatedAccount ?? data,
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

export const useMarketAccount = (market: Market | undefined) => {
  const { address, signer, provider, isWrongNetwork } = useEthersProvider({
    chainId: market?.chainId,
  })
  const signerOrProvider = signer ?? provider

  return useMarketAccountQuery({
    market,
    account: address ?? constants.AddressZero,
    provider: signerOrProvider,
    enabled: !!market && !!signerOrProvider && !isWrongNetwork,
  })
}
