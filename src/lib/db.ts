import { Borrower, Prisma, PrismaClient } from "@prisma/client"
import {
  getArchControllerContract,
  getDeploymentAddress,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
// eslint-disable-next-line camelcase
import { CheckBorrowersRegistered__factory } from "@wildcatfi/wildcat-sdk/dist/typechain"
import { defaultAbiCoder } from "ethers/lib/utils"

import { BorrowerInvitation } from "@/app/api/invite/interface"
import {
  MasterLoanAgreementResponse,
  MlaSignatureResponse,
} from "@/app/api/mla/interface"
import {
  BorrowerAdditionalUrl,
  BorrowerProfile,
} from "@/app/api/profiles/interface"
import { BorrowerProfileUpdate } from "@/app/api/profiles/updates/interface"

import { MlaTemplateField } from "./mla"
import { getProviderForServer } from "./provider"
import { resolveRegisteredByMany, tryResolveRegisteredBy } from "./registrar"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/// Latest borrower-party ToU acceptance time per address on this chain.
export async function getBorrowerAcceptanceTimes(
  chainId: SupportedChainId,
  addresses: string[],
): Promise<Map<string, Date>> {
  const acceptanceTimes = new Map<string, Date>()
  if (addresses.length === 0) return acceptanceTimes
  const lowered = addresses.map((address) => address.toLowerCase())
  const signatures = await prisma.serviceAgreementSignature.findMany({
    where: { chainId, party: "Borrower", address: { in: lowered } },
    select: { address: true, timeSigned: true },
    orderBy: { timeSigned: "asc" },
  })
  signatures.forEach((row) => acceptanceTimes.set(row.address, row.timeSigned))
  return acceptanceTimes
}

/// Display names of every borrower address on the chain. Market tables, the
/// export and the composability affiliation check all label borrowers from
/// this one set, so a name shown in one place is the name matched in another.
export async function findBorrowerNames(chainId: SupportedChainId) {
  const registrations = await prisma.borrowerRegistration.findMany({
    where: { chainId },
    select: {
      address: true,
      borrower: { select: { name: true, alias: true } },
    },
  })
  return registrations.map(({ address, borrower }) => ({
    address,
    name: borrower.name,
    alias: borrower.alias,
  }))
}

/// The registration of `address` on `chainId`, with its organisation.
export async function findBorrowerRegistration(
  chainId: SupportedChainId,
  address: string,
) {
  return prisma.borrowerRegistration.findUnique({
    where: { chainId_address: { chainId, address: address.toLowerCase() } },
    include: { borrower: true },
  })
}

type RegistrationWithBorrower = Prisma.BorrowerRegistrationGetPayload<{
  include: { borrower: true }
}>

const toBorrowerInvitation = (
  registration: RegistrationWithBorrower,
  timeSigned: Date | undefined,
): BorrowerInvitation => {
  const { borrower } = registration
  return {
    borrowerId: registration.borrowerId,
    inviter: registration.invitedBy as string,
    timeInvited: registration.invitedAt as Date,
    chainId: registration.chainId,
    address: registration.address,
    name: borrower.name,
    alias: borrower.alias || undefined,
    description: borrower.description || undefined,
    founded: borrower.founded || undefined,
    headquarters: borrower.headquarters || undefined,
    jurisdiction: borrower.jurisdiction || undefined,
    physicalAddress: borrower.physicalAddress || undefined,
    entityKind: borrower.entityKind || undefined,
    timeSigned: timeSigned || undefined,
    registeredOnChain: registration.registeredOnChain,
  }
}

const markRegisteredOnChain = (
  chainId: SupportedChainId,
  address: string,
  registeredBy: string | undefined,
) =>
  prisma.borrowerRegistration.update({
    where: { chainId_address: { chainId, address } },
    data: {
      registeredOnChain: true,
      checkedAt: new Date(),
      ...(registeredBy ? { registeredBy } : {}),
    },
  })

export async function findBorrowerWithPendingInvitation(
  address: string,
  chainId: SupportedChainId,
): Promise<BorrowerInvitation | undefined> {
  address = address.toLowerCase()
  const registration = await findBorrowerRegistration(chainId, address)
  if (!registration?.invitedAt || !registration.invitedBy) return undefined
  const timeSigned = (await getBorrowerAcceptanceTimes(chainId, [address])).get(
    address,
  )
  // If the borrower has signed the service agreement, check if they are registered
  // on chain. If they are, update the registration and return undefined.
  if (timeSigned) {
    if (registration.registeredOnChain) return undefined
    const provider = getProviderForServer(chainId)
    const isRegistered = await getArchControllerContract(
      chainId,
      provider,
    ).isRegisteredBorrower(address)
    if (isRegistered) {
      const registeredBy = await tryResolveRegisteredBy(
        chainId,
        address,
        provider,
      )
      await markRegisteredOnChain(chainId, address, registeredBy)
      return undefined
    }
  }
  return {
    ...toBorrowerInvitation(registration, timeSigned),
    registeredOnChain: false,
  }
}

async function checkRegisteredBorrowers(
  provider: SignerOrProvider,
  chainId: SupportedChainId,
  borrowers: string[],
): Promise<boolean[]> {
  // eslint-disable-next-line camelcase
  const bytecode = CheckBorrowersRegistered__factory.bytecode.concat(
    defaultAbiCoder
      .encode(
        ["address", "address[]"],
        [getDeploymentAddress(chainId, "WildcatArchController"), borrowers],
      )
      .slice(2),
  )
  const result = await provider.call({ data: bytecode })
  return defaultAbiCoder.decode(["bool[]"], result)[0]
}

export async function findBorrowersWithPendingInvitations(
  chainId: SupportedChainId,
): Promise<BorrowerInvitation[]> {
  const registrations = await prisma.borrowerRegistration.findMany({
    where: { chainId, invitedAt: { not: null } },
    include: { borrower: true },
  })
  const acceptanceTimes = await getBorrowerAcceptanceTimes(
    chainId,
    registrations.map(({ address }) => address),
  )
  return registrations.flatMap((registration) => {
    const timeSigned = acceptanceTimes.get(registration.address)
    if (timeSigned && registration.registeredOnChain) return []
    return [
      {
        ...toBorrowerInvitation(registration, timeSigned),
        additionalUrls: registration.borrower.additionalUrls || undefined,
      },
    ]
  })
}

export async function tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered(
  chainId: SupportedChainId,
) {
  // Find all invited registrations whose borrower has signed the service
  // agreement but is not yet registered on chain
  const invitedBorrowers = await prisma.borrowerRegistration.findMany({
    where: {
      chainId,
      registeredOnChain: false,
      invitedAt: { not: null },
    },
    select: {
      address: true,
    },
  })
  const acceptanceTimes = await getBorrowerAcceptanceTimes(
    chainId,
    invitedBorrowers.map(({ address }) => address),
  )
  const borrowerAddresses = invitedBorrowers
    .map(({ address }) => address)
    .filter((address) => acceptanceTimes.has(address.toLowerCase()))
  console.log(
    `Found ${borrowerAddresses.length} borrowers with pending invitations`,
  )
  if (borrowerAddresses.length === 0) return
  const provider = getProviderForServer(chainId)
  const registeredBorrowers = await checkRegisteredBorrowers(
    provider,
    chainId,
    borrowerAddresses,
  )
  const borrowersToUpdate = borrowerAddresses.filter(
    (_, i) => registeredBorrowers[i],
  )
  console.log(`Found ${borrowersToUpdate.length} borrowers to update`)
  if (borrowersToUpdate.length === 0) return
  let registeredByMap = new Map<string, string>()
  try {
    registeredByMap = await resolveRegisteredByMany(
      chainId,
      borrowersToUpdate,
      provider,
    )
  } catch (err) {
    console.error(`Failed to resolve registeredBy on chain ${chainId}:`, err)
  }
  await prisma.$transaction(
    borrowersToUpdate.map((borrower) =>
      markRegisteredOnChain(
        chainId,
        borrower,
        registeredByMap.get(borrower.toLowerCase()),
      ),
    ),
  )
}

/// Delete registrations, their borrower ToU rows (by cascade), and every
/// organisation left with no registration and no MLA decision. Returns the
/// number of registrations deleted.
export async function deleteBorrowerRegistrations(
  where: Prisma.BorrowerRegistrationWhereInput,
): Promise<number> {
  return prisma.$transaction(async (transaction) => {
    const registrations = await transaction.borrowerRegistration.findMany({
      where,
      select: { borrowerId: true },
    })
    const { count } = await transaction.borrowerRegistration.deleteMany({
      where,
    })
    const borrowerIds = Array.from(
      new Set(registrations.map(({ borrowerId }) => borrowerId)),
    )
    if (borrowerIds.length > 0) {
      await transaction.borrower.deleteMany({
        where: {
          id: { in: borrowerIds },
          registrations: { none: {} },
          mlaDecisions: { none: {} },
        },
      })
    }
    return count
  })
}

export async function getBorrowerProfileUpdates(
  chainId: SupportedChainId,
  address?: string,
  onlyPending = true,
): Promise<BorrowerProfileUpdate[]> {
  const registrationFilter = {
    chainId,
    ...(address && { address: address.toLowerCase() }),
  }
  const data = await prisma.borrowerProfileUpdateRequest.findMany({
    where: {
      borrower: { registrations: { some: registrationFilter } },
      ...(onlyPending && {
        acceptedAt: null,
        rejectedAt: null,
      }),
    },
    include: {
      borrower: {
        select: {
          registrations: {
            where: registrationFilter,
            select: { address: true },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
  return data.map(
    ({
      createdAt,
      acceptedAt,
      rejectedAt,
      rejectedReason,
      id,
      borrower,
      additionalUrls,
      name,
      alias,
      avatar,
      description,
      founded,
      headquarters,
      website,
      twitter,
      telegram,
      linkedin,
      email,
      jurisdiction,
      physicalAddress,
      entityKind,
    }) => ({
      updateId: id,
      createdAt: createdAt.getTime(),
      acceptedAt: acceptedAt?.getTime(),
      rejectedAt: rejectedAt?.getTime(),
      rejectedReason: rejectedReason || undefined,

      update: {
        address: borrower.registrations[0]?.address ?? "",
        chainId,
        name: name || undefined,
        alias: alias || undefined,
        avatar: avatar || undefined,
        description: description || undefined,
        founded: founded || undefined,
        headquarters: headquarters || undefined,
        website: website || undefined,
        twitter: twitter || undefined,
        telegram: telegram || undefined,
        linkedin: linkedin || undefined,
        email: email || undefined,
        jurisdiction: jurisdiction || undefined,
        physicalAddress: physicalAddress || undefined,
        entityKind: entityKind || undefined,
        additionalUrls: (additionalUrls || undefined) as
          | BorrowerAdditionalUrl[]
          | undefined,
      },
    }),
  )
}

/// The borrower's MLA decision for a market: an assigned agreement or a refusal.
export async function getMarketMlaDecision(
  market: string,
  chainId: SupportedChainId,
) {
  return prisma.marketMlaDecision.findUnique({
    where: { chainId_market: { chainId, market: market.toLowerCase() } },
    include: {
      template: { select: { name: true, version: true, borrowerId: true } },
    },
  })
}

type MarketMlaDecisionWithTemplateName = NonNullable<
  Awaited<ReturnType<typeof getMarketMlaDecision>>
>

/// Map an assigned decision to the API shape; undefined for a refusal.
export const toMasterLoanAgreementResponse = (
  decision: MarketMlaDecisionWithTemplateName,
): MasterLoanAgreementResponse | undefined => {
  if (
    decision.outcome !== "Assigned" ||
    decision.templateId === null ||
    decision.html === null ||
    decision.plaintext === null ||
    decision.lenderFields === null
  ) {
    return undefined
  }
  const borrowerSignature: MlaSignatureResponse = {
    kind: decision.kind,
    address: decision.borrowerAddress,
    signer: decision.signer,
    signature: decision.signature,
    blockNumber: decision.blockNumber ?? undefined,
    chainId: decision.chainId,
    market: decision.market,
    timeSigned: decision.timeSigned,
  }
  return {
    chainId: decision.chainId,
    market: decision.market,
    borrower: decision.borrowerAddress,
    html: decision.html,
    plaintext: decision.plaintext,
    templateId: decision.templateId,
    templateName: decision.template?.name ?? "",
    templateVersion: decision.template?.version ?? undefined,
    isCustomTemplate: !!decision.template?.borrowerId,
    lenderFields: decision.lenderFields as MlaTemplateField[],
    borrowerSignature,
  }
}

/// The assigned agreement of a market with the borrower's signature, or
/// undefined when the market has no agreement (none yet, or declined).
export async function getSignedMasterLoanAgreement(
  market: string,
  chainId: SupportedChainId,
): Promise<MasterLoanAgreementResponse | undefined> {
  const decision = await getMarketMlaDecision(market, chainId)
  return decision ? toMasterLoanAgreementResponse(decision) : undefined
}

export const toBorrowerProfile = (
  address: string,
  chainId: number,
  registeredOnChain: boolean,
  borrower: Borrower,
): BorrowerProfile => ({
  address,
  chainId,
  name: borrower.name || undefined,
  alias: borrower.alias || undefined,
  description: borrower.description || undefined,
  founded: borrower.founded || undefined,
  headquarters: borrower.headquarters || undefined,
  website: borrower.website || undefined,
  twitter: borrower.twitter || undefined,
  telegram: borrower.telegram || undefined,
  linkedin: borrower.linkedin || undefined,
  email: borrower.email || undefined,
  registeredOnChain,
  jurisdiction: borrower.jurisdiction || undefined,
  physicalAddress: borrower.physicalAddress || undefined,
  entityKind: borrower.entityKind || undefined,
  avatar: borrower.avatar || undefined,
  additionalUrls: (borrower.additionalUrls || undefined) as
    | BorrowerAdditionalUrl[]
    | undefined,
})

export async function getBorrowerProfile(
  address: string,
  chainId: SupportedChainId,
): Promise<BorrowerProfile | undefined> {
  const registration = await findBorrowerRegistration(chainId, address)
  if (!registration) return undefined
  return toBorrowerProfile(
    registration.address,
    registration.chainId,
    registration.registeredOnChain,
    registration.borrower,
  )
}
