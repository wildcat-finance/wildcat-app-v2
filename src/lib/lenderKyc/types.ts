import { LenderKycDetails } from "@/utils/lenderKycMessage"

export type LenderKycOutcome = "submitted" | "updated" | "unchanged" | "skipped"

export type LenderKycSavedProfile = {
  details: LenderKycDetails
  savedAt: string
}

export type LenderKycWalletStatus = {
  hasSavedRecord: boolean
}

export type LenderKycSignedPayload = {
  address: string
  chainId: number
  nonce: string
  secret: string
  timeSigned: number
  signature: string
}

export type LenderKycDetailsResult = {
  outcome: LenderKycOutcome
  profile: LenderKycSavedProfile
}

export type LenderKycWalletRow = {
  address: string
  chainId: number
  firstSignedAt: string
  lastSignedAt: string
  termsVersion: string
  details?: LenderKycDetails
  detailsUnreadable?: boolean
}
