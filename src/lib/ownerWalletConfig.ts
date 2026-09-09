import { createConfig } from "wagmi"
import { injected, walletConnect } from "wagmi/connectors"

import { config } from "./config"
import { walletConnectOptions } from "./walletConnectOptions"

// This connection is only used to authenticate an owner. It cannot change the
// primary Safe account, its transaction signer, or its persisted wagmi state.
const createOwnerWalletConfig = () =>
  createConfig({
    chains: config.chains,
    client: ({ chain }) => config.getClient({ chainId: chain.id }),
    storage: null,
    connectors: [
      injected(),
      ...(typeof window === "undefined"
        ? []
        : [
            walletConnect({
              ...walletConnectOptions,
              customStoragePrefix: "wildcat-safe-owner-login",
              storageOptions: { database: "wildcat-safe-owner-login" },
            }),
          ]),
    ],
  })

let ownerWalletConfig: ReturnType<typeof createOwnerWalletConfig> | undefined

export const getOwnerWalletConfig = () => {
  ownerWalletConfig ??= createOwnerWalletConfig()
  return ownerWalletConfig
}
