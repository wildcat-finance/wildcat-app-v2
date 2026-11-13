"use client"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { lenderKycMockService } from "@/lib/lenderKyc/mockService"

export const useLenderKycStarts = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const isAdminForChain = token?.isAdmin && token.chainId === chainId

  return useQuery({
    queryKey: QueryKeys.Admin.GET_LENDER_KYC_STARTS(
      chainId,
      isAdminForChain,
      token?.address,
    ),
    queryFn: () => lenderKycMockService.listWalletRows(),
    enabled: !!isAdminForChain,
    refetchInterval: 10_000,
  })
}
