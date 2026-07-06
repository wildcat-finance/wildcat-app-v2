import { isSupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest, NextResponse } from "next/server"

import { DeclineServiceAgreementInput } from "@/app/api/service-agreement/interface"
import {
  getCurrentServiceAgreement,
  saveServiceAgreementRefusal,
  verifyServiceAgreementRefusal,
} from "@/lib/serviceAgreement"
import { getZodParseError } from "@/lib/zod-error"

import { DeclineServiceAgreementInputDTO } from "./dto"

/// POST /api/service-agreement/decline
/// Records a signed refusal of the CURRENT ToU version. The signed message is
/// distinct from the acceptance message so the two can never be confused
/// (mirrors the MLA decline flow). A later acceptance of the same version
/// supersedes the refusal; both records are kept.
export async function POST(request: NextRequest) {
  let body: DeclineServiceAgreementInput
  try {
    const input = await request.json()
    body = DeclineServiceAgreementInputDTO.parse(input)
    if (!isSupportedChainId(body.chainId)) {
      return NextResponse.json(
        { error: "Chain ID not supported" },
        { status: 400 },
      )
    }
  } catch (error) {
    return getZodParseError(error)
  }
  const { chainId, signature, timeSigned, party, reason } = body
  const address = body.address.toLowerCase()

  const agreement = await getCurrentServiceAgreement()
  const verified = await verifyServiceAgreementRefusal({
    agreement,
    chainId,
    address,
    party,
    signature,
    timeSigned,
    reason,
  })
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }
  await saveServiceAgreementRefusal(verified)
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
