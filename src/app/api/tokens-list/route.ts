import { NextRequest, NextResponse } from "next/server"

import { validateChainIdParam } from "@/lib/validateChainIdParam"

import { fetchTokensList } from "./services"

const SEARCH_QUERY_FIELD = "search"

export async function GET(request: NextRequest) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const { searchParams } = request.nextUrl
  const searchQuery = searchParams.get(SEARCH_QUERY_FIELD) || ""
  const tokenList = await fetchTokensList(searchQuery, chainId)

  return NextResponse.json(tokenList)
}
