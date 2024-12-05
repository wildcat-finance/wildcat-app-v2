export interface BorrowerProfile {
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
  updatedAt: number
}

export type BorrowerProfileInput = Omit<BorrowerProfile, "updatedAt">
