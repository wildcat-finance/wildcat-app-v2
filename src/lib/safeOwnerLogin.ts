import { recoverMessageAddress } from "viem"
import type { Config, Connector } from "wagmi"
import { getPublicClient, getWalletClient } from "wagmi/actions"

import { getLoginSignatureMessage } from "@/config/api"

export type SafeOwnerLoginScope = { address: string; chainId: number }
export type OwnerLoginSignature = { signature: string; timeSigned: number }
export type SafeLoginSignature = OwnerLoginSignature & {
  pendingSafeMessageId?: string
}

export async function signSafeOwnerLogin(
  ownerConfig: Config,
  connector: Connector,
  { address, chainId }: SafeOwnerLoginScope,
  signal: AbortSignal,
): Promise<OwnerLoginSignature> {
  const wallet = await getWalletClient(ownerConfig, { connector })
  if (wallet.chain.id !== chainId) {
    throw new Error(
      "Switch your owner wallet to the Safe's network and try again",
    )
  }
  const client = getPublicClient(ownerConfig, { chainId })
  if (!client) throw new Error("The Safe's network is not available")
  const owners = await client.readContract({
    address: address as `0x${string}`,
    abi: [
      {
        type: "function",
        name: "getOwners",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address[]" }],
      },
    ],
    functionName: "getOwners",
  })
  if (
    !owners.some(
      (owner) => owner.toLowerCase() === wallet.account.address.toLowerCase(),
    )
  ) {
    throw new Error("This wallet is not an owner of the connected Safe")
  }
  // Start the freshness window at signing, not while choosing a wallet.
  if (signal.aborted) throw new Error("Login cancelled")
  const timeSigned = Math.floor(Date.now() / 1000)
  const message = getLoginSignatureMessage(address, timeSigned, chainId)
  const signature = await wallet.signMessage({ message })
  if (signal.aborted) throw new Error("Login cancelled")
  const signer = await recoverMessageAddress({ message, signature })
  if (signer.toLowerCase() !== wallet.account.address.toLowerCase()) {
    throw new Error("The wallet did not return the requested owner signature")
  }
  return { signature, timeSigned }
}
