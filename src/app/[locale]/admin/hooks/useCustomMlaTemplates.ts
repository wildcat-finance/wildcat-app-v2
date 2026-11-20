"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  CreateCustomMlaInput,
  CustomMlaTemplateForAdminView,
} from "@/app/api/mla/interface"
import { QueryKeys } from "@/config/query-keys"
import { useAuthToken, useRemoveBadApiToken } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

const readError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => undefined)
  const problems: string[] = body?.problems ?? []
  const message = body?.error ?? fallback
  return new Error(
    problems.length > 0 ? `${message}: ${problems.join("; ")}` : message,
  )
}

const useAdminToken = () => {
  const token = useAuthToken()
  const { chainId } = useSelectedNetwork()
  const isAdminForChain = !!token?.isAdmin && token.chainId === chainId
  return { token, chainId, isAdminForChain }
}

/// Every custom MLA of the selected network's class, retired ones included.
export const useCustomMlaTemplates = () => {
  const { token, chainId, isAdminForChain } = useAdminToken()
  const { mutate: removeBadToken } = useRemoveBadApiToken()
  return useQuery({
    queryKey: QueryKeys.Borrower.GET_CUSTOM_MLA_TEMPLATES(
      chainId,
      token?.address,
    ),
    queryFn: async () => {
      const response = await fetch(
        `/api/mla/templates/custom?chainId=${chainId}`,
        { headers: { Authorization: `Bearer ${token.token}` } },
      )
      if (response.status === 401) {
        removeBadToken()
        throw Error("Failed to fetch custom MLAs")
      }
      if (!response.ok) throw await readError(response, "Failed to fetch")
      return (await response.json()) as CustomMlaTemplateForAdminView[]
    },
    enabled: isAdminForChain,
  })
}

const useInvalidateTemplates = () => {
  const client = useQueryClient()
  const { chainId } = useSelectedNetwork()
  return () => {
    client.invalidateQueries({
      queryKey: QueryKeys.Borrower.GET_CUSTOM_MLA_TEMPLATES(chainId),
    })
    client.invalidateQueries({
      queryKey: QueryKeys.Borrower.GET_MLA_TEMPLATES(chainId),
    })
  }
}

/// Register a custom MLA for one borrower from the HTML and plain text of
/// its copy of the market MLA.
export const useRegisterCustomMla = () => {
  const { token, chainId, isAdminForChain } = useAdminToken()
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: async (input: Omit<CreateCustomMlaInput, "chainId">) => {
      if (!isAdminForChain) throw Error("Not an admin on this network")
      const response = await fetch("/api/mla/templates/custom", {
        method: "POST",
        body: JSON.stringify({ ...input, chainId }),
        headers: { Authorization: `Bearer ${token.token}` },
      })
      if (!response.ok) {
        throw await readError(response, "Failed to register the custom MLA")
      }
    },
    onSuccess: invalidate,
  })
}

/// Retire a custom MLA: it leaves the pick list for new markets.
export const useRetireMlaTemplate = () => {
  const { token, isAdminForChain } = useAdminToken()
  const invalidate = useInvalidateTemplates()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!isAdminForChain) throw Error("Not an admin on this network")
      const response = await fetch(`/api/mla/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ retired: true }),
        headers: { Authorization: `Bearer ${token.token}` },
      })
      if (!response.ok) {
        throw await readError(response, "Failed to retire the custom MLA")
      }
    },
    onSuccess: invalidate,
  })
}
