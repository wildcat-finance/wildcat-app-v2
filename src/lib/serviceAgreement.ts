import { createHash } from "crypto"

import {
  Prisma,
  ServiceAgreement,
  ServiceAgreementParty,
  ServiceAgreementSignature,
  SignatureKind,
} from "@prisma/client"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import {
  buildServiceAgreementDeclineMessage,
  buildServiceAgreementMessage,
  isServiceAgreementTimeSignedInBounds,
  normalizeServiceAgreementDeclineReason,
  SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
  SERVICE_AGREEMENT_TIME_SIGNED_MAX_FUTURE_MS,
} from "@/utils/serviceAgreementMessage"
import {
  computeToUAcceptanceState,
  ToUAcceptanceState,
} from "@/utils/serviceAgreementState"

// The timeSigned window lives in utils/serviceAgreementMessage (shared with
// client flows, which align pending-signature expiry to it); re-exported here
// so server routes keep a single import origin.
export {
  buildServiceAgreementMessage,
  buildServiceAgreementDeclineMessage,
  isServiceAgreementTimeSignedInBounds,
  SERVICE_AGREEMENT_TIME_SIGNED_MAX_AGE_MS,
  SERVICE_AGREEMENT_TIME_SIGNED_MAX_FUTURE_MS,
}

// ServiceAgreement without the heavy plaintext/html columns - all the signing
// and status paths need. The certificate path uses the full row instead.
const SERVICE_AGREEMENT_META_SELECT = {
  id: true,
  version: true,
  plaintextSha256: true,
  legacyWrapperHash: true,
  acknowledgementText: true,
  effectiveDate: true,
  isCurrent: true,
  reacceptanceDeadline: true,
} satisfies Prisma.ServiceAgreementSelect

export type ServiceAgreementMeta = Prisma.ServiceAgreementGetPayload<{
  select: typeof SERVICE_AGREEMENT_META_SELECT
}>

export async function getCurrentServiceAgreement(): Promise<ServiceAgreementMeta> {
  // The ServiceAgreement_one_current partial unique index guarantees at most one.
  const agreement = await prisma.serviceAgreement.findFirst({
    where: { isCurrent: true },
    select: SERVICE_AGREEMENT_META_SELECT,
  })
  if (!agreement) {
    throw new Error(
      "No current ServiceAgreement - has the versioning migration been applied?",
    )
  }
  return agreement
}

const CURRENT_SERVICE_AGREEMENT_SELECT = {
  id: true,
  version: true,
  plaintext: true,
  html: true,
  plaintextSha256: true,
  legacyWrapperHash: true,
  acknowledgementText: true,
  effectiveDate: true,
  isCurrent: true,
  reacceptanceDeadline: true,
} satisfies Prisma.ServiceAgreementSelect

export type CurrentServiceAgreement = Prisma.ServiceAgreementGetPayload<{
  select: typeof CURRENT_SERVICE_AGREEMENT_SELECT
}>

export async function getCurrentServiceAgreementContent(): Promise<CurrentServiceAgreement> {
  const agreement = await prisma.serviceAgreement.findFirst({
    where: { isCurrent: true },
    select: CURRENT_SERVICE_AGREEMENT_SELECT,
  })
  if (!agreement) {
    throw new Error(
      "No current ServiceAgreement - has the versioning migration been applied?",
    )
  }
  return agreement
}

// Check the original bytes, without trimming or normalizing line endings. The
// legacy seed has only placeholder text and intentionally fails this check.
const hasServiceAgreementContent = (agreement: {
  plaintext: string
  plaintextSha256: string
}) =>
  createHash("sha256").update(agreement.plaintext, "utf8").digest("hex") ===
  agreement.plaintextSha256

export async function listServiceAgreementVersions() {
  const agreements = await prisma.serviceAgreement.findMany({
    orderBy: { id: "desc" },
    select: {
      version: true,
      plaintext: true,
      plaintextSha256: true,
      effectiveDate: true,
      isCurrent: true,
    },
  })
  return agreements.map((agreement) => ({
    version: agreement.version,
    plaintextSha256: agreement.plaintextSha256,
    effectiveDate: agreement.effectiveDate.toISOString(),
    isCurrent: agreement.isCurrent,
    isAvailable: hasServiceAgreementContent(agreement),
  }))
}

export async function getServiceAgreementContentByVersion(version: string) {
  const agreement = await prisma.serviceAgreement.findFirst({
    where: { version },
    orderBy: { id: "desc" },
    select: CURRENT_SERVICE_AGREEMENT_SELECT,
  })
  return agreement && hasServiceAgreementContent(agreement) ? agreement : null
}

export type VerifiedServiceAgreementSignature = {
  chainId: number
  address: string
  signer: string
  party: ServiceAgreementParty
  serviceAgreementId: number
  signature: string
  kind: SignatureKind
  blockNumber: number | null
  timeSigned: Date
  organizationName: string | null
  signedMessage: string
}

/// Build the signable message for `agreement`, verify `signature` against it,
/// and return a normalized ServiceAgreementSignature row. Returns undefined if
/// the signature is invalid.
export async function verifyServiceAgreementSignature({
  agreement,
  chainId,
  address,
  party,
  signature,
  timeSigned,
  organizationName,
}: {
  agreement: ServiceAgreementMeta
  chainId: SupportedChainId
  address: string
  party: ServiceAgreementParty
  signature: string
  timeSigned: number
  organizationName?: string
}): Promise<VerifiedServiceAgreementSignature | undefined> {
  const accountAddress = address.toLowerCase()
  const signedMessage = buildServiceAgreementMessage({
    acknowledgementText: agreement.acknowledgementText,
    timeSigned,
    chainId,
    organizationName,
  })
  const result = await verifyAndDescribeSignature({
    provider: getProviderForServer(chainId),
    signature,
    message: signedMessage,
    address: accountAddress,
    allowSingleSafeOwner: false,
  })
  if (!result) return undefined
  return {
    chainId,
    address: accountAddress,
    signer: (result.kind === "GnosisOwnerECDSA"
      ? result.owner
      : result.address
    ).toLowerCase(),
    party,
    serviceAgreementId: agreement.id,
    signature,
    kind: result.kind,
    blockNumber: result.kind === "ECDSA" ? null : result.blockNumber,
    timeSigned: new Date(timeSigned),
    organizationName: organizationName ?? null,
    signedMessage,
  }
}

/// One row per account/capacity/version. A newly signed acceptance replaces the
/// previous acceptance so the canonical row retains the newest signed evidence.
export async function saveServiceAgreementSignature(
  data: VerifiedServiceAgreementSignature,
  transaction?: Prisma.TransactionClient,
): Promise<void> {
  const { chainId, address, party, serviceAgreementId } = data
  const client = transaction ?? prisma
  const key = { chainId, address, party, serviceAgreementId }
  // Ensure the row exists without modifying an existing action, then replace
  // it only if this action is newer. This makes retries and concurrent replay
  // monotonic: an older signature can never move the account backwards.
  await client.serviceAgreementSignature.upsert({
    where: {
      chainId_address_party_serviceAgreementId: key,
    },
    update: {},
    create: data,
  })
  await client.serviceAgreementSignature.updateMany({
    where: { ...key, timeSigned: { lt: data.timeSigned } },
    data: {
      signer: data.signer,
      signature: data.signature,
      kind: data.kind,
      blockNumber: data.blockNumber,
      timeSigned: data.timeSigned,
      organizationName: data.organizationName,
      signedMessage: data.signedMessage,
    },
  })
}

export type BorrowerAcceptance = ServiceAgreementSignature & {
  serviceAgreement: ServiceAgreement
}

/// The borrower's most recently accepted version on this chain, with the version
/// joined in. Ordered by ServiceAgreement.id DESC (newest version), never by
/// effectiveDate (two 2025-01-17 artifacts exist).
export async function getLatestBorrowerAcceptance(
  chainId: SupportedChainId,
  address: string,
): Promise<BorrowerAcceptance | null> {
  return prisma.serviceAgreementSignature.findFirst({
    where: { chainId, address: address.toLowerCase(), party: "Borrower" },
    orderBy: { serviceAgreementId: "desc" },
    include: { serviceAgreement: true },
  })
}

// Light projection for the status panel - excludes the version's plaintext/html.
const BORROWER_ACCEPTANCE_STATUS_SELECT = {
  organizationName: true,
  timeSigned: true,
  serviceAgreement: {
    select: { version: true, plaintextSha256: true, legacyWrapperHash: true },
  },
} satisfies Prisma.ServiceAgreementSignatureSelect

export type BorrowerAcceptanceStatus =
  Prisma.ServiceAgreementSignatureGetPayload<{
    select: typeof BORROWER_ACCEPTANCE_STATUS_SELECT
  }>

/// Same lookup as getLatestBorrowerAcceptance but selects only the fields the
/// status panel renders (no plaintext/html). Used by the status endpoint.
export async function getLatestBorrowerAcceptanceStatus(
  chainId: SupportedChainId,
  address: string,
): Promise<BorrowerAcceptanceStatus | null> {
  return prisma.serviceAgreementSignature.findFirst({
    where: { chainId, address: address.toLowerCase(), party: "Borrower" },
    orderBy: { serviceAgreementId: "desc" },
    select: BORROWER_ACCEPTANCE_STATUS_SELECT,
  })
}

export type VerifiedServiceAgreementRefusal = {
  chainId: number
  address: string
  signer: string
  party: ServiceAgreementParty
  serviceAgreementId: number
  signature: string
  kind: SignatureKind
  blockNumber: number | null
  reason: string | null
  timeSigned: Date
}

/// Build the decline message for `agreement`, verify `signature` against it,
/// and return a normalized ServiceAgreementRefusal row. Returns undefined if
/// the signature is invalid. The decline message is distinct from the
/// acceptance message so the two can never be confused.
export async function verifyServiceAgreementRefusal({
  agreement,
  chainId,
  address,
  party,
  signature,
  timeSigned,
  reason,
  organizationName,
}: {
  agreement: ServiceAgreementMeta
  chainId: SupportedChainId
  address: string
  party: ServiceAgreementParty
  signature: string
  timeSigned: number
  reason?: string
  organizationName?: string
}): Promise<VerifiedServiceAgreementRefusal | undefined> {
  const accountAddress = address.toLowerCase()
  const signedMessage = buildServiceAgreementDeclineMessage({
    version: agreement.version,
    plaintextSha256: agreement.plaintextSha256,
    timeSigned,
    chainId,
    party,
    organizationName,
    reason,
  })
  const result = await verifyAndDescribeSignature({
    provider: getProviderForServer(chainId),
    signature,
    message: signedMessage,
    address: accountAddress,
    allowSingleSafeOwner: false,
  })
  if (!result) return undefined
  return {
    chainId,
    address: accountAddress,
    signer: (result.kind === "GnosisOwnerECDSA"
      ? result.owner
      : result.address
    ).toLowerCase(),
    party,
    serviceAgreementId: agreement.id,
    signature,
    kind: result.kind,
    blockNumber: result.kind === "ECDSA" ? null : result.blockNumber,
    reason: normalizeServiceAgreementDeclineReason(reason) ?? null,
    timeSigned: new Date(timeSigned),
  }
}

/// One row per account/capacity/version. Before acceptance, a newly signed
/// refusal replaces the previous refusal with the newest reason and evidence.
export async function saveServiceAgreementRefusal(
  data: VerifiedServiceAgreementRefusal,
): Promise<void> {
  const { chainId, address, party, serviceAgreementId } = data
  const key = { chainId, address, party, serviceAgreementId }
  await prisma.serviceAgreementRefusal.upsert({
    where: {
      chainId_address_party_serviceAgreementId: key,
    },
    update: {},
    create: data,
  })
  await prisma.serviceAgreementRefusal.updateMany({
    where: { ...key, timeSigned: { lt: data.timeSigned } },
    data: {
      signer: data.signer,
      signature: data.signature,
      kind: data.kind,
      blockNumber: data.blockNumber,
      reason: data.reason,
      timeSigned: data.timeSigned,
    },
  })
}

export type ServiceAgreementGateStatus = {
  hasAnyAcceptance: boolean
  state: ToUAcceptanceState
  currentVersion: {
    id: number
    version: string
    plaintextSha256: string
    effectiveDate: Date
    reacceptanceDeadline: Date | null
  }
  /// The newest version this account has accepted in this capacity; null if none.
  acceptedVersion: {
    version: string
    plaintextSha256: string
    effectiveDate: Date
  } | null
}

/// Capacity-scoped re-acceptance state for the network gate. An account that
/// uses both sides of the app has independent Borrower and Lender records.
export async function getServiceAgreementGateStatus(
  chainId: SupportedChainId,
  address: string,
  party: ServiceAgreementParty,
): Promise<ServiceAgreementGateStatus> {
  const account = address.toLowerCase()
  const current = await getCurrentServiceAgreement()
  const [acceptances, refusal] = await Promise.all([
    prisma.serviceAgreementSignature.findMany({
      where: { chainId, address: account, party },
      select: {
        serviceAgreementId: true,
        timeSigned: true,
        serviceAgreement: {
          select: {
            version: true,
            plaintextSha256: true,
            effectiveDate: true,
          },
        },
      },
      orderBy: { serviceAgreementId: "desc" },
    }),
    prisma.serviceAgreementRefusal.findUnique({
      where: {
        chainId_address_party_serviceAgreementId: {
          chainId,
          address: account,
          party,
          serviceAgreementId: current.id,
        },
      },
      select: { timeSigned: true },
    }),
  ])
  const hasAnyAcceptance = acceptances.length > 0
  const currentAcceptance = acceptances.find(
    ({ serviceAgreementId }) => serviceAgreementId === current.id,
  )
  const state = computeToUAcceptanceState({
    acceptedCurrentAt: currentAcceptance?.timeSigned ?? null,
    hasAnyAcceptance,
    declinedCurrentAt: refusal?.timeSigned ?? null,
    reacceptanceDeadline: current.reacceptanceDeadline,
    now: new Date(),
  })
  return {
    hasAnyAcceptance,
    state,
    currentVersion: {
      id: current.id,
      version: current.version,
      plaintextSha256: current.plaintextSha256,
      effectiveDate: current.effectiveDate,
      reacceptanceDeadline: current.reacceptanceDeadline,
    },
    acceptedVersion: acceptances[0]?.serviceAgreement ?? null,
  }
}
