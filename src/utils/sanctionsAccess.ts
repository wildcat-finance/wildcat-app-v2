import type SafeAppsSDK from "@safe-global/safe-apps-sdk"

import { SANCTIONS_TIMEOUT_MS, SanctionsState } from "@/utils/sanctions"

export type WalletScope = {
  address?: string
  chainId?: number
  selectedChainId?: number
}

type Access = WalletScope & { status: SanctionsState }
let access: Access | undefined
let readWalletScope: (() => WalletScope) | undefined
const waiters = new Map<() => void, ReturnType<typeof setTimeout>>()

function wakeWaiters() {
  waiters.forEach((timer, wake) => {
    clearTimeout(timer)
    wake()
  })
  waiters.clear()
}

/** Resolves on the next screening update, or after `ms`. */
function nextUpdate(ms: number) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      waiters.delete(resolve)
      resolve()
    }, ms)
    waiters.set(resolve, timer)
  })
}

/** Browser-only, transient screening state. Never persisted or used by the server. */
export function setSanctionsAccess(next: Access, readScope: () => WalletScope) {
  access = next
  readWalletScope = readScope
  wakeWaiters()
}

export function clearSanctionsAccess() {
  access = undefined
  readWalletScope = undefined
  wakeWaiters()
}

/** Returns false while this wallet's screening has not finished. */
function screened(address: string, chainId: number) {
  const current = readWalletScope?.()
  if (!access || !current) return true
  const signer = address.toLowerCase()
  if (
    current.address?.toLowerCase() !== signer ||
    current.chainId !== chainId
  ) {
    throw new Error("Connected wallet changed before signing")
  }
  if (
    access.status === "checking" ||
    access.address !== signer ||
    access.chainId !== chainId ||
    access.selectedChainId !== current.selectedChainId
  )
    return false
  if (access.status === "blocked") {
    throw new Error("This address was flagged by sanctions screening")
  }
  return true
}

/**
 * Recheck immediately before wallet prompts, including delayed callbacks.
 * Only a flagged result rejects. A check still in flight is awaited; an
 * outage or a check that outlives the timeout lets the prompt through.
 */
export async function assertSanctionsAccess(
  address: string,
  chainId: number,
  deadline = Date.now() + SANCTIONS_TIMEOUT_MS,
): Promise<void> {
  if (screened(address, chainId) || Date.now() >= deadline) return
  await nextUpdate(deadline - Date.now())
  await assertSanctionsAccess(address, chainId, deadline)
}

/** JSON-RPC methods that need the account holder's approval in their wallet. */
export const signingMethod =
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
        await assertSanctionsAccess(address, chainId)
      return transport.request(args)
    },
  }
}

const safeSigningMethods = new Set<PropertyKey>([
  "send",
  "signMessage",
  "signTypedMessage",
])

export function guardSafeSdk(
  sdk: SafeAppsSDK,
  address: string,
  chainId: number,
): SafeAppsSDK {
  const txs = new Proxy(sdk.txs, {
    get(target, property) {
      const value = Reflect.get(target, property, target)
      if (typeof value !== "function") return value
      return (...args: unknown[]) =>
        safeSigningMethods.has(property)
          ? assertSanctionsAccess(address, chainId).then(() =>
              value.apply(target, args),
            )
          : value.apply(target, args)
    },
  })
  return new Proxy(sdk, {
    get(target, property) {
      return property === "txs" ? txs : Reflect.get(target, property, target)
    },
  })
}
