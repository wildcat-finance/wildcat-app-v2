export interface BorrowerProfile {
  chainId: number
  address: string

  name?: string
  description?: string
  founded?: string
  headquarters?: string
  website?: string
  twitter?: string
  linkedin?: string
  email?: string
  registeredOnChain: boolean
}

export type BorrowerProfileInput = Omit<
  BorrowerProfile,
  "registeredOnChain" | "chainId"
>
