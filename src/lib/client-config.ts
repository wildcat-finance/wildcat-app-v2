"use client"

import { createConfig } from "wagmi"
import { safe, walletConnect } from "wagmi/connectors"

import { wagmiBaseConfig } from "@/lib/config"
import { walletConnectOptions } from "@/lib/walletConnectOptions"

export const clientConfig = createConfig({
  ...wagmiBaseConfig,
  // Owner-wallet events inside a Safe app must not replace the primary Safe.
  multiInjectedProviderDiscovery:
    typeof window === "undefined" || window.parent === window,
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
    walletConnect(walletConnectOptions),
  ],
})
