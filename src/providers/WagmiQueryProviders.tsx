"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"

import { config } from "@/lib/config"
import { GenericProviderProps } from "@/providers/interface"

const queryClient = new QueryClient()

export const WagmiQueryProviders = ({
  children,
  initialState,
}: GenericProviderProps) => (
  <WagmiProvider config={config} initialState={initialState}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
)
