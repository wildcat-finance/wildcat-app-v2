import type SafeAppsSDK from "@safe-global/safe-apps-sdk"

import { SanctionsState } from "@/utils/sanctions"

export type WalletScope = {
  address?: string
  chainId?: number
  selectedChainId?: number
}

type Access = WalletScope & { status: SanctionsState; validUntil: number }
let access: Access | undefined
let readWalletScope: (() => WalletScope) | undefined

/** Browser-only, transient approval. Never persisted or used by the server. */
export function setSanctionsAccess(next: Access, readScope: () => WalletScope) {
  access = next
  readWalletScope = readScope
}

export function clearSanctionsAccess() {
  access = undefined
  readWalletScope = undefined
}

/** Recheck immediately before wallet prompts, including delayed callbacks. */
export function assertSanctionsAccess(address: string, chainId: number) {
  const current = readWalletScope?.()
  if (
    !access ||
    !current ||
    access.status !== "clear" ||
    access.validUntil <= Date.now() ||
    access.address !== address.toLowerCase() ||
    current.address?.toLowerCase() !== access.address ||
    current.chainId !== chainId ||
    access.chainId !== chainId ||
    current.selectedChainId !== access.selectedChainId
  ) {
    throw new Error(
      "Wallet access must pass sanctions screening before continuing",
    )
  }
}

const signingMethod =
  /^(eth_sendTransaction|eth_sendRawTransaction|eth_signTransaction|eth_sign|personal_sign|eth_signTypedData(?:_v[134])?|wallet_sendCalls)$/

/** Ethers forwards signing through this transport even after a modal unmounts. */
export function guardWalletTransport<
  T extends {
    request: (args: { method: string; params?: unknown }) => Promise<unknown>
  },
>(transport: T, address: string, chainId: number): T {
  return {
    ...transport,
    async request(args) {
      if (signingMethod.test(args.method))
        assertSanctionsAccess(address, chainId)
      return transport.request(args)
    },
  }
}

export function guardSafeSdk(
  sdk: SafeAppsSDK,
  address: string,
  chainId: number,
): SafeAppsSDK {
  const txs = new Proxy(sdk.txs, {
    get(target, property) {
      const value = Reflect.get(target, property, target)
      if (typeof value !== "function") return value
      return (...args: unknown[]) => {
        if (
          property === "send" ||
          property === "signMessage" ||
          property === "signTypedMessage"
        ) {
          assertSanctionsAccess(address, chainId)
        }
        return value.apply(target, args)
      }
    },
  })
  return new Proxy(sdk, {
    get(target, property) {
      return property === "txs" ? txs : Reflect.get(target, property, target)
    },
  })
}
