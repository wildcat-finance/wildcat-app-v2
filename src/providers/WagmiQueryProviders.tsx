"use client"

import { createContext, useEffect, useState } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, useConnect } from "wagmi"
import { disconnect } from "wagmi/actions"

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

const AUTO_CONNECTED_CONNECTOR_IDS = ["safe"]
export const WalletStartupContext = createContext(false)
let autoConnectSuppressed = false

export function suppressAutoConnect() {
  autoConnectSuppressed = true
}

export function useAutoConnect() {
  const { connectAsync, connectors } = useConnect()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    const connectSafe = async () => {
      try {
        const connector = connectors.find((candidate) =>
          AUTO_CONNECTED_CONNECTOR_IDS.includes(candidate.id),
        )
        if (
          !connector ||
          autoConnectSuppressed ||
          !(await connector.isAuthorized()) ||
          !active ||
          autoConnectSuppressed
        )
          return
        await connectAsync({ connector })
        if (autoConnectSuppressed) {
          await disconnect(config, { connector })
          return
        }
        await Promise.all(
          connectors
            .filter(
              (candidate) =>
                !AUTO_CONNECTED_CONNECTOR_IDS.includes(candidate.id),
            )
            .map((candidate) => candidate.disconnect()),
        )
      } catch {
        // A wallet that cannot auto-connect can still be connected manually.
      } finally {
        if (active) setReady(true)
      }
    }
    connectSafe()
    return () => {
      active = false
    }
  }, [connectAsync, connectors])
  return ready
}

export const WagmiQueryProviders = ({
  children,
  initialState,
}: GenericProviderProps) => (
  <WagmiProvider config={config} initialState={initialState}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </WagmiProvider>
)
