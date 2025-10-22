import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

export type SignatureSubmissionProps = {
  address: string
  name: string
  signature: string
  messageHash?: string
  timeSigned?: number
  chainId: SupportedChainId
}
