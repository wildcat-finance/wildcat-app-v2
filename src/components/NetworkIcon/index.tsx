import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import Image, { ImageProps } from "next/image"
import { match, P } from "ts-pattern"

import EthereumIcon from "@/assets/pictures/ethereum-icon.webp"
import PlasmaIcon from "@/assets/pictures/plasma-icon.png"

export const NetworkIcon = ({
  chainId,
  width = 24,
  height = 24,
  ...props
}: {
  chainId: SupportedChainId
} & Omit<ImageProps, "src" | "alt">) =>
  match(chainId)
    .with(P.union(SupportedChainId.Mainnet, SupportedChainId.Sepolia), () => (
      <Image
        src={EthereumIcon.src}
        alt="Ethereum"
        width={width}
        height={height}
        {...props}
      />
    ))
    .with(
      P.union(SupportedChainId.PlasmaTestnet, SupportedChainId.PlasmaMainnet),
      () => (
        <Image
          src={PlasmaIcon.src}
          alt="Plasma"
          width={width}
          height={height}
          {...props}
        />
      ),
    )
    .otherwise(() => {
      throw Error(`Network icon not found for chainId: ${chainId}`)
    })
