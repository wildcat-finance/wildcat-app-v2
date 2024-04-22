import { useMemo } from "react"
import { useWalletClient } from "wagmi"
import { ethers, JsonRpcSigner } from "ethers"
import { WalletClient } from "viem"
import { Signer } from "@wildcatfi/wildcat-sdk"

// export function walletClientToSigner(
//   walletClient: WalletClient,
// ): Promise<JsonRpcSigner> | null {
//   if (!walletClient || !walletClient.account || !walletClient.chain) {
//     console.error("Invalid or incomplete walletClient.")
//     return null
//   }
//
//   const { account, chain, transport } = walletClient
//
//   if (!chain.id || !chain.name) {
//     console.error("Invalid chain configuration in walletClient.")
//     return null
//   }
//
//   if (!account.address) {
//     console.error("Account address is missing in walletClient.")
//     return null
//   }
//
//   const network = {
//     chainId: chain.id,
//     name: chain.name,
//     ensAddress: chain.contracts?.ensRegistry?.address,
//   }
//
//   const provider = new ethers.BrowserProvider(transport, network)
//   return provider.getSigner(account.address)
// }

export async function walletClientToSigner(
  walletClient: WalletClient,
): Promise<Signer | null> {
  if (!walletClient || !walletClient.account || !walletClient.chain) {
    return null
  }

  const { account, chain, transport } = walletClient

  if (!chain.id || !chain.name || !account.address) {
    return null
  }

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new ethers.BrowserProvider(transport, network)
  const signer = await provider.getSigner(account.address)
  return signer
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: walletClient } = useWalletClient({ chainId })
  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : null),
    [walletClient],
  )
}
