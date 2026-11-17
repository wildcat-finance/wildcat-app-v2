import { randomBytes, timingSafeEqual } from "crypto"

import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"

import {
  LENDER_KYC_SIGNATURE_MAX_AGE_MS,
  LENDER_KYC_TERMS_VERSION,
} from "@/config/lender-kyc"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import {
  buildLenderKycMessage,
  LenderKycDetails,
  LenderKycMessageKind,
  normalizeLenderKycDetails,
} from "@/utils/lenderKycMessage"

import {
  hashLenderKycSecret,
  LenderKycStorageNotConfiguredError,
} from "./crypto"
import {
  LenderKycConflictError,
  LenderKycNonceRecord,
  LenderKycRepository,
  LenderKycSignedRecord,
  LenderKycStoredSignature,
} from "./repository"
import { LenderKycDetailsResult, LenderKycSavedProfile } from "../types"

const CLOCK_SKEW_MS = 5 * 60 * 1000
const REPLAY_WINDOW_MS = 15 * 60 * 1000

export type LenderKycErrorCode = "nonceConsumed"

export class LenderKycRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: LenderKycErrorCode,
  ) {
    super(message)
  }
}

const nonceConsumedError = () =>
  new LenderKycRequestError("Nonce already used", 409, "nonceConsumed")

const isNonceConsumedConflict = (error: unknown) =>
  error instanceof LenderKycConflictError && error.reason === "nonceConsumed"

export type LenderKycSignedInput = {
  startId: string
  address: string
  chainId: number
  nonce: string
  secret: string
  timeSigned: number
  signature: string
}

export const isLenderKycChainSupported = (chainId: number) => {
  if (!isSupportedChainId(chainId)) return false
  try {
    getProviderForServer(chainId)
    return true
  } catch {
    return false
  }
}

const requireOwnNonce = async (
  repository: LenderKycRepository,
  input: LenderKycSignedInput,
): Promise<LenderKycNonceRecord> => {
  const nonce = await repository.findNonce(input.nonce)
  if (
    !nonce ||
    nonce.address !== input.address ||
    nonce.chainId !== input.chainId
  ) {
    throw new LenderKycRequestError("Unknown nonce", 400)
  }
  const expected = Buffer.from(nonce.secretHash, "hex")
  const actual = Buffer.from(hashLenderKycSecret(input.secret), "hex")
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new LenderKycRequestError("Invalid nonce secret", 403)
  }
  return nonce
}

const requireOwnStart = async (
  repository: LenderKycRepository,
  input: LenderKycSignedInput,
) => {
  const start = await repository.findStart(input.startId)
  if (
    !start ||
    start.address !== input.address ||
    start.chainId !== input.chainId
  ) {
    throw new LenderKycRequestError("Unknown KYC start", 404)
  }
}

const buildMessage = (
  input: LenderKycSignedInput,
  kind: LenderKycMessageKind,
  details?: LenderKycDetails,
) =>
  buildLenderKycMessage({
    kind,
    address: input.address,
    chainId: input.chainId,
    nonce: input.nonce,
    timeSigned: input.timeSigned,
    details,
  })

const findReplay = async (
  repository: LenderKycRepository,
  input: LenderKycSignedInput,
  kind: LenderKycMessageKind,
  details?: LenderKycDetails,
): Promise<LenderKycStoredSignature | undefined> => {
  const stored = await repository.findSignatureByNonce(input.nonce)
  if (!stored) return undefined
  if (
    stored.messageKind !== kind ||
    stored.signature !== input.signature ||
    stored.signedMessage !== buildMessage(input, kind, details) ||
    Date.now() - stored.createdAt.getTime() > REPLAY_WINDOW_MS
  ) {
    throw nonceConsumedError()
  }
  return stored
}

const settleReplay = async (
  repository: LenderKycRepository,
  input: LenderKycSignedInput,
  replay: LenderKycStoredSignature,
) => {
  await requireOwnStart(repository, input)
  await repository.recordReplayOutcome(input.startId, replay.outcome)
}

const replayDetails = async (
  repository: LenderKycRepository,
  input: LenderKycSignedInput,
  details: LenderKycDetails,
  replay: LenderKycStoredSignature,
): Promise<LenderKycDetailsResult> => {
  await settleReplay(repository, input, replay)
  const profile = await repository.getVisibleProfile(
    input.address,
    input.chainId,
  )
  return {
    outcome: replay.outcome,
    profile: profile ?? {
      details: normalizeLenderKycDetails(details),
      savedAt: replay.createdAt.toISOString(),
    },
  }
}

const replayOwnership = async (
  repository: LenderKycRepository,
  input: LenderKycSignedInput,
  replay: LenderKycStoredSignature,
): Promise<LenderKycSavedProfile> => {
  const profile = await repository.getVisibleProfile(
    input.address,
    input.chainId,
  )
  if (!profile) {
    throw new LenderKycRequestError("No saved record for this wallet", 409)
  }
  await settleReplay(repository, input, replay)
  return profile
}

const verifySignedInput = async (
  input: LenderKycSignedInput,
  nonce: LenderKycNonceRecord,
  kind: LenderKycMessageKind,
  details?: LenderKycDetails,
): Promise<LenderKycSignedRecord> => {
  if (nonce.usedAt) throw nonceConsumedError()
  const now = Date.now()
  if (nonce.expiresAt.getTime() < now) {
    throw new LenderKycRequestError("Nonce expired", 400)
  }
  if (
    input.timeSigned < nonce.issuedAt.getTime() - CLOCK_SKEW_MS ||
    input.timeSigned > now + CLOCK_SKEW_MS ||
    input.timeSigned > nonce.expiresAt.getTime()
  ) {
    throw new LenderKycRequestError(
      "timeSigned is outside the accepted signing window",
      400,
    )
  }

  const signedMessage = buildMessage(input, kind, details)
  let verified: Awaited<ReturnType<typeof verifyAndDescribeSignature>>
  try {
    verified = await verifyAndDescribeSignature({
      provider: getProviderForServer(input.chainId),
      address: input.address,
      message: signedMessage,
      signature: input.signature,
      allowSingleSafeOwner: false,
    })
  } catch {
    throw new LenderKycRequestError("Signature could not be verified", 502)
  }
  if (!verified || verified.kind === "GnosisOwnerECDSA") {
    throw new LenderKycRequestError("Invalid signature", 400)
  }

  return {
    startId: input.startId,
    messageKind: kind,
    chainId: input.chainId,
    address: input.address,
    signer: verified.address.toLowerCase(),
    signatureKind: verified.kind,
    blockNumber: verified.kind === "ECDSA" ? null : verified.blockNumber,
    nonce: input.nonce,
    timeSigned: new Date(input.timeSigned),
    signature: input.signature,
    signedMessage,
    termsVersion: LENDER_KYC_TERMS_VERSION,
  }
}

const mapRepositoryError = (error: unknown): never => {
  if (isNonceConsumedConflict(error)) throw nonceConsumedError()
  if (error instanceof LenderKycConflictError) {
    throw new LenderKycRequestError(error.message, 409)
  }
  throw error
}

export const issueLenderKycNonce = async (
  repository: LenderKycRepository,
  address: string,
  chainId: number,
) => {
  const secret = randomBytes(32).toString("hex")
  const { nonce, expiresAt } = await repository.issueNonce({
    address,
    chainId,
    secretHash: hashLenderKycSecret(secret),
    expiresAt: new Date(Date.now() + LENDER_KYC_SIGNATURE_MAX_AGE_MS),
  })
  return { nonce, secret, expiresAt }
}

export const submitLenderKycDetails = async (
  repository: LenderKycRepository,
  input: LenderKycSignedInput,
  details: LenderKycDetails,
): Promise<LenderKycDetailsResult> => {
  const nonce = await requireOwnNonce(repository, input)
  const replay = await findReplay(repository, input, "details", details)
  if (replay) return replayDetails(repository, input, details, replay)
  await requireOwnStart(repository, input)
  const signed = await verifySignedInput(input, nonce, "details", details)
  try {
    return await repository.recordSignedDetails(signed, details)
  } catch (error) {
    if (isNonceConsumedConflict(error)) {
      const concurrent = await findReplay(repository, input, "details", details)
      if (concurrent) {
        return replayDetails(repository, input, details, concurrent)
      }
    }
    return mapRepositoryError(error)
  }
}

export const confirmLenderKycOwnership = async (
  repository: LenderKycRepository,
  input: LenderKycSignedInput,
): Promise<LenderKycSavedProfile> => {
  const nonce = await requireOwnNonce(repository, input)
  const replay = await findReplay(repository, input, "ownership")
  if (replay) return replayOwnership(repository, input, replay)
  await requireOwnStart(repository, input)
  const signed = await verifySignedInput(input, nonce, "ownership")
  try {
    return await repository.recordOwnership(signed)
  } catch (error) {
    if (isNonceConsumedConflict(error)) {
      const concurrent = await findReplay(repository, input, "ownership")
      if (concurrent) return replayOwnership(repository, input, concurrent)
    }
    return mapRepositoryError(error)
  }
}

export const toLenderKycErrorResponse = (error: unknown) => {
  if (error instanceof LenderKycRequestError) {
    return {
      status: error.status,
      body: error.code
        ? { error: error.message, code: error.code }
        : { error: error.message },
    }
  }
  if (error instanceof LenderKycStorageNotConfiguredError) {
    return { status: 503, body: { error: "KYC storage is not configured" } }
  }
  console.error("Lender KYC request failed", error)
  return { status: 500, body: { error: "Internal server error" } }
}
