import { useAccount } from "wagmi"
import { NETWORKS, TargetChainId } from "@/config/network"

export const useCurrentNetwork = () => {
  const { chain } = useAccount()

  const isTestnet = chain?.id === NETWORKS.Sepolia.chainId

  return {
    chainId: chain?.id,
    isWrongNetwork: chain?.id !== TargetChainId,
    isTestnet,
  }
}
