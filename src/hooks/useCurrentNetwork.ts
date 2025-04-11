import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { TargetChainId } from "@/config/network"

import { useEthersProvider } from "./useEthersSigner"

export const checkIsWrongNetwork = (
  currentChainId: SupportedChainId | undefined,
) => currentChainId !== TargetChainId

export const useCurrentNetwork = () => {
  const { isTestnet: defaultIsTestnet, chain: defaultChain } =
    useEthersProvider()
  const { chain: accountChain, isConnected } = useAccount()

  const activeChain = isConnected ? accountChain : defaultChain

  return {
    chainId: activeChain?.id,
    networkName: activeChain?.name,
    isWrongNetwork: checkIsWrongNetwork(activeChain?.id),
    isTestnet: isConnected ? accountChain?.testnet : defaultIsTestnet,
  }
}
