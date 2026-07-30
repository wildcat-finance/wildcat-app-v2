import { useQuery } from "@tanstack/react-query"
import {
  Market,
  MarketAccount,
  SignerOrProvider,
  getLenderAccountForMarket,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"
import { zeroAddress } from "viem"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { TwoStepQueryHookResult } from "@/utils/types"

export type UseLenderProps = {
  market: Market | undefined
  lender: string | undefined
  provider: SignerOrProvider | undefined
  enabled: boolean
}

export type LenderAccountResolutionStatus =
  | "idle"
  | "resolving"
  | "error"
  | "resolved"

export type UseLenderMarketAccountResult = TwoStepQueryHookResult<
  MarketAccount | undefined
> & {
  authoritativeAccount: MarketAccount | undefined
  authoritativeStatus: LenderAccountResolutionStatus
}

export function useLenderMarketAccountQuery({
  market,
  lender,
  provider,
  enabled,
}: UseLenderProps): UseLenderMarketAccountResult {
  const marketAddress = market?.address.toLowerCase()
  const lenderAddress = lender?.toLowerCase()

  const { chainId } = useSelectedNetwork()
  const targetChainId = market?.chainId ?? chainId
  const subgraphClient = getSubgraphClient(targetChainId)

  async function queryMarketAccount() {
    if (!market || !lender) throw Error()
    const result = await getLenderAccountForMarket(subgraphClient, {
      market: market as Market,
      lender: lenderAddress as string,
      fetchPolicy: "network-only",
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
    refetchInterval: POLLING_INTERVAL,
    queryFn: queryMarketAccount,
    enabled,
    refetchOnMount: false,
  })

  async function updateMarketAccount() {
    if (!provider || !market || !lenderAddress || !marketAddress) throw Error()
    const updated = await MarketAccount.getMarketAccount(
      market.chainId,
      provider,
      lenderAddress,
      marketAddress,
    )
    return updated
  }

  const authoritativeQueryEnabled =
    enabled && !!provider && !!market && !!lenderAddress && !!marketAddress

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
    refetchInterval: POLLING_INTERVAL,
    enabled: authoritativeQueryEnabled,
    refetchOnMount: false,
  })

  let authoritativeStatus: LenderAccountResolutionStatus = "idle"
  if (authoritativeQueryEnabled) {
    if (updatedLender) authoritativeStatus = "resolved"
    else if (isErrorUpdate) authoritativeStatus = "error"
    else authoritativeStatus = "resolving"
  }

  return {
    data: updatedLender ?? data,
    authoritativeAccount: updatedLender,
    authoritativeStatus,
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
  const { address, signer, provider, isWrongNetwork } = useEthersProvider({
    chainId: market?.chainId,
  })
  const signerOrProvider = signer ?? provider

  return useLenderMarketAccountQuery({
    market,
    lender: address ?? zeroAddress,
    provider: signerOrProvider,
    enabled: !!market && !!signerOrProvider && !isWrongNetwork,
  })
}
