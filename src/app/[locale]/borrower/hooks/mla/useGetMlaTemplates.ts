"use client"

import { useQuery } from "@tanstack/react-query"

import { MlaTemplateMetadata } from "@/app/api/mla/interface"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import { getMlaTemplatesApiPath } from "./templateApiPaths"

export const useGetMlaTemplates = () => {
  const { chainId } = useSelectedNetwork()
  return useQuery({
    queryKey: QueryKeys.Borrower.GET_MLA_TEMPLATES(chainId),
    queryFn: async () => {
      const response = await fetch(getMlaTemplatesApiPath(chainId))
      return response.json() as Promise<MlaTemplateMetadata[]>
    },
    enabled: !!chainId,
  })
}
