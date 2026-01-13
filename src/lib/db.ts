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
import { logger } from "@/lib/logging/server"

import { MlaTemplateField } from "./mla"
import { getProviderForServer } from "./provider"

export const prisma = new PrismaClient()

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
      serviceAgreementSignature: true,
    },
  })
  if (!profile?.invitation) return undefined
  const { invitation, serviceAgreementSignature, registeredOnChain } = profile
  const timeSigned = serviceAgreementSignature?.timeSigned
  // If the borrower has signed the service agreement, check if they are registered
  // on chain. If they are, update the borrower record and return undefined.
  if (timeSigned) {
    if (registeredOnChain) return undefined
    const isRegistered = await getArchControllerContract(
      chainId,
      getProviderForServer(chainId),
    ).isRegisteredBorrower(address)
    if (isRegistered) {
      await prisma.borrower.update({
        where: {
          chainId_address: {
            chainId,
            address,
          },
        },
        data: {
          registeredOnChain: true,
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
      serviceAgreementSignature: true,
    },
  })
  return profiles
    .map((profile) => {
      if (!profile?.invitation) return undefined
      const { invitation, serviceAgreementSignature } = profile
      const timeSigned = serviceAgreementSignature?.timeSigned
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
  const borrowerInvitations = await prisma.borrower.findMany({
    where: {
      chainId,
      NOT: {
        invitation: null,
        serviceAgreementSignature: null,
        registeredOnChain: true,
      },
    },
    include: {
      invitation: true,
    },
  })
  const borrowerAddresses = borrowerInvitations
    .map(({ invitation }) => invitation?.address)
    .filter(Boolean) as string[]
  logger.info(
    { chainId, count: borrowerAddresses.length },
    "Found borrowers with pending invitations",
  )
  const registeredBorrowers = await checkRegisteredBorrowers(
    getProviderForServer(chainId),
    chainId,
    borrowerAddresses,
  )
  const borrowersToUpdate = borrowerAddresses.filter(
    (_, i) => registeredBorrowers[i],
  )
  logger.info(
    { chainId, count: borrowersToUpdate.length },
    "Found borrowers to update",
  )
  await prisma.$transaction(
    borrowersToUpdate.map((borrower) =>
      prisma.borrower.update({
        where: {
          chainId_address: { chainId, address: borrower },
        },
        data: { registeredOnChain: true },
      }),
    ),
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
