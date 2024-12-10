import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { TargetChainId } from "@/config/network"

import { useEthersProvider } from "./useEthersSigner"

export const checkIsWrongNetwork = (
  currentChainId: SupportedChainId | undefined,
) => currentChainId !== TargetChainId

export const useCurrentNetwork = () => {
  const { isTestnet, chain } = useEthersProvider()

  return {
    chainId: chain?.id,
    networkName: chain?.name,
    isWrongNetwork: checkIsWrongNetwork(chain?.id),
    isTestnet,
  }
}
