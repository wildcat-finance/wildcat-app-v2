import { AddEthereumChainParameter } from "viem"
import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { safe, walletConnect } from "wagmi/connectors"

import { TargetChainId } from "@/config/network"
import { isTestMode } from "@/config/testMode"

import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"
import {
  ANVIL_DEFAULT_ACCOUNTS,
  localAnvilConnector,
} from "./connectors/localAnvilConnector"
import { getBrowserRpcUrl } from "./rpcUrls"

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
    [sepolia.id]: http(getBrowserRpcUrl(sepolia.id)),
    [mainnet.id]: http(getBrowserRpcUrl(mainnet.id)),
    [plasmaTestnet.id]: http(getBrowserRpcUrl(plasmaTestnet.id)),
    [plasmaMainnet.id]: http(getBrowserRpcUrl(plasmaMainnet.id)),
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
    // Test mode (fork harness): register the Local Anvil wallet and skip WalletConnect's
    // third-party script. Production builds never set NEXT_PUBLIC_TEST_MODE.
    ...(isTestMode
      ? [
          localAnvilConnector({
            rpcUrl: getBrowserRpcUrl(TargetChainId),
            chainId: TargetChainId,
            accounts: ANVIL_DEFAULT_ACCOUNTS,
          }),
        ]
      : []),
    ...(isTestMode || typeof window === "undefined"
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
