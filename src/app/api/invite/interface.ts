/// Borrower invitation.
export interface BorrowerInvitation {
  id: number
  chainId: number
  address: string
  name: string
  inviter: string
  timeInvited: Date
}

/// Input for inviting a borrower.
export interface BorrowerInvitationInput {
  address: string
  name: string
  inviter: string
}

/// Input for accepting an invitation.
export interface AcceptInvitationInput {
  address: string
  name: string
  signature: string
  dateSigned: string
}
