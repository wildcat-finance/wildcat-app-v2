import { http, type Address, type EIP1193RequestFn } from "viem"
import { createConnector } from "wagmi"

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

/**
 * Test-only: connect as an address anvil does NOT hold a key for.
 *
 * Playwright seeds `localStorage["anvil-impersonate-address"]` (via `addInitScript`) and the
 * harness calls `anvil_impersonateAccount` for the same address, which unlocks it for
 * `eth_sendTransaction`. That is enough to drive every borrower flow whose actions are
 * TRANSACTIONS against a market a real Sepolia account owns.
 *
 * It is NOT enough for MESSAGE signing: anvil answers `personal_sign` / `eth_sign` /
 * `eth_signTypedData_v4` for an impersonated account with "No Signer available", because it has no
 * key. Ceremonies that sign (ToU, MLA) have to be seeded in the app DB instead — see
 * `e2e/borrowerflows/helpers.ts`.
 *
 * Takes precedence over `anvil-account-index` when both are set.
 */
const IMPERSONATE_KEY = "anvil-impersonate-address"

const isAddress = (value: string): value is Address =>
  /^0x[0-9a-fA-F]{40}$/.test(value)

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
    /** Test-only: an impersonated address wins over the account index (see IMPERSONATE_KEY). */
    const storedImpersonation = (): Address | null => {
      try {
        const raw = window.localStorage.getItem(IMPERSONATE_KEY)
        return raw && isAddress(raw) ? raw : null
      } catch {
        return null
      }
    }
    const storedAccount = (): Address =>
      storedImpersonation() ?? accounts[storedIndex()]
    let explicitIndex: number | null = null
    let current: Address =
      typeof window === "undefined" ? accounts[0] : storedAccount()
    const transport = http(rpcUrl)({ chain: undefined, retryCount: 0 })
    const provider: LocalAnvilProvider = {
      request: (async (args: { method: string; params?: unknown }) => {
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
        } else if (typeof window !== "undefined") {
          // Re-read: the connector is constructed once, but a test can seed the impersonation
          // key (or the index) after that and connect through the wallet dialog.
          current = storedAccount()
        }
        return { accounts: [current], chainId }
      },
      async disconnect() {
        // No session to tear down.
      },
      async getAccounts() {
        if (typeof window !== "undefined") {
          // An impersonated address is authoritative even after an explicit connect(index):
          // the test that seeded it is asking for that exact wallet.
          const impersonated = storedImpersonation()
          if (impersonated) current = impersonated
          else if (explicitIndex === null) current = accounts[storedIndex()]
        }
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
