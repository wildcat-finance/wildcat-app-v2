"use client"

import { useQuery } from "@tanstack/react-query"

import { MlaTemplateMetadata } from "@/app/api/mla/interface"

export const GET_MLA_TEMPLATES_KEY = "GET_MLA_TEMPLATES"

export const useGetMlaTemplates = () =>
  useQuery({
    queryKey: [GET_MLA_TEMPLATES_KEY],
    queryFn: async () => {
      const response = await fetch("/api/mla/templates")
      return response.json() as Promise<MlaTemplateMetadata[]>
    },
  })
