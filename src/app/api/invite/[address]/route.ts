import { NextRequest, NextResponse } from "next/server"

import { findBorrowerWithPendingInvitation } from "@/lib/db"

import { BorrowerInvitation } from "../interface"

/// GET /api/invite/[address]
/// Route to get an invitation for a borrower.
/// Only returns invitations for the current chain ID and where the
/// borrower has not already signed the service agreement.
export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const address = params.address.toLowerCase()
  const borrower = await findBorrowerWithPendingInvitation(address)
  if (borrower?.invitation) {
    return NextResponse.json({
      invitation: borrower.invitation as BorrowerInvitation,
    })
  }
  return NextResponse.json({ invitation: null }, { status: 404 })
}

export const dynamic = "force-dynamic"
