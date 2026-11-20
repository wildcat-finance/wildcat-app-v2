"use client"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { LenderKycApiError, lenderKycApi } from "@/lib/lenderKyc/apiClient"
import { LenderKycWalletRow } from "@/lib/lenderKyc/types"

type OpsLenderKycResult = {
  forbidden: boolean
  rows: LenderKycWalletRow[]
}

export const useOpsLenderKyc = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  const hasTokenForChain = !!token && token.chainId === chainId

  const query = useQuery({
    queryKey: QueryKeys.Ops.GET_LENDER_KYC_ROWS(chainId, token?.address),
    queryFn: async (): Promise<OpsLenderKycResult> => {
      try {
        return {
          forbidden: false,
          rows: await lenderKycApi.listOpsRows(chainId, token.token),
        }
      } catch (error) {
        if (error instanceof LenderKycApiError && error.status === 403) {
          return { forbidden: true, rows: [] }
        }
        if (error instanceof LenderKycApiError && error.status === 401) {
          removeBadToken()
        }
        throw error
      }
    },
    enabled: hasTokenForChain,
    refetchInterval: (current) =>
      current.state.data?.forbidden ? false : 30_000,
  })

  return {
    ...query,
    data: query.data?.rows,
    isForbidden: !!query.data?.forbidden,
  }
}
