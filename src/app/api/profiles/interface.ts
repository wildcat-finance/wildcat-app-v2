export interface BorrowerProfile {
  address: string
  name?: string
  description?: string
  founded?: string
  headquarters?: string
  website?: string
  twitter?: string
  linkedin?: string
  email?: string
  updatedAt: number
}

export type BorrowerProfileInput = Omit<BorrowerProfile, "updatedAt">
