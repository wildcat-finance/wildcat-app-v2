import { useAccount } from "wagmi"

import { useAppSelector } from "@/store/hooks"

import { useEthersProvider } from "./useEthersSigner"

export const useCurrentNetwork = () => {
  const { chainId } = useAppSelector((state) => state.selectedNetwork)
  const { isTestnet: defaultIsTestnet, chain: defaultChain } =
    useEthersProvider({ chainId })
  const { chain: accountChain, isConnected } = useAccount()

  const activeChain = isConnected ? accountChain : defaultChain

  return {
    chainId: activeChain?.id,
    targetChainId: chainId,
    networkName: activeChain?.name,
    isWrongNetwork: activeChain?.id !== chainId,
    isTestnet: isConnected ? accountChain?.testnet : defaultIsTestnet,
    explorerUrl: activeChain?.blockExplorers?.default.url,
  }
}
