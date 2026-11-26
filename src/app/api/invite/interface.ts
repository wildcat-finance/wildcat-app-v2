/// Borrower invitation.

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

export type BorrowerInvitation = {
  /// The organisation the invited address will act for.
  borrowerId: string
  inviter: string
  chainId: number
  address: string
  name: string
  alias?: string
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

/// An invitation as the invited wallet accepts it.
export type PendingBorrowerInvitation = BorrowerInvitation & {
  /// The organisation already acts through another wallet, so its profile is
  /// shared: accepting keeps the organisation's name and details, which change
  /// only through a reviewed profile update.
  profileLocked: boolean
}

/// Input for inviting a borrower.
///
/// With `borrowerId`, the address joins that existing organisation on this
/// network and the profile fields are ignored. Without it, a new organisation
/// is created from the profile fields.
export interface BorrowerInvitationInput {
  chainId: SupportedChainId
  address: string
  borrowerId?: string
  name: string
  alias?: string
  description?: string
  founded?: string
  headquarters?: string
  jurisdiction?: string
  physicalAddress?: string
  entityKind?: string
}

/// Input for accepting an invitation.
export interface AcceptInvitationInput {
  chainId: SupportedChainId
  address: string
  name: string
  alias?: string
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
