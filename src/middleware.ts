import { i18nRouter } from "next-i18n-router"
import { NextRequest, NextResponse } from "next/server"
import { useHasSignedSla } from "@/hooks/useHasSignedSla"
import i18nConfig from "../i18nConfig"

export function middleware(request: NextRequest) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const hasSignedAgreement = true // useHasSignedSla().hasSignedAgreement
  const { pathname } = request.nextUrl

  if (!hasSignedAgreement && pathname !== "/agreement") {
    return NextResponse.redirect(new URL("/agreement", request.url))
  }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
