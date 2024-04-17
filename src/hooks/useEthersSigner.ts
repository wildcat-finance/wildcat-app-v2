import { useMemo } from "react"
import { useWalletClient } from "wagmi"
import { ethers, JsonRpcSigner } from "ethers"
import { WalletClient } from "viem"

export function walletClientToSigner(
  walletClient: WalletClient,
): Promise<JsonRpcSigner> | null {
  if (!walletClient || !walletClient.account || !walletClient.chain) {
    console.error("Invalid or incomplete walletClient.")
    return null
  }

  const { account, chain, transport } = walletClient

  if (!chain.id || !chain.name) {
    console.error("Invalid chain configuration in walletClient.")
    return null
  }

  if (!account.address) {
    console.error("Account address is missing in walletClient.")
    return null
  }

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }

  const provider = new ethers.BrowserProvider(transport, network)
  return provider.getSigner(account.address)
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: walletClient } = useWalletClient({ chainId })
  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : null),
    [walletClient],
  )
}
