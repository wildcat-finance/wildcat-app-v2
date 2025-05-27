import { NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import {
  prisma,
  tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered,
} from "@/lib/db"

import { BorrowerProfileForAdminView } from "./interface"

export async function GET() {
  await tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered()
  const data = await prisma.borrower.findMany({
    where: {
      chainId: TargetChainId,
      registeredOnChain: true,
      NOT: {
        serviceAgreementSignature: null,
      },
    },
    include: {
      invitation: {
        select: {
          timeInvited: true,
        },
      },
      serviceAgreementSignature: {
        select: {
          timeSigned: true,
        },
      },
    },
  })
  const allProfiles = data.map(
    (borrower) =>
      ({
        address: borrower.address,
        chainId: borrower.chainId,
        name: borrower.name || undefined,
        description: borrower.description || undefined,
        founded: borrower.founded || undefined,
        headquarters: borrower.headquarters || undefined,
        website: borrower.website || undefined,
        twitter: borrower.twitter || undefined,
        telegram: borrower.telegram || undefined,
        linkedin: borrower.linkedin || undefined,
        email: borrower.email || undefined,
        registeredOnChain: borrower.registeredOnChain,
        entityKind: borrower.entityKind || undefined,
        jurisdiction: borrower.jurisdiction || undefined,
        physicalAddress: borrower.physicalAddress || undefined,
        timeInvited: borrower.invitation?.timeInvited || undefined,
        timeSigned: borrower.serviceAgreementSignature?.timeSigned || undefined,
        additionalUrls: borrower.additionalUrls || undefined,
      }) as BorrowerProfileForAdminView,
  )

  return NextResponse.json(allProfiles)
}

export const dynamic = "force-dynamic"
