export type ApiToken = {
  token: string
  address: string
  signer: string
  isAdmin: boolean
}

export type ApiTokensType = {
  [accountAddress: string]: ApiToken
}
