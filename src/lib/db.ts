import { PrismaClient } from "@prisma/client"
import { MakeOptional } from "@wildcatfi/wildcat-sdk"

import {
  MasterLoanAgreementResponse,
  MlaSignatureResponse,
} from "@/app/api/mla/interface"
import { BorrowerProfile } from "@/app/api/profiles/interface"
import { BorrowerProfileUpdate } from "@/app/api/profiles/updates/interface"
import { TargetChainId } from "@/config/network"

import { MlaTemplateField } from "./mla"

export const prisma = new PrismaClient()

export async function findBorrowerWithPendingInvitation(address: string) {
  address = address.toLowerCase()
  return prisma.borrower.findFirst({
    where: {
      address: address.toLowerCase(),
      chainId: TargetChainId,
      NOT: {
        invitation: null,
      },
      serviceAgreementSignature: null,
    },
    include: {
      invitation: true,
    },
  })
}

export async function getBorrowerProfileUpdates(
  address?: string,
  onlyPending = true,
): Promise<BorrowerProfileUpdate[]> {
  const data = await prisma.borrowerProfileUpdateRequest.findMany({
    where: {
      ...(address && { address: address.toLowerCase() }),
      chainId: TargetChainId,
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

      name,
      description,
      founded,
      headquarters,
      website,
      twitter,
      linkedin,
      email,
      address: profileAddress,
      chainId,
    }) => ({
      updateId: id,
      createdAt: createdAt.getTime(),
      acceptedAt: acceptedAt?.getTime(),
      rejectedAt: rejectedAt?.getTime(),
      rejectedReason: rejectedReason || undefined,

      update: {
        address: profileAddress,
        chainId,
        name: name || undefined,
        description: description || undefined,
        founded: founded || undefined,
        headquarters: headquarters || undefined,
        website: website || undefined,
        twitter: twitter || undefined,
        linkedin: linkedin || undefined,
        email: email || undefined,
      },
    }),
  )
}

export async function getSignedMasterLoanAgreement(
  market: string,
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
          chainId: TargetChainId,
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
          chainId: TargetChainId,
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
): Promise<BorrowerProfile | undefined> {
  const borrower = await prisma.borrower.findFirst({
    where: {
      address: address.toLowerCase(),
      chainId: TargetChainId,
    },
  })
  if (!borrower) return undefined
  return {
    address: borrower.address,
    chainId: borrower.chainId,
    name: borrower.name || undefined,
    description: borrower.description || undefined,
    founded: borrower.founded || undefined,
    headquarters: borrower.headquarters || undefined,
    website: borrower.website || undefined,
    twitter: borrower.twitter || undefined,
    linkedin: borrower.linkedin || undefined,
    email: borrower.email || undefined,
    registeredOnChain: borrower.registeredOnChain,
    jurisdiction: borrower.jurisdiction || undefined,
    physicalAddress: borrower.physicalAddress || undefined,
    entityKind: borrower.entityKind || undefined,
  }
}
