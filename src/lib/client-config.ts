"use client"

import { createConfig } from "wagmi"
import { safe, walletConnect } from "wagmi/connectors"

import { wagmiBaseConfig } from "@/lib/config"

export const clientConfig = createConfig({
  ...wagmiBaseConfig,
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
