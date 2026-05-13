import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

export interface LoginInput {
  address: string
  signature: string
  timeSigned: number
  chainId: SupportedChainId
}

export interface DataStoredInToken {
  /* Address the account is signed in as */
  address: string
  /* Address the login was performed with */
  signer: string
  /* Chain the account is signed in for */
  chainId: SupportedChainId
  /* Whether the account is an admin */
  isAdmin: boolean
}

export interface AuthSession {
  /* Address the account is signed in as */
  address: string
  /* Address the login was performed with */
  signer: string
  /* Chain the account is signed in for */
  chainId: SupportedChainId
  /* Whether the account is an admin */
  isAdmin: boolean
}
