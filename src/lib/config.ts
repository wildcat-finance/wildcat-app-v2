import { Chain } from "viem"
import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { safe, walletConnect } from "wagmi/connectors"

import { TargetChainId } from "@/config/network"

import { inkSepolia } from "./chains/ink-sepolia"
import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"

const chains: [Chain, ...Chain[]] = [
  mainnet,
  sepolia,
  plasmaTestnet,
  plasmaMainnet,
  inkSepolia,
]

// config keys and wallet-facing names differ; select the default by chain ID.
chains.sort((a, b) => {
  if (a.id === TargetChainId) return -1
  if (b.id === TargetChainId) return 1
  return 0
})

export const config = createConfig({
  chains,
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
    [inkSepolia.id]: http(inkSepolia.rpcUrls.default.http[0]),
  },
  connectors: [
    safe({
      allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/],
      debug: false,
    }),
    /* coinbaseWallet({
      appName: "Wildcat",
      appLogoUrl: "https://avatars.githubusercontent.com/u/113041915?s=200&v=4",
    }),
    */
    ...(typeof window === "undefined"
      ? []
      : [
          walletConnect({
            metadata: {
              description: "An undercollateralised credit facility protocol.",
              name: "Wildcat",
              url: "https://app.wildcat.finance",
              icons: [
                "https://avatars.githubusercontent.com/u/113041915?s=200&v=4",
              ],
            },
            projectId: "b129ed6623af640bbab035d6b906dfd6",
          }),
        ]),
  ],
})
