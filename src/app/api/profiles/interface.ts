export interface BorrowerProfile {
  chainId: number
  address: string

  name?: string
  avatar?: string
  description?: string
  founded?: string
  headquarters?: string
  website?: string
  twitter?: string
  linkedin?: string
  jurisdiction?: string
  legalNature?: string
  companyAddress?: string
  email?: string
  registeredOnChain: boolean
}

export type BorrowerProfileInput = Omit<
  BorrowerProfile,
  "registeredOnChain" | "chainId"
>
