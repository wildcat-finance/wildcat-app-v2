import { LenderKycDetails } from "@/utils/lenderKycMessage"

export type LenderKycOutcome =
  | "submitted"
  | "updated"
  | "unchanged"
  | "skipped"
  | "closed"
  | "notSigned"

export type LenderKycNotSignedReason = "declined" | "walletMismatch"

export type LenderKycStartSource = "click" | "walletSwitch"

export type LenderKycStart = {
  id: string
  address: string
  chainId: number
  source: LenderKycStartSource
  clickedAt: string
  outcome?: LenderKycOutcome
  outcomeReason?: LenderKycNotSignedReason
  outcomeAt?: string
  forwardedAt?: string
}

export type LenderKycSavedProfile = {
  details: LenderKycDetails
  savedAt: string
}

export type LenderKycWalletStatus = {
  hasSavedRecord: boolean
}

export type LenderKycStartResult = LenderKycWalletStatus & {
  start: LenderKycStart
}

export type LenderKycSignedPayload = {
  startId: string
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
  firstClickedAt?: string
  lastClickedAt?: string
  starts: number
  outcome?: LenderKycOutcome
  outcomeReason?: LenderKycNotSignedReason
  outcomeAt?: string
  termsVersion?: string
  forwardedAt?: string
  details?: LenderKycDetails
  detailsUnreadable?: boolean
}
