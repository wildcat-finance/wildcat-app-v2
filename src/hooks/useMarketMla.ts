import { useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { QueryKeys } from "@/config/query-keys"

import { useAuthToken } from "./useApiAuth"

export const useMarketMla = (marketAddress: string | undefined) => {
  const { address, chainId } = useAccount()
  const token = useAuthToken()
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
    queryKey: QueryKeys.Markets.GET_MARKET_MLA(
      chainKey,
      marketAddress,
      address,
      token?.token,
    ),
    queryFn: getMarketMla,
    refetchOnMount: false,
  })
}
