export type BorrowerAdditionalUrl = {
  label: string
  url: string
}

export interface BorrowerProfile {
  chainId: number
  address: string

  name?: string
  alias?: string
  avatar?: string
  description?: string
  founded?: string
  headquarters?: string
  website?: string
  twitter?: string
  telegram?: string
  linkedin?: string
  // TODO: we should add this, or introduce it quickly
  // telegram?: string
  jurisdiction?: string
  entityKind?: string
  physicalAddress?: string
  email?: string
  additionalUrls?: BorrowerAdditionalUrl[]
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
