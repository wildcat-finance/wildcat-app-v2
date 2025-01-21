/// Borrower invitation.
export interface BorrowerInvitation {
  id: number
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
