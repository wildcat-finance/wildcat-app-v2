import { PrismaClient } from "@prisma/client"

import { BorrowerProfileUpdate } from "@/app/api/profiles/updates/interface"
import { TargetChainId } from "@/config/network"

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
