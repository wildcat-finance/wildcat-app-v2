import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { metaMask, safe, walletConnect } from "wagmi/connectors"

import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"

const DefaultNetwork = process.env.NEXT_PUBLIC_TARGET_NETWORK

const chains = [mainnet, sepolia, plasmaTestnet, plasmaMainnet]

// Sort so that default network is first
chains.sort((a, b) => {
  if (a.name === DefaultNetwork) return -1
  if (b.name === DefaultNetwork) return 1
  return 0
})

export const config = createConfig({
  // Explicit to avoid issues with readonly array
  chains: [chains[0], chains[1], chains[2], chains[3]],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  // multiInjectedProviderDiscovery: false,
  transports: {
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    ),
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    ),
    [plasmaTestnet.id]: http(`https://testnet-rpc.plasma.to`),
    [plasmaMainnet.id]: http(`https://rpc.plasma.to`),
  },
  connectors: [
    safe({
      allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/],
      debug: false,
    }),
    metaMask(),
    /* coinbaseWallet({
      appName: "Wildcat",
      appLogoUrl: "https://avatars.githubusercontent.com/u/113041915?s=200&v=4",
    }),
    */
    walletConnect({
      metadata: {
        description: "An undercollateralised credit facility protocol.",
        name: "Wildcat",
        url: "https://app.wildcat.finance",
        icons: ["https://avatars.githubusercontent.com/u/113041915?s=200&v=4"],
      },
      projectId: "b129ed6623af640bbab035d6b906dfd6",
    }),
  ],
})
