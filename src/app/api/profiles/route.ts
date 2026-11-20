import { NextRequest, NextResponse } from "next/server"

import {
  getBorrowerAcceptanceTimes,
  prisma,
  toBorrowerProfile,
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
  const registrations = await prisma.borrowerRegistration.findMany({
    where: {
      chainId,
      registeredOnChain: true,
    },
    include: { borrower: true },
  })
  const acceptanceTimes = await getBorrowerAcceptanceTimes(
    chainId,
    registrations.map(({ address }) => address),
  )
  const allProfiles: BorrowerProfileForAdminView[] = registrations
    .filter((registration) => acceptanceTimes.has(registration.address))
    .map((registration) => ({
      ...toBorrowerProfile(
        registration.address,
        registration.chainId,
        registration.registeredOnChain,
        registration.borrower,
      ),
      borrowerId: registration.borrowerId,
      timeInvited: registration.invitedAt || undefined,
      timeSigned: acceptanceTimes.get(registration.address),
    }))

  return NextResponse.json(allProfiles)
}

export const dynamic = "force-dynamic"
