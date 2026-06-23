import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { VerifiedSignature } from "@/lib/signatures/interface"

export interface NonMlaAcknowledgementInput {
  chainId: SupportedChainId
  address: string
  signature: string
  timeSigned: number
}

export type NonMlaAcknowledgementResponse = {
  kind: VerifiedSignature["kind"]
  address: string
  signer: string
  signature: string
  blockNumber?: number
  chainId: number
  market: string
  acknowledgementTextVersion: string
  acknowledgementText: string
  timeSigned: Date
}
