import { AddEthereumChainParameter } from "viem"
import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { mock, safe, walletConnect } from "wagmi/connectors"

import { plasmaMainnet } from "./chains/plasma-mainnet"
import { plasmaTestnet } from "./chains/plasma-testnet"

const DefaultNetwork = process.env.NEXT_PUBLIC_TARGET_NETWORK
const MockWallet = process.env.NEXT_PUBLIC_MOCK_WALLET as
  | `0x${string}`
  | undefined

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

// Override default RPC URLs so the mock connector's provider uses Alchemy
// instead of the public endpoints (which have CORS issues)
const sepoliaChain = {
  ...sepolia,
  rpcUrls: {
    ...sepolia.rpcUrls,
    default: { http: [`https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`] },
  },
} as const

const mainnetChain = {
  ...mainnet,
  rpcUrls: {
    ...mainnet.rpcUrls,
    default: { http: [`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`] },
  },
} as const

const chains = [mainnetChain, sepoliaChain, plasmaTestnet, plasmaMainnet]

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
    [sepoliaChain.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
    ),
    [mainnetChain.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    ),
    [plasmaTestnet.id]: http(`https://testnet-rpc.plasma.to`),
    [plasmaMainnet.id]: http(`https://rpc.plasma.to`),
  },
  connectors: [
    ...(MockWallet ? [mock({ accounts: [MockWallet] })] : []),
    safe({
      allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/],
      debug: false,
    }),
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
