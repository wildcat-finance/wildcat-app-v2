import { useQuery } from "@tanstack/react-query"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { QueryKeys } from "@/config/query-keys"

import { useSelectedNetwork } from "./useSelectedNetwork"

export const useMarketMla = (
  marketAddress: string | undefined,
  marketChainId?: number,
) => {
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = marketChainId ?? selectedChainId
  const chainKey = chainId ?? 0
  const getMarketMla = async () => {
    if (!marketAddress || !chainId) return undefined
    const res = await fetch(
      `/api/mla/${marketAddress.toLowerCase()}?chainId=${chainId}`,
    )
    if (res.status === 200) {
      const data = await res.json()
      if (data.noMLA) {
        return { noMLA: true }
      }
      return data as MasterLoanAgreementResponse
    }
    if (res.status === 404) {
      return null
    }

    throw new Error("Failed to fetch MLA")
  }
  return useQuery({
    enabled: !!marketAddress && !!chainId,
    queryKey: QueryKeys.Markets.GET_MARKET_MLA(chainKey, marketAddress),
    queryFn: getMarketMla,
    refetchOnMount: false,
  })
}
