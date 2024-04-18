"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"

import { config } from "@/lib/config"
import { GenericProviderProps } from "@/providers/types"
import { useEffect } from "react"

const queryClient = new QueryClient()

export const WagmiQueryProviders = ({
  children,
  initialState,
}: GenericProviderProps) => {
  useEffect(() => {
    if (
      !(
        initialState === undefined ||
        initialState!.connections[Symbol.iterator]().next().value === undefined
      )
    ) {
      const mapIter =
        initialState!.connections[Symbol.iterator]().next().value[1].accounts
      console.log("Last Connected Wallets:", mapIter)
    }
  }, [initialState])

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
