import {
  LenderKycDetails,
  LenderKycMessageKind,
} from "@/utils/lenderKycMessage"

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

export type LenderKycSignatureRecord = {
  id: string
  startId: string
  kind: LenderKycMessageKind
  address: string
  chainId: number
  nonce: string
  message: string
  signature: string
  termsVersion: string
  signedAt: string
}

export type LenderKycProfileRevision = {
  id: string
  address: string
  signatureId: string
  details: LenderKycDetails
  savedAt: string
}

export type LenderKycNonce = {
  nonce: string
  address: string
  chainId: number
  issuedAt: string
  expiresAt: string
  usedAt?: string
}

export type LenderKycStore = {
  starts: LenderKycStart[]
  signatures: LenderKycSignatureRecord[]
  revisions: LenderKycProfileRevision[]
  nonces: LenderKycNonce[]
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
  message: string
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
}
