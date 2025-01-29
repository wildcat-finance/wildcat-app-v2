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
  entityKind?: string
  physicalAddress?: string
  email?: string
  registeredOnChain: boolean
}

export type BorrowerProfileForAdminView = BorrowerProfile & {
  timeInvited?: Date
  timeSigned?: Date
}

export type BorrowerProfileInput = Omit<
  BorrowerProfile,
  "registeredOnChain" | "chainId"
>
