import { NextRequest, NextResponse } from "next/server"

import { fetchTokensList } from "./services"

const SEARCH_QUERY_FIELD = "search"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const searchQuery = searchParams.get(SEARCH_QUERY_FIELD) || ""
  const tokenList = await fetchTokensList(searchQuery)

  return NextResponse.json(tokenList)
}
