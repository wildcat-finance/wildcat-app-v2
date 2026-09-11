"use client"

import { createConfig } from "wagmi"
import { safe, walletConnect } from "wagmi/connectors"

import { TargetChainId } from "@/config/network"
import { isTestMode } from "@/config/testMode"
import { wagmiBaseConfig } from "@/lib/config"
import {
  ANVIL_DEFAULT_ACCOUNTS,
  localAnvilConnector,
} from "@/lib/connectors/localAnvilConnector"
import { getBrowserRpcUrl } from "@/lib/rpcUrls"

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
