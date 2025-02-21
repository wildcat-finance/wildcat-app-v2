"use client"

import { useQuery } from "@tanstack/react-query"

import { MlaTemplate } from "@/app/api/mla/interface"

export const GET_MLA_TEMPLATE_KEY = "GET_MLA_TEMPLATE"

export const useGetMlaTemplate = (id: number) =>
  useQuery({
    queryKey: [GET_MLA_TEMPLATE_KEY, id],
    queryFn: async () => {
      const response = await fetch(`/api/mla/templates/${id}`)
      return response.json() as Promise<MlaTemplate>
    },
  })
