"use client"

import { useQuery } from "@tanstack/react-query"

import { MlaTemplateMetadata } from "@/app/api/mla/interface"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const useGetMlaTemplates = () => {
  const { chainId } = useSelectedNetwork()
  return useQuery({
    queryKey: QueryKeys.Borrower.GET_MLA_TEMPLATES(chainId),
    queryFn: async () => {
      const response = await fetch("/api/mla/templates")
      return response.json() as Promise<MlaTemplateMetadata[]>
    },
    enabled: !!chainId,
  })
}
