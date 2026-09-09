import { createConnector } from "@wagmi/core"
import { WalletConnectModal } from "@walletconnect/modal"
export { injected } from "@wagmi/core"

const address = "0xc15be5214978d1fc509ecdd4f9d5bc067c94d9ae"
export const safe = () =>
  createConnector(() => ({
    id: "safe",
    name: "Safe",
    type: "safe",
    connect: async () => ({ accounts: [address], chainId: 11155111 }),
    disconnect: async () => {},
    getAccounts: async () => [address],
    getChainId: async () => 11155111,
    getProvider: async () => ({}),
    isAuthorized: async () => true,
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {},
  }))

// The installed connector eagerly creates a WalletConnect modal per provider.
// Keep the actual modal, global state and options; simulate only relay pairing.
export const walletConnect = (options) => {
  let modal
  return createConnector(() => ({
    id: "walletConnect",
    name: "WalletConnect",
    type: "walletConnect",
    setup: async () => {
      modal = new WalletConnectModal({
        projectId: options.projectId,
        ...options.qrModalOptions,
      })
    },
    connect: async () => {
      await modal.openModal({
        uri: `wc:${"11".repeat(32)}@2?relay-protocol=irn&symKey=${"22".repeat(
          32,
        )}`,
        chains: ["eip155:11155111"],
      })
      return new Promise((_, reject) => {
        const unsubscribe = modal.subscribeModal(({ open }) => {
          if (!open) {
            unsubscribe()
            reject(new Error("Connection request reset. Please try again."))
          }
        })
      })
    },
    disconnect: async () => {},
    getAccounts: async () => [],
    getChainId: async () => 11155111,
    getProvider: async () => ({ modal }),
    isAuthorized: async () => false,
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {},
  }))
}
