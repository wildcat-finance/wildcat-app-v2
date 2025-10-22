import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import Image, { ImageProps } from "next/image"

import EthereumIcon from "@/assets/pictures/ethereum-icon.webp"
import PlasmaIcon from "@/assets/pictures/plasma-icon.png"

export const NetworkIcon = ({
  chainId,
  width = 24,
  height = 24,
  ...props
}: {
  chainId: SupportedChainId
} & Omit<ImageProps, "src" | "alt">) => {
  switch (chainId) {
    case SupportedChainId.Mainnet:
    case SupportedChainId.Sepolia:
      return (
        <Image
          src={EthereumIcon.src}
          alt="Ethereum"
          width={width}
          height={height}
          {...props}
        />
      )
    case SupportedChainId.PlasmaTestnet:
    case SupportedChainId.PlasmaMainnet:
      return (
        <Image
          src={PlasmaIcon.src}
          alt="Plasma"
          width={width}
          height={height}
          {...props}
        />
      )
    default:
      throw Error(`Network icon not found for chainId: ${chainId}`)
  }
}
