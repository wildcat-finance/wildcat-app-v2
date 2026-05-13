import { NextRequest, NextResponse } from "next/server"

import {
  prisma,
  tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered,
} from "@/lib/db"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { BorrowerProfileForAdminView } from "./interface"
import { isAdminForChain, verifyApiToken } from "../auth/verify-header"

/// GET /api/profiles?chainId=<chainId>
export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const token = await verifyApiToken(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!(await isAdminForChain(token, chainId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  await tryUpdateBorrowerInvitationsWhereAcceptedButNotRegistered(chainId)
  const data = await prisma.borrower.findMany({
    where: {
      chainId,
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
