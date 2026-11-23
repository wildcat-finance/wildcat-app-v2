"use client"

import { useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import { MlaTemplateMetadata } from "@/app/api/mla/interface"
import { QueryKeys } from "@/config/query-keys"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import { mlaTemplatesUrl } from "./fetchMlaTemplate"

/// The MLA templates the connected wallet may pick: the market MLAs, plus the
/// custom MLAs of the organisation it borrows for.
export const useGetMlaTemplates = () => {
  const { chainId } = useSelectedNetwork()
  const borrower = useAccount().address?.toLowerCase()
  return useQuery({
    queryKey: QueryKeys.Borrower.GET_MLA_TEMPLATES(chainId, borrower),
    queryFn: async () => {
      const response = await fetch(mlaTemplatesUrl("", chainId, borrower))
      if (!response.ok) throw new Error("Failed to fetch MLA templates")
      return response.json() as Promise<MlaTemplateMetadata[]>
    },
    enabled: !!chainId,
  })
}
