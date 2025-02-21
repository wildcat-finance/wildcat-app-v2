import { useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"

import { useAuthToken } from "./useApiAuth"

export const GET_MARKET_MLA_KEY = "get-market-mla"

export const useMarketMla = (marketAddress: string | undefined) => {
  const { address } = useAccount()
  const token = useAuthToken()
  const getMarketMla = async () => {
    if (!marketAddress) return undefined
    const res = await fetch(`/api/mla/${marketAddress.toLowerCase()}`)
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
    enabled: !!marketAddress,
    queryKey: [GET_MARKET_MLA_KEY, marketAddress, address, token?.token],
    queryFn: getMarketMla,
    refetchOnMount: false,
  })
}
