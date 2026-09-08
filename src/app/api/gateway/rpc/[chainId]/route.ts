import type { NextRequest } from "next/server"

import { proxyGatewayRequest } from "@/lib/gateway/proxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export const POST = (
  request: NextRequest,
  { params }: { params: { chainId: string } },
) => proxyGatewayRequest(request, "rpc", params.chainId)
