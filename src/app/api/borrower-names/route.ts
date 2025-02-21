import { NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"
import { prisma } from "@/lib/db"

export async function GET() {
  const names = (
    await prisma.borrower.findMany({
      where: {
        chainId: TargetChainId,
      },
      select: {
        name: true,
        alias: true,
        address: true,
      },
    })
  ).map(({ name, alias, address }) => ({
    address,
    name: alias || name || undefined,
  }))
  return NextResponse.json(names)
}
