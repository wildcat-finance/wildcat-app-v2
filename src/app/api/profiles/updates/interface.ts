import { BorrowerProfileInput } from "../interface"

export interface BorrowerProfileUpdate {
  updateId: number
  createdAt: number
  acceptedAt?: number
  rejectedAt?: number
  rejectedReason?: string
  update: BorrowerProfileInput
}

export type BorrowerProfileUpdateInput = Omit<
  BorrowerProfileUpdate,
  "updateId" | "createdAt"
>

export type BorrowerProfileUpdateResponse = {
  borrower: string
  updateId: number
  accept?: boolean
  rejectedReason?: string
}
