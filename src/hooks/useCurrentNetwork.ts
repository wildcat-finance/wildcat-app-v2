import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { NETWORKS_BY_ID } from "@/config/network"
import { useAppSelector } from "@/store/hooks"

import { useEthersProvider } from "./useEthersSigner"

export const useCurrentNetwork = () => {
  const { chainId } = useAppSelector((state) => state.selectedNetwork)
  const {
    isTestnet: defaultIsTestnet,
    chain: defaultChain,
    hasV1Deployment: defaultHasV1Deployment,
  } = useEthersProvider({ chainId })
  const { chain: accountChain, isConnected } = useAccount()
  const accountChainHasV1Deployment =
    accountChain &&
    NETWORKS_BY_ID[accountChain.id as SupportedChainId]?.hasV1Deployment

  const activeChain = isConnected ? accountChain : defaultChain

  return {
    chainId: activeChain?.id,
    targetChainId: chainId,
    networkName: activeChain?.name,
    isWrongNetwork: activeChain?.id !== chainId,
    isTestnet: isConnected ? accountChain?.testnet : defaultIsTestnet,
    explorerUrl: activeChain?.blockExplorers?.default.url,
    hasV1Deployment: isConnected
      ? accountChainHasV1Deployment
      : defaultHasV1Deployment,
  }
}
