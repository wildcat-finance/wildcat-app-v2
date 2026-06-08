"use client"

import { useEffect } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, useConnect } from "wagmi"

import { config } from "@/lib/config"
import { GenericProviderProps } from "@/providers/interface"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

const AUTO_CONNECTED_CONNECTOR_IDS = [
  ...(process.env.NEXT_PUBLIC_MOCK_WALLET ? ["mock"] : []),
  "safe",
]

export function useAutoConnect() {
  const { connect, connectors } = useConnect()

  useEffect(() => {
    AUTO_CONNECTED_CONNECTOR_IDS.forEach(async (connectorId) => {
      const connectorInstance = connectors.find((c) => c.id === connectorId)
      if (!connectorInstance) return

      // Mock connector should always auto-connect, skip authorization check
      const shouldConnect =
        connectorId === "mock" || (await connectorInstance.isAuthorized())

      if (shouldConnect) {
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
