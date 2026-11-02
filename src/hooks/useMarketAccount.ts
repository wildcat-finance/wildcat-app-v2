import { useEffect, useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import {
  getLenderAccountForMarket,
  MarketVersion,
  Market,
  MarketAccount,
  getSubgraphClient,
  SignerOrProvider,
} from "@wildcatfi/wildcat-sdk"
import { SubgraphGetMarketQueryVariables } from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { constants } from "ethers"
import { useAccount } from "wagmi"

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

export type MarketAccountResolutionStatus =
  | "idle"
  | "resolving"
  | "error"
  | "resolved"

type MarketAccountQueryResult = TwoStepQueryHookResult<
  MarketAccount | undefined
> & {
  /** Last successful live read for this wallet, market and chain. */
  liveAccount: MarketAccount | undefined
  authoritativeStatus: MarketAccountResolutionStatus
}

export function useMarketAccountQuery({
  market,
  account,
  provider,
  enabled,
  ...filters
}: UseMarketAccountProps): MarketAccountQueryResult {
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
    if (!provider || !market || !accountAddress || !marketAddress) throw Error()
    // SDK 3.1 uses separate readers for V1 and V2. Passing the address loads a
    // fresh market and account together, independently of the indexed account.
    const readAccount =
      market.version === MarketVersion.V1
        ? MarketAccount.getMarketAccount
        : MarketAccount.getMarketAccountV2
    return readAccount(market.chainId, provider, accountAddress, marketAddress)
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
    enabled: enabled && !!market && !!accountAddress && !!provider,
    refetchOnMount: false,
  })

  const accountWithHistory = useMemo(() => {
    if (!updatedAccount) return data
    if (!data) return updatedAccount
    // Keep indexed history without overwriting live permissions/balances or
    // mutating either query's cached SDK object.
    const merged = new MarketAccount({ ...data, ...updatedAccount })
    merged.depositRecords = data.depositRecords
    if (merged.lastScaleFactor?.lte(merged.market.scaleFactor)) {
      merged.processInterestAccrued()
    }
    return merged
  }, [data, updatedAccount])

  useEffect(() => {
    ;[data, updatedAccount].forEach((value) => {
      if (value && provider && value.market.provider !== provider) {
        value.market.provider = provider
      }
    })
  }, [provider, data, updatedAccount])

  let authoritativeStatus: MarketAccountResolutionStatus = "idle"
  if (enabled) {
    if (updatedAccount) authoritativeStatus = "resolved"
    else if (isErrorUpdate || isPendingUpdate) authoritativeStatus = "error"
    else authoritativeStatus = "resolving"
  }

  return {
    data: accountWithHistory,
    liveAccount: updatedAccount,
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

export const useMarketAccount = (market: Market | undefined) => {
  const { address } = useAccount()
  const { signer, provider, isWrongNetwork } = useEthersProvider({
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
