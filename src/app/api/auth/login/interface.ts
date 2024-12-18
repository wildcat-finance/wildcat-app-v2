export interface LoginInput {
  address: string
  signature: string
  timeSigned: number
}

export interface DataStoredInToken {
  /* Address the account is signed in as */
  address: string
  /* Address the login was performed with */
  signer: string
  /* Whether the account is an admin */
  isAdmin: boolean
}

export interface AuthSession {
  /* Address the account is signed in as */
  address: string
  /* Address the login was performed with */
  signer: string
  /* Whether the account is an admin */
  isAdmin: boolean
}
