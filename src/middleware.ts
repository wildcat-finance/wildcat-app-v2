import { i18nRouter } from "next-i18n-router"
import { NextRequest, NextResponse } from "next/server"
import i18nConfig from "../i18nConfig"

export function middleware(request: NextRequest) {
  const hasSignedAgreement = false
  const { pathname } = request.nextUrl

  if (!hasSignedAgreement && pathname !== "/agreement") {
    return NextResponse.redirect(new URL("/agreement", request.url))
  }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
