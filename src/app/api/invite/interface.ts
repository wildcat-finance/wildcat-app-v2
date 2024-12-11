/// Borrower invitation.
export interface BorrowerInvitation {
  id: number
  chainId: number
  address: string
  name: string
  timeInvited: Date
}

/// Input for inviting a borrower.
export interface BorrowerInvitationInput {
  address: string
  name: string
}

/// Input for accepting an invitation.
export interface AcceptInvitationInput {
  address: string
  name: string
  signature: string
  dateSigned: string
}

export type BorrowerInvitationForAdminView = BorrowerInvitation & {
  hasSignedServiceAgreement: boolean
  timeSigned: Date | null
  registeredOnChain: boolean
}
