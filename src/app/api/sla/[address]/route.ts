import { NextRequest, NextResponse } from "next/server"

import { getSignedServiceAgreement } from "./services"

export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const { address } = params
  const isSigned = true

  return NextResponse.json({ isSigned })
}
