import {
  ServiceAgreement,
  ServiceAgreementParty,
  SignatureKind,
} from "@prisma/client"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"
import { formatUnixMsAsDate } from "@/utils/formatters"

/// The exact text a user signs: the version's acknowledgement wrapper, the date
/// line, and (borrowers only) the organization name line.
export const buildServiceAgreementMessage = ({
  acknowledgementText,
  timeSigned,
  organizationName,
}: {
  acknowledgementText: string
  timeSigned: number
  organizationName?: string
}): string => {
  let message = `${acknowledgementText}\n\nDate: ${formatUnixMsAsDate(
    timeSigned,
  )}`
  if (organizationName) {
    message = `${message}\n\nOrganization Name: ${organizationName}`
  }
  return message
}

export async function getCurrentServiceAgreement(): Promise<ServiceAgreement> {
  // The ServiceAgreement_one_current partial unique index guarantees at most one.
  const agreement = await prisma.serviceAgreement.findFirst({
    where: { isCurrent: true },
  })
  if (!agreement) {
    throw new Error(
      "No current ServiceAgreement - has the versioning migration been applied?",
    )
  }
  return agreement
}

/// Old-table dual-writes key rows by keccak256 of the signed wrapper, which for
/// seeded versions is stored as legacyWrapperHash. A version without it cannot
/// be represented in the old tables - publishing is frozen until the dual-write
/// is removed (Release 2), so this failing loudly means that freeze was broken.
export function requireLegacyWrapperHash(agreement: ServiceAgreement): string {
  if (!agreement.legacyWrapperHash) {
    throw new Error(
      `ServiceAgreement ${agreement.id} (${agreement.version}) has no ` +
        `legacyWrapperHash; old-table dual-write cannot represent it`,
    )
  }
  return agreement.legacyWrapperHash
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
  agreement: ServiceAgreement
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

/// Idempotent new-table write: the first acceptance of a version by an account
/// wins; repeats are no-ops.
export async function saveServiceAgreementSignature(
  data: VerifiedServiceAgreementSignature,
): Promise<void> {
  const { chainId, address, party, serviceAgreementId } = data
  await prisma.serviceAgreementSignature.upsert({
    where: {
      chainId_address_party_serviceAgreementId: {
        chainId,
        address,
        party,
        serviceAgreementId,
      },
    },
    update: {},
    create: data,
  })
}
