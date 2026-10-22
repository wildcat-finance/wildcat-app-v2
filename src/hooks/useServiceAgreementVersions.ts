"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  CurrentServiceAgreementResponse,
  ServiceAgreementVersionSummary,
} from "@/app/api/service-agreement/interface"
import { QueryKeys } from "@/config/query-keys"

export const useServiceAgreementVersions = () =>
  useQuery<ServiceAgreementVersionSummary[]>({
    queryKey: QueryKeys.ServiceAgreement.GET_VERSIONS(),
    queryFn: async () => {
      const response = await fetch("/api/service-agreement/versions", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Unable to load Terms of Use versions")
      return response.json()
    },
    staleTime: 60_000,
  })

export const useServiceAgreementVersion = (version: string | null) =>
  useQuery<CurrentServiceAgreementResponse>({
    queryKey: QueryKeys.ServiceAgreement.GET_VERSION(version),
    enabled: version !== null,
    queryFn: async () => {
      if (!version) throw new Error("Terms of Use unavailable")
      const response = await fetch(
        `/api/service-agreement/versions/${encodeURIComponent(version)}`,
        { cache: "no-store" },
      )
      if (!response.ok) throw new Error("Terms of Use unavailable")
      const agreement: CurrentServiceAgreementResponse = await response.json()
      if (agreement.version !== version) {
        throw new Error("Unexpected Terms of Use version")
      }
      return agreement
    },
    // The document is immutable, but the response also contains campaign
    // metadata. Keep a finite lifetime rather than caching that forever.
    staleTime: 60_000,
    retry: false,
  })
