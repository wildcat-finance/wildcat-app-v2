"use client"

import { useQuery } from "@tanstack/react-query"

import { MlaTemplateMetadata } from "@/app/api/mla/interface"
import { QueryKeys } from "@/config/query-keys"
import { useAuthToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import { mlaTemplateRequestInit } from "./fetchMlaTemplate"

/// The MLA templates the connected borrower may pick: the market MLAs, plus
/// the borrower's own custom MLAs once it is logged in on this network.
export const useGetMlaTemplates = () => {
  const { chainId } = useSelectedNetwork()
  const token = useAuthToken()
  const authToken = token?.chainId === chainId ? token.token : undefined
  const query = useQuery({
    queryKey: QueryKeys.Borrower.GET_MLA_TEMPLATES(chainId, token?.address),
    queryFn: async () => {
      const response = await fetch(
        `/api/mla/templates?chainId=${chainId}`,
        mlaTemplateRequestInit(authToken),
      )
      return response.json() as Promise<MlaTemplateMetadata[]>
    },
    enabled: !!chainId,
  })
  return { ...query, isLoggedIn: !!authToken }
}
