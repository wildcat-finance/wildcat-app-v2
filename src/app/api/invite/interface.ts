/// Borrower invitation.

export type BorrowerInvitation = {
  id: number
  inviter: string
  chainId: number
  address: string
  name: string
  description?: string
  founded?: string
  headquarters?: string
  jurisdiction?: string
  physicalAddress?: string
  entityKind?: string
  timeInvited: Date
  timeSigned?: Date
  registeredOnChain: boolean
}

/// Input for inviting a borrower.
export interface BorrowerInvitationInput {
  address: string
  name: string
  description?: string
  founded?: string
  headquarters?: string
  jurisdiction?: string
  physicalAddress?: string
  entityKind?: string
}

/// Input for accepting an invitation.
export interface AcceptInvitationInput {
  address: string
  name: string
  description?: string
  founded?: string
  headquarters?: string
  jurisdiction?: string
  physicalAddress?: string
  entityKind?: string
  signature: string
  timeSigned: number
}

export type BorrowerInvitationForAdminView = BorrowerInvitation & {
  hasSignedServiceAgreement: boolean
  timeSigned: Date | null
  registeredOnChain: boolean
}
