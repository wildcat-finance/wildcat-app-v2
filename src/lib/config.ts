import { http, createConfig } from "wagmi"
import { injected, coinbaseWallet, safe, walletConnect } from "wagmi/connectors"
import { mainnet, sepolia } from "wagmi/chains"

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    ),
    [sepolia.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    ),
  },
  connectors: [
    injected(),
    safe({
      allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/],
      debug: false,
    }),
    coinbaseWallet({
      appName: "Wildcat Finance",
      appLogoUrl: "https://avatars.githubusercontent.com/u/113041915?s=200&v=4",
    }),
    walletConnect({
      metadata: {
        description:
          "An undercollateralised credit facility protocol: banking, but worse",
        name: "Wildcat Finance",
        url: "https://app.wildcat.finance",
        icons: ["https://avatars.githubusercontent.com/u/113041915?s=200&v=4"],
      },
      projectId: "b129ed6623af640bbab035d6b906dfd6",
    }),
  ],
})
