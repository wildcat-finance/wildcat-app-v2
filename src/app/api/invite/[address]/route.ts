import { NextRequest, NextResponse } from "next/server"

import { findBorrowerWithPendingInvitation } from "@/lib/db"

import { verifyApiToken } from "../../auth/verify-header"
import { BorrowerInvitation } from "../interface"

/// GET /api/invite/[address]
/// Route to get an invitation for a borrower.
///
/// Only returns invitations for the current chain ID and where the
/// borrower has not already signed the terms of use.
///
/// Query must be made by authenticated account the request is for or an admin.
export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const address = params.address.toLowerCase()
  const token = await verifyApiToken(request)
  if (!token?.isAdmin && token?.address.toLowerCase() !== address) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const borrower = await findBorrowerWithPendingInvitation(address)
  if (borrower?.invitation) {
    return NextResponse.json({
      invitation: borrower.invitation as BorrowerInvitation,
    })
  }
  return NextResponse.json({ invitation: null }, { status: 404 })
}

/// HEAD /api/invite/[address]
/// Route to check whether an invitation exists for a borrower.
///
/// Unauthenticated.
export async function HEAD(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const borrower = await findBorrowerWithPendingInvitation(params.address)
  return new NextResponse(null, {
    status: borrower?.invitation ? 200 : 404,
  })
}

export const dynamic = "force-dynamic"
