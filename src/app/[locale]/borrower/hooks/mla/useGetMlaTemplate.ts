"use client"

import { useQuery } from "@tanstack/react-query"

import { MlaTemplate } from "@/app/api/mla/interface"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

export const useGetMlaTemplate = (id: number) => {
  const { chainId } = useSelectedNetwork()
  return useQuery({
    queryKey: QueryKeys.Borrower.GET_MLA_TEMPLATE(chainId, id),
    queryFn: async () => {
      const response = await fetch(`/api/mla/templates/${id}`)
      return response.json() as Promise<MlaTemplate>
    },
    enabled: !!chainId && id !== undefined,
  })
}
