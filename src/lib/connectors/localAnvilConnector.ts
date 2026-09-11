import { http, type Address, type EIP1193RequestFn } from "viem"
import { createConnector } from "wagmi"

import { isTestMode } from "@/config/testMode"

/** Anvil's default (deterministic mnemonic) accounts. Keys are held by anvil, which signs for them. */
export const ANVIL_DEFAULT_ACCOUNTS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
] as const satisfies readonly Address[]

export const getLocalAnvilAccount = (index: number): Address =>
  ANVIL_DEFAULT_ACCOUNTS[index]

export const LOCAL_ANVIL_CONNECTOR_NAME = "Local Anvil"

type LocalAnvilParams = {
  rpcUrl: string
  chainId: number
  accounts: readonly Address[]
}

type ConnectParams =
  | {
      chainId?: number | undefined
      isReconnecting?: boolean | undefined
      /** Test-only: pick which of `accounts` becomes the connected account. */
      withAccountIndex?: number | undefined
    }
  | undefined

type LocalAnvilProvider = { request: EIP1193RequestFn }

/**
 * TEST-ONLY WALLET CONTROL SURFACE — read this before touching anything below.
 *
 * A browser wallet can do two things this connector otherwise cannot: change the selected account
 * while a page stays open, and refuse to sign. Anvil holds the keys and answers every request, so
 * without a control surface the E2E suite can only seed an account BEFORE page load (see
 * `e2e/lib/page.ts#connectAs`) and can only fail sends at the RPC layer (EDG-13's injected
 * "transaction underpriced"), neither of which is a wallet-layer transition.
 *
 * So the connector accepts ONE window event, `wildcat:anvil-wallet`, whose detail is a
 * `LocalAnvilTestCommand`:
 *
 *   { type: "switchAccount", index }  — becomes account `index` and emits wagmi's `change` event,
 *                                       exactly the path `onAccountsChanged` takes for a real
 *                                       wallet's EIP-1193 `accountsChanged`.
 *   { type: "rejectNext", count }     — the next `count` signature/send requests throw an
 *                                       EIP-1193 `4001 userRejectedRequest`, the error viem maps
 *                                       to `UserRejectedRequestError`. `count: 0` disarms.
 *
 * Constraints this deliberately respects:
 *  - It exists only in test builds. This whole connector is registered only when
 *    NEXT_PUBLIC_TEST_MODE=1 (`src/lib/client-config.ts`); the listener additionally checks
 *    `isTestMode` itself, so a production bundle carries no listener even if the module is
 *    imported.
 *  - It never changes how a NON-armed request behaves: with no command dispatched, `request`
 *    forwards to anvil exactly as before.
 *  - It touches no product code — no new hook, no UI, no store.
 *
 * Driven by `e2e/lenderflows/wallet-transitions.spec.ts` (WAL-05/06/07).
 */
export type LocalAnvilTestCommand =
  | { type: "switchAccount"; index: number }
  | { type: "rejectNext"; count: number }

export const LOCAL_ANVIL_TEST_EVENT = "wildcat:anvil-wallet"

/** Requests a real wallet would put in front of a human — the only ones `rejectNext` refuses. */
const SIGNING_METHODS = new Set([
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
])

/**
 * Local test wallet: forwards every request to a local anvil, which executes transactions and
 * signs messages for its own accounts (viem treats the connected address as a JSON-RPC account).
 * Only registered when NEXT_PUBLIC_TEST_MODE=1. Does not touch product authentication.
 */
export const localAnvilConnector = ({
  rpcUrl,
  chainId,
  accounts,
}: LocalAnvilParams) =>
  createConnector<LocalAnvilProvider>((config) => {
    // Test-only: Playwright seeds localStorage "anvil-account-index" (via addInitScript) to pick
    // which anvil account the session connects as; defaults to #0.
    const storedIndex = (): number => {
      try {
        const raw = window.localStorage.getItem("anvil-account-index")
        const index = raw === null ? 0 : Number(raw)
        return Number.isInteger(index) && index >= 0 && index < accounts.length
          ? index
          : 0
      } catch {
        return 0
      }
    }
    let explicitIndex: number | null = null
    let current: Address =
      accounts[typeof window === "undefined" ? 0 : storedIndex()]
    const transport = http(rpcUrl)({ chain: undefined, retryCount: 0 })
    // Test-only: armed by the `rejectNext` command; see LOCAL_ANVIL_TEST_EVENT above.
    let pendingRejections = 0
    const provider: LocalAnvilProvider = {
      request: (async (args: { method: string; params?: unknown }) => {
        if (pendingRejections > 0 && SIGNING_METHODS.has(args.method)) {
          pendingRejections -= 1
          // EIP-1193 userRejectedRequest: viem's buildRequest maps code 4001 onto
          // UserRejectedRequestError, so the app sees what a wallet "Reject" produces.
          throw Object.assign(new Error("User rejected the request."), {
            code: 4001,
            details: "User rejected the request.",
          })
        }
        switch (args.method) {
          case "eth_accounts":
          case "eth_requestAccounts":
            return [current]
          case "wallet_switchEthereumChain":
            return null
          default:
            return transport.request(args as never)
        }
      }) as EIP1193RequestFn,
    }
    return {
      id: "localAnvil",
      name: LOCAL_ANVIL_CONNECTOR_NAME,
      type: "localAnvil" as const,
      async setup() {
        // Nothing to initialise: anvil is already running.
        // Test-only control surface (LOCAL_ANVIL_TEST_EVENT above) — never attached in a
        // production build, and inert until the E2E suite dispatches a command.
        if (!isTestMode || typeof window === "undefined") return
        window.addEventListener(LOCAL_ANVIL_TEST_EVENT, (event: Event) => {
          const command = (event as CustomEvent<LocalAnvilTestCommand>).detail
          if (!command) return
          if (command.type === "rejectNext") {
            pendingRejections = Math.max(0, Math.trunc(command.count))
            return
          }
          if (command.type === "switchAccount") {
            const next = accounts[command.index]
            if (!next) return
            explicitIndex = command.index
            current = next
            // The same emitter path a real wallet's `accountsChanged` takes — see
            // onAccountsChanged below, which wagmi wires for providers that emit events.
            config.emitter.emit("change", { accounts: [current] })
          }
        })
      },
      async connect(params?: ConnectParams) {
        if (params?.withAccountIndex !== undefined)
          explicitIndex = params.withAccountIndex
        if (params?.withAccountIndex !== undefined) {
          const next = accounts[params.withAccountIndex]
          if (!next) {
            throw new Error(
              `Local Anvil has no account at index ${params.withAccountIndex}`,
            )
          }
          current = next
        }
        return { accounts: [current], chainId }
      },
      async disconnect() {
        // No session to tear down.
      },
      async getAccounts() {
        if (explicitIndex === null && typeof window !== "undefined")
          current = accounts[storedIndex()]
        return [current]
      },
      async getChainId() {
        return chainId
      },
      async getProvider() {
        return provider
      },
      async isAuthorized() {
        return true
      },
      async switchChain({ chainId: target }) {
        if (target !== chainId)
          throw new Error(`Local Anvil only serves chain ${chainId}`)
        const chain = config.chains.find((c) => c.id === chainId)
        if (!chain)
          throw new Error(`Local Anvil chain ${chainId} is not configured`)
        return chain
      },
      onAccountsChanged(changed) {
        config.emitter.emit("change", { accounts: changed as Address[] })
      },
      onChainChanged() {
        // Single fixed chain.
      },
      onDisconnect() {
        config.emitter.emit("disconnect")
      },
    }
  })
