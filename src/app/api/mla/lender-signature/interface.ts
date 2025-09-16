import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

export interface LenderMlaSignatureInput {
  market: string
  chainId: SupportedChainId
  address: string
  signature: string
  timeSigned: number
}
