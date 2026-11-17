"use client"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { LenderKycApiError, lenderKycApi } from "@/lib/lenderKyc/apiClient"

export const useLenderKycStarts = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  const isAdminForChain = token?.isAdmin && token.chainId === chainId

  return useQuery({
    queryKey: QueryKeys.Admin.GET_LENDER_KYC_STARTS(
      chainId,
      isAdminForChain,
      token?.address,
    ),
    queryFn: async () => {
      try {
        return await lenderKycApi.listWalletRows(chainId, token.token)
      } catch (error) {
        if (error instanceof LenderKycApiError && error.status === 401) {
          removeBadToken()
        }
        throw error
      }
    },
    enabled: !!isAdminForChain,
    refetchInterval: 10_000,
  })
}
