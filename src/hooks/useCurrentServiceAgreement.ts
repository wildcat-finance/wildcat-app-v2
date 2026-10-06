"use client"

import { useQuery } from "@tanstack/react-query"

import { CurrentServiceAgreementResponse } from "@/app/api/service-agreement/interface"
import { QueryKeys } from "@/config/query-keys"

const fetchCurrentServiceAgreement =
  async (): Promise<CurrentServiceAgreementResponse> => {
    const response = await fetch("/api/service-agreement/current", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch current Terms of Use")
    }
    return response.json() as Promise<CurrentServiceAgreementResponse>
  }

export const useCurrentServiceAgreement = () =>
  useQuery<CurrentServiceAgreementResponse>({
    queryKey: QueryKeys.ServiceAgreement.GET_CURRENT(),
    queryFn: fetchCurrentServiceAgreement,
    refetchOnMount: false,
    staleTime: 60_000,
  })
