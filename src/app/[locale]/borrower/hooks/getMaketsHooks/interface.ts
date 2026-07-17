import { SignerOrProvider, SupportedChainId } from "@wildcatfi/wildcat-sdk"

export type GetMarketsProps = {
  borrowerAddress?: `0x${string}`
  provider: SignerOrProvider | undefined
  chainId: SupportedChainId | undefined
  enabled: boolean
}
