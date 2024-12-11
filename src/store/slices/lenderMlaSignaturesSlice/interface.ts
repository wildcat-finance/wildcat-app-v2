export type LenderMlaSignature = {
  refusedToSign: boolean
  signed: boolean
  market: string
  address: string
}

export type LenderMlaSignatures = {
  [marketAndAddress: string]: LenderMlaSignature
}
