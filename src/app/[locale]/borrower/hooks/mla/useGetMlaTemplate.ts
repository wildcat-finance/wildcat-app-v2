"use client"

import { useQuery } from "@tanstack/react-query"

import { QueryKeys } from "@/config/query-keys"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import { fetchMlaTemplate } from "./fetchMlaTemplate"

export const useGetMlaTemplate = (id: number | undefined) => {
  const { chainId } = useSelectedNetwork()
  const token = useAuthToken()
  const authToken = token?.chainId === chainId ? token.token : undefined
  return useQuery({
    queryKey: QueryKeys.Borrower.GET_MLA_TEMPLATE(chainId, id, token?.address),
    queryFn: () => fetchMlaTemplate(chainId, id as number, { authToken }),
    enabled: !!chainId && id !== undefined,
  })
}
