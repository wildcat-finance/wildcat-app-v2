import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

export interface ServiceAgreementSignatureInput {
  address: string
  chainId: SupportedChainId
  signature: string
  timeSigned: number
}
