import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { NETWORKS, TargetChainId } from "@/config/network"

export const checkIsWrongNetwork = (
  currentChainId: SupportedChainId | undefined,
) => currentChainId !== TargetChainId

export const useCurrentNetwork = () => {
  const { chain } = useAccount()

  const isTestnet = chain?.id === NETWORKS.Sepolia.chainId

  return {
    chainId: chain?.id,
    isWrongNetwork: checkIsWrongNetwork(chain?.id),
    isTestnet,
  }
}
