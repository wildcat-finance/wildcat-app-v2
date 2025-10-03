import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import Image from "next/image"

import EthereumIcon from "@/assets/pictures/ethereum-icon.webp"
import PlasmaIcon from "@/assets/pictures/plasma-icon.png"

export const NetworkIcon = ({ chainId }: { chainId: SupportedChainId }) => {
  switch (chainId) {
    case SupportedChainId.Mainnet:
    case SupportedChainId.Sepolia:
      return (
        <Image src={EthereumIcon.src} alt="Ethereum" width={24} height={24} />
      )
    case SupportedChainId.PlasmaTestnet:
    case SupportedChainId.PlasmaMainnet:
      return <Image src={PlasmaIcon.src} alt="Plasma" width={24} height={24} />
    default:
      throw Error(`Network icon not found for chainId: ${chainId}`)
  }
}
