import { useMemo } from "react"
import { providers } from "ethers"
import type { Account, Chain, Client, Transport } from "viem"
import { useWalletClient } from "wagmi"

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)

  return provider.getSigner(account.address)
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useWalletClient({ chainId })

  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}
