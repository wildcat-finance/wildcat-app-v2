import { NextRequest, NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const address = params.address.toLowerCase()
  const signature = await prisma.lenderServiceAgreementSignature.findFirst({
    where: {
      signer: address.toLowerCase(),
      chainId: TargetChainId,
    },
  })

  return NextResponse.json({ isSigned: !!signature })
}
