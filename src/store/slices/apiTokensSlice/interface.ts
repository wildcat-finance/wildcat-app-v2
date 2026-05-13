export type ApiToken = {
  token: string
  address: string
  signer: string
  chainId: number
  isAdmin: boolean
}

export type ApiTokensType = {
  [accountAddress: string]: ApiToken
}
