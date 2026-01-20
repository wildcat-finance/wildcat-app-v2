import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { NETWORKS_BY_ID } from "@/config/network"

import { useEthersProvider } from "./useEthersSigner"
import { useNetworkGate } from "./useNetworkGate"

export const useCurrentNetwork = () => {
  const { selectedChainId, walletChain, isConnected, isWrongNetwork } =
    useNetworkGate({ includeAgreementStatus: false })
  const {
    isTestnet: defaultIsTestnet,
    chain: defaultChain,
    hasV1Deployment: defaultHasV1Deployment,
  } = useEthersProvider({ chainId: selectedChainId })
  const accountChainHasV1Deployment =
    walletChain &&
    NETWORKS_BY_ID[walletChain.id as SupportedChainId]?.hasV1Deployment

  const activeChain = isConnected ? walletChain : defaultChain

  return {
    chainId: activeChain?.id,
    targetChainId: selectedChainId,
    networkName: activeChain?.name,
    isWrongNetwork,
    isTestnet: isConnected ? walletChain?.testnet : defaultIsTestnet,
    explorerUrl: activeChain?.blockExplorers?.default.url,
    hasV1Deployment: isConnected
      ? accountChainHasV1Deployment
      : defaultHasV1Deployment,
  }
}
