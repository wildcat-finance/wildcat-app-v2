import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getMarketAccount, Market, Signer } from "@wildcatfi/wildcat-sdk"
import { constants } from "ethers"

import { TargetChainId } from "@/config/network"
import { useEthersProvider } from "@/hooks/useEthersSigner"

export const GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY =
  "get-borrower-market-account-legacy"

export const GET_MARKET_ACCOUNT_KEY = "get-market-account"

export const useGetMarketAccountForBorrowerLegacy = (
  market: Market | undefined,
) => {
  const { provider, signer, isWrongNetwork, address } = useEthersProvider()
  const signerOrProvider = signer ?? provider

  async function getMarketAccountFn() {
    return getMarketAccount(
      TargetChainId,
      signerOrProvider as Signer,
      address ?? constants.AddressZero,
      market as Market,
    )
  }

  return useQuery({
    queryKey: [GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY, address, market],
    queryFn: getMarketAccountFn,
    enabled: !!market && !!signerOrProvider && !isWrongNetwork,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  })
}
