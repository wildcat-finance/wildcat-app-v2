import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"

import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"
import { getRpcProxyUrl } from "./gateway/client"

const DefaultNetwork = process.env.NEXT_PUBLIC_TARGET_NETWORK

const chains = [mainnet, sepolia, plasmaTestnet, plasmaMainnet]

// Sort so that default network is first
chains.sort((a, b) => {
  if (a.name === DefaultNetwork) return -1
  if (b.name === DefaultNetwork) return 1
  return 0
})

const configuredChains = [chains[0], chains[1], chains[2], chains[3]] as const

export const wagmiBaseConfig = {
  // Explicit to avoid issues with readonly array
  chains: configuredChains,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [sepolia.id]: http(getRpcProxyUrl(sepolia.id)),
    [mainnet.id]: http(getRpcProxyUrl(mainnet.id)),
    [plasmaTestnet.id]: http(getRpcProxyUrl(plasmaTestnet.id)),
    [plasmaMainnet.id]: http(getRpcProxyUrl(plasmaMainnet.id)),
  },
} as const

// Cookie hydration and public clients do not need wallet event listeners.
export const config = createConfig({
  ...wagmiBaseConfig,
  multiInjectedProviderDiscovery: false,
})
