"use client"

import { useEffect } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, useConnect } from "wagmi"

import { config } from "@/lib/config"
import { GenericProviderProps } from "@/providers/interface"

const queryClient = new QueryClient()

const AUTO_CONNECTED_CONNECTOR_IDS = ["safe"]

export function useAutoConnect() {
  const { connect, connectors } = useConnect()

  useEffect(() => {
    AUTO_CONNECTED_CONNECTOR_IDS.forEach(async (connector) => {
      const connectorInstance = connectors.find((c) => c.id === connector)
      const isAuthorized = await connectorInstance?.isAuthorized()

      if (connectorInstance && isAuthorized) {
        connect({ connector: connectorInstance })
        connectors
          .filter((c) => !AUTO_CONNECTED_CONNECTOR_IDS.includes(c.id))
          .forEach((c) => c.disconnect())
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
