import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") || ""

  // Simple check for mobile user agents
  const isMobile = /android|iphone|ipad|mobile/i.test(userAgent)

  if (isMobile) {
    return new NextResponse("<h1>Wildcat is not built for mobile usage.</h1>", {
      status: 403,
      headers: { "Content-Type": "text/html" },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/",
}
