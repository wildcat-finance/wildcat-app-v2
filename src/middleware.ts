import { NextRequest, NextResponse } from "next/server"
import { i18nRouter } from "next-i18n-router"

import i18nConfig from "../i18nConfig"

export async function middleware(request: NextRequest) {
  // Detect mobile user-agent
  const userAgent = request.headers.get("user-agent") || ""
  const isMobile = /android|iphone|ipad|mobile/i.test(userAgent)

  if (isMobile) {
    return new NextResponse(
      "<h1>The Wildcat UI isn't configured for mobile, sorry!</h1>",
      {
        status: 403,
        headers: { "Content-Type": "text/html" },
      },
    )
  }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
