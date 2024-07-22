"use client"

import { useEffect } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, useConnect } from "wagmi"

import { config } from "@/lib/config"
import { GenericProviderProps } from "@/providers/interface"

const queryClient = new QueryClient()

const AUTOCONNECTED_CONNECTOR_IDS = ["safe"]

export function useAutoConnect() {
  const { connect, connectors } = useConnect()

  useEffect(() => {
    AUTOCONNECTED_CONNECTOR_IDS.forEach((connector) => {
      const connectorInstance = connectors.find((c) => c.id === connector)

      if (connectorInstance) {
        connect({ connector: connectorInstance })
      }
    })
  }, [connect, connectors])
}

export const WagmiQueryProviders = ({
  children,
  initialState,
}: GenericProviderProps) => (
  <WagmiProvider config={config} initialState={initialState}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
)
