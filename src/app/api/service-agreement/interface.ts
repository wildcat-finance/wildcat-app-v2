export interface ServiceAgreementVersionInfo {
  version: string
  plaintextSha256: string
  effectiveDate: string
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
