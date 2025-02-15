import { NextRequest, NextResponse } from "next/server"
import { i18nRouter } from "next-i18n-router"

import i18nConfig from "../i18nConfig"

export async function middleware(request: NextRequest) {
  // Detect mobile user-agent
  const userAgent = request.headers.get("user-agent") || ""
  const isMobile = /android|iphone|ipad|mobile/i.test(userAgent)

  if (isMobile) {
    return new NextResponse(
      `
      <html>
        <head>
          <title>Wildcat - Mobile Not Supported</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
            }
            h1 {
              color: #333;
            }
            p {
              color: #666;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <h1>The Wildcat UI isn't configured for mobile, sorry!</h1>
          <p>The amount of tables and data shown aren't conducive to being rendered on a phone.</p>
          <p>Hop on a desktop or laptop instead: we're aiming to sort this out in time.</p>
        </body>
      </html>
      `,
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
