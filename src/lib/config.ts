import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { injected, coinbaseWallet, safe, walletConnect } from "wagmi/connectors"

import { NETWORKS } from "@/config/network"

export const config = createConfig({
  chains:
    process.env.NEXT_PUBLIC_TARGET_NETWORK === NETWORKS.Sepolia.name
      ? [sepolia, mainnet]
      : [mainnet, sepolia],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  multiInjectedProviderDiscovery: false,
  transports: {
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    ),
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    ),
  },
  connectors: [
    injected({ target: "metaMask" }),
    safe({
      allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/],
      debug: false,
    }),
    coinbaseWallet({
      appName: "Wildcat",
      appLogoUrl: "https://avatars.githubusercontent.com/u/113041915?s=200&v=4",
    }),
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
