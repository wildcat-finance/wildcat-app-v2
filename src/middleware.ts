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
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              text-align: center;
              background-color: #f9f9f9;
              padding: 20px;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            }
            h1 {
              color: #333;
              margin-bottom: 15px;
            }
            p {
              color: #666;
              font-size: 16px;
              margin-bottom: 10px;
            }
            a {
              color: #0070f3;
              text-decoration: none;
              font-weight: bold;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>The Wildcat UI isn't configured for mobile, sorry!</h1>
            <p>The amount of tables and data shown aren't suitable to display on a phone.</p>
            <p>Hop on a desktop or laptop instead: we're aiming to sort this out in time.</p>
            <p>For an overview of its usage, check out our <a href="https://defillama.com/protocol/wildcat-protocol" target="_blank">DefiLlama</a> page.</p>
            <p>For protocol documentation, check out our <a href="https://docs.wildcat.finance" target="_blank">Gitbook</a>.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 403,
        headers: { "Content-Type": "text/html" },
      }
    )
  }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
