import { PrismaClient } from "@prisma/client"
import {
  getArchControllerContract,
  getDeploymentAddress,
  MakeOptional,
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

export const prisma = new PrismaClient()

/// Legacy wrapper hashes of the seeded ServiceAgreement versions. Old-table
/// rows with any other hash (the orphaned 48a56e9e wrapper) are not valid ToU
/// acceptances.
async function getSeededLegacyWrapperHashes(): Promise<string[]> {
  const versions = await prisma.serviceAgreement.findMany({
    where: { NOT: { legacyWrapperHash: null } },
    select: { legacyWrapperHash: true },
  })
  return versions.map(({ legacyWrapperHash }) => legacyWrapperHash as string)
}

/// Latest borrower-party ToU acceptance time per address. Prefers the new
/// ServiceAgreementSignature table; falls back to the old borrower table
/// (mapped hashes only) for rows written by pre-Release-1 app instances during
/// the rolling window. The fallback is removed in Release 2.
export async function getBorrowerAcceptanceTimes(
  chainId: SupportedChainId,
  addresses: string[],
): Promise<Map<string, Date>> {
  const acceptanceTimes = new Map<string, Date>()
  if (addresses.length === 0) return acceptanceTimes
  const lowered = addresses.map((address) => address.toLowerCase())
  const newRows = await prisma.serviceAgreementSignature.findMany({
    where: { chainId, party: "Borrower", address: { in: lowered } },
    orderBy: { timeSigned: "asc" },
  })
  newRows.forEach((row) => acceptanceTimes.set(row.address, row.timeSigned))
  const missing = lowered.filter((address) => !acceptanceTimes.has(address))
  if (missing.length > 0) {
    const oldRows = await prisma.borrowerServiceAgreementSignature.findMany({
      where: {
        chainId,
        address: { in: missing },
        serviceAgreementHash: { in: await getSeededLegacyWrapperHashes() },
      },
    })
    oldRows.forEach((row) => acceptanceTimes.set(row.address, row.timeSigned))
  }
  return acceptanceTimes
}

/// Lender-scoped ToU gate: each capacity's first use requires that capacity's
/// acceptance, so only a Lender-party acceptance satisfies it (borrowers accept
/// theirs via the invitation flow). Prefers the new table; falls back to the
/// old lender table (mapped hashes only) during the rolling window. The
/// fallback is removed in Release 2.
export async function hasSignedServiceAgreement(
  chainId: SupportedChainId,
  address: string,
): Promise<boolean> {
  const account = address.toLowerCase()
  const signature = await prisma.serviceAgreementSignature.findFirst({
    where: { chainId, address: account, party: "Lender" },
  })
  if (signature) return true
  const lenderSignature =
    await prisma.lenderServiceAgreementSignature.findFirst({
      where: {
        chainId,
        signer: account,
        serviceAgreementHash: { in: await getSeededLegacyWrapperHashes() },
      },
    })
  return !!lenderSignature
}

export async function findBorrowerWithPendingInvitation(
  address: string,
  chainId: SupportedChainId,
): Promise<BorrowerInvitation | undefined> {
  address = address.toLowerCase()
  const profile = await prisma.borrower.findFirst({
    where: {
      address: address.toLowerCase(),
      chainId,
      NOT: {
        invitation: null,
      },
    },
    include: {
      invitation: true,
    },
  })
  if (!profile?.invitation) return undefined
  const { invitation, registeredOnChain } = profile
  const timeSigned = (await getBorrowerAcceptanceTimes(chainId, [address])).get(
    address,
  )
  // If the borrower has signed the service agreement, check if they are registered
  // on chain. If they are, update the borrower record and return undefined.
  if (timeSigned) {
    if (registeredOnChain) return undefined
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
      await prisma.borrower.update({
        where: {
          chainId_address: {
            chainId,
            address,
          },
        },
        data: {
          registeredOnChain: true,
          ...(registeredBy ? { registeredBy } : {}),
        },
      })
      return undefined
    }
  }
  return {
    id: invitation.id,
    inviter: invitation.inviter,
    timeInvited: invitation.timeInvited,
    chainId: invitation.chainId,
    address: invitation.address,
    name: invitation.name,
    alias: invitation.alias || undefined,
    description: invitation.description || undefined,
    founded: invitation.founded || undefined,
    headquarters: invitation.headquarters || undefined,
    jurisdiction: invitation.jurisdiction || undefined,
    physicalAddress: invitation.physicalAddress || undefined,
    entityKind: invitation.entityKind || undefined,
    timeSigned: timeSigned || undefined,
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
  const profiles = await prisma.borrower.findMany({
    where: {
      chainId,
      NOT: {
        invitation: null,
      },
    },
    include: {
      invitation: true,
    },
  })
  const acceptanceTimes = await getBorrowerAcceptanceTimes(
    chainId,
    profiles.map(({ address }) => address),
  )
  return profiles
    .map((profile) => {
      if (!profile?.invitation) return undefined
      const { invitation } = profile
      const timeSigned = acceptanceTimes.get(profile.address)
      if (timeSigned && profile.registeredOnChain) return undefined
      return {
        id: invitation.id,
        inviter: invitation.inviter,
        timeInvited: invitation.timeInvited,
        chainId: invitation.chainId,
        address: invitation.address,
        name: invitation.name,
        alias: invitation.alias || undefined,
        description: invitation.description || undefined,
        founded: invitation.founded || undefined,
        headquarters: invitation.headquarters || undefined,
        jurisdiction: invitation.jurisdiction || undefined,
        physicalAddress: invitation.physicalAddress || undefined,
        entityKind: invitation.entityKind || undefined,
        timeSigned: timeSigned || undefined,
        additionalUrls: profile.additionalUrls || undefined,
        registeredOnChain: profile.registeredOnChain,
      }
    })
    .filter(Boolean) as BorrowerInvitation[]
}

export async function tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered(
  chainId: SupportedChainId,
) {
  // Find all borrowers that have an invitation, have signed the service agreement
  // but are not registered on chain
  const invitedBorrowers = await prisma.borrower.findMany({
    where: {
      chainId,
      registeredOnChain: false,
      NOT: {
        invitation: null,
      },
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
    borrowersToUpdate.map((borrower) => {
      const registeredBy = registeredByMap.get(borrower.toLowerCase())
      return prisma.borrower.update({
        where: {
          chainId_address: { chainId, address: borrower },
        },
        data: {
          registeredOnChain: true,
          ...(registeredBy ? { registeredBy } : {}),
        },
      })
    }),
  )
}

export async function getBorrowerProfileUpdates(
  chainId: SupportedChainId,
  address?: string,
  onlyPending = true,
): Promise<BorrowerProfileUpdate[]> {
  const data = await prisma.borrowerProfileUpdateRequest.findMany({
    where: {
      ...(address && { address: address.toLowerCase() }),
      chainId,
      ...(onlyPending && {
        acceptedAt: null,
        rejectedAt: null,
      }),
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
      additionalUrls,
      name,
      alias,
      description,
      founded,
      headquarters,
      website,
      twitter,
      linkedin,
      email,
      address: profileAddress,
      chainId: accountChainId,
    }) => ({
      updateId: id,
      createdAt: createdAt.getTime(),
      acceptedAt: acceptedAt?.getTime(),
      rejectedAt: rejectedAt?.getTime(),
      rejectedReason: rejectedReason || undefined,

      update: {
        address: profileAddress,
        chainId: accountChainId,
        name: name || undefined,
        alias: alias || undefined,
        description: description || undefined,
        founded: founded || undefined,
        headquarters: headquarters || undefined,
        website: website || undefined,
        twitter: twitter || undefined,
        linkedin: linkedin || undefined,
        email: email || undefined,
        additionalUrls: (additionalUrls || undefined) as
          | BorrowerAdditionalUrl[]
          | undefined,
      },
    }),
  )
}

export async function getSignedMasterLoanAgreement(
  market: string,
  chainId: SupportedChainId,
): Promise<
  MakeOptional<MasterLoanAgreementResponse, "borrowerSignature"> | undefined
> {
  market = market.toLowerCase()
  const mla:
    | Omit<MasterLoanAgreementResponse, "borrowerSignature">
    | undefined = await prisma.masterLoanAgreement
    .findUnique({
      where: {
        chainId_market: {
          chainId,
          market,
        },
      },
      include: {
        template: {
          select: {
            name: true,
          },
        },
      },
    })
    .then((obj) => {
      if (!obj) return undefined
      const { template, lenderFields, ...rest } = obj
      return {
        ...rest,
        lenderFields: lenderFields as MlaTemplateField[],
        templateName: template.name,
      }
    })
  if (!mla) return undefined
  const borrowerSignature: MlaSignatureResponse | undefined =
    await prisma.mlaSignature
      .findFirst({
        where: {
          chainId,
          market,
          address: mla.borrower,
        },
      })
      .then((obj) => {
        if (!obj) return undefined
        const { blockNumber, ...rest } = obj
        return {
          ...rest,
          blockNumber: blockNumber || undefined,
        } as MlaSignatureResponse
      })
  return {
    ...mla,
    borrowerSignature,
  }
}

export async function getBorrowerProfile(
  address: string,
  chainId: SupportedChainId,
): Promise<BorrowerProfile | undefined> {
  const borrower = await prisma.borrower.findFirst({
    where: {
      address: address.toLowerCase(),
      chainId,
    },
  })
  if (!borrower) return undefined
  return {
    address: borrower.address,
    chainId: borrower.chainId,
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
    registeredOnChain: borrower.registeredOnChain,
    jurisdiction: borrower.jurisdiction || undefined,
    physicalAddress: borrower.physicalAddress || undefined,
    entityKind: borrower.entityKind || undefined,
    avatar: borrower.avatar || undefined,
    additionalUrls: (borrower.additionalUrls || undefined) as
      | BorrowerAdditionalUrl[]
      | undefined,
  }
}
