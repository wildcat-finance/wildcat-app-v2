"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { GenericProviderProps } from "./interface"

const queryClient = new QueryClient()

export const QueryProvider = ({ children }: GenericProviderProps) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)
