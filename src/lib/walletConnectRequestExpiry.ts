import type { walletConnect } from "wagmi/connectors"

import { signingMethod } from "@/utils/sanctionsAccess"

type WalletConnectConnectorFn = ReturnType<typeof walletConnect>
type WalletConnectProvider = Awaited<
  ReturnType<ReturnType<WalletConnectConnectorFn>["getProvider"]>
>

/// WalletConnect discards a wallet's reply once the request is older than its
/// expiry, which defaults to five minutes. Custody wallets that need several
/// people to approve (e.g. Fireblocks) routinely take longer, so the signature
/// is produced and then dropped before it reaches the app. The protocol
/// accepts five minutes to seven days; the tab still has to stay open.
export const WALLETCONNECT_APPROVAL_WINDOW_SECONDS = 60 * 60
export const WALLETCONNECT_DEFAULT_EXPIRY_SECONDS = 5 * 60

const extendedProviders = new WeakSet<object>()

const extendApprovalWindow = (provider: WalletConnectProvider) => {
  if (extendedProviders.has(provider)) return
  extendedProviders.add(provider)
  const request = provider.request.bind(provider)
  // sign-client overwrites its shared default with the last custom expiry it
  // was given, so every request states its own instead of relying on it.
  // eslint-disable-next-line no-param-reassign
  provider.request = ((args, expiry) =>
    request(
      args,
      expiry ??
        (signingMethod.test(args.method)
          ? WALLETCONNECT_APPROVAL_WINDOW_SECONDS
          : WALLETCONNECT_DEFAULT_EXPIRY_SECONDS),
    )) as WalletConnectProvider["request"]
}

/// Gives every request that waits on the account holder (signatures and
/// transactions) the longer approval window. Other requests keep five minutes.
export const withWalletConnectApprovalWindow =
  (createConnector: WalletConnectConnectorFn): WalletConnectConnectorFn =>
  (config) => {
    const connector = createConnector(config)
    return {
      ...connector,
      async getProvider(parameters) {
        const provider = await connector.getProvider.call(this, parameters)
        if (provider) extendApprovalWindow(provider)
        return provider
      },
    }
  }
