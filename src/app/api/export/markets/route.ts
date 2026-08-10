import { NextRequest, NextResponse } from "next/server"

import {
  discoverMarketUniverse,
  resolveSnapshotBlock,
} from "@/lib/export/sources/discovery"
import { ExportRpcClient } from "@/lib/export/sources/rpc"
import { EXPORT_CHAIN_IDS, ExportChainId } from "@/lib/export/types"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const chainId = Number(request.nextUrl.searchParams.get("chainId"))
  if (!EXPORT_CHAIN_IDS.includes(chainId as ExportChainId)) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 })
  }
  try {
    const rpc = new ExportRpcClient(chainId as ExportChainId)
    const snapshot = await resolveSnapshotBlock(rpc)
    const universe = await discoverMarketUniverse(
      rpc,
      chainId as ExportChainId,
      snapshot.blockNumber,
      "all",
    )
    return NextResponse.json(
      {
        snapshotBlock: String(snapshot.blockNumber),
        markets: universe.markets.map((market) => ({
          address: market.address,
          name: market.name,
          symbol: market.symbol,
          borrower: market.borrower,
          removedAtBlock: market.removedAtBlock ?? null,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to discover markets",
      },
      { status: 500 },
    )
  }
}
