import { NextRequest, NextResponse } from "next/server"
import { i18nRouter } from "next-i18n-router"
import i18nConfig from "../../i18nConfig"

export function AgreementRedirect(request: NextRequest) {
  const isSignedAgreement = true

  // If the user is authenticated, continue as normal
  if (isSignedAgreement) {
    return NextResponse.next()
  }
  return NextResponse.redirect(new URL("/agreement", request.url))
}

export function i18nImplementing(request: NextRequest) {
  return i18nRouter(request, i18nConfig)
}
