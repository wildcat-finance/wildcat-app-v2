import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { TargetChainId } from "@/config/network"

export const checkIsWrongNetwork = (
  currentChainId: SupportedChainId | undefined,
) => currentChainId !== TargetChainId

export const useCurrentNetwork = () => {
  const { chain: accountChain } = useAccount()

  return {
    chainId: accountChain?.id,
    networkName: accountChain?.name,
    isWrongNetwork: checkIsWrongNetwork(accountChain?.id),
    isTestnet: accountChain?.testnet,
  }
}
