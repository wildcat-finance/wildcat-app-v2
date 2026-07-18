import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { ToUAcceptanceState } from "@/utils/serviceAgreementState"

export interface ServiceAgreementVersionInfo {
  version: string
  plaintextSha256: string
  effectiveDate: string
  // Re-acceptance campaign deadline (ISO); null = no campaign active.
  reacceptanceDeadline: string | null
}

export interface CurrentServiceAgreementResponse
  extends ServiceAgreementVersionInfo {
  plaintext: string
  html: string
  acknowledgementText: string
  legacyWrapperHash: string | null
}

export interface ServiceAgreementAcceptanceInfo {
  version: string
  plaintextSha256: string
  legacyWrapperHash: string | null
  organizationName: string | null
  acceptedAt: number
}

export interface ServiceAgreementStatusResponse {
  current: ServiceAgreementVersionInfo
  accepted: ServiceAgreementAcceptanceInfo | null
}

export type ServiceAgreementPartyInput = "Borrower" | "Lender"

/// POST /api/service-agreement/accept
export interface AcceptServiceAgreementInput {
  address: string
  chainId: SupportedChainId
  signature: string
  timeSigned: number
  party: ServiceAgreementPartyInput
}

/// POST /api/service-agreement/decline
export interface DeclineServiceAgreementInput
  extends AcceptServiceAgreementInput {
  reason?: string
}

/// Shape returned by GET /api/sla/[address] (the network-gate query).
/// All acceptance fields are scoped to `party`.
export interface ServiceAgreementGateResponse {
  party: ServiceAgreementPartyInput
  // True when this capacity has accepted any seeded version.
  isSigned: boolean
  state: ToUAcceptanceState
  currentVersion: ServiceAgreementVersionInfo
  // Newest version this account has accepted in this capacity; null if none.
  acceptedVersion: {
    version: string
    plaintextSha256: string
    effectiveDate: string
  } | null
}

export interface ServiceAgreementRefusalInfo {
  address: string
  signer: string
  party: ServiceAgreementPartyInput
  reason: string | null
  timeSigned: number
}

export interface ServiceAgreementStaleAccountInfo {
  address: string
  party: ServiceAgreementPartyInput
  latestAcceptedVersion: string
  latestTimeSigned: number
}

/// GET /api/service-agreement/reacceptance (admin)
export interface ServiceAgreementReacceptanceResponse {
  currentVersion: ServiceAgreementVersionInfo
  refusals: ServiceAgreementRefusalInfo[]
  staleAccounts: ServiceAgreementStaleAccountInfo[]
}
