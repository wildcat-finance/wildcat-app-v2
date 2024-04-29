import { NextRequest, NextResponse } from "next/server"
import { i18nRouter } from "next-i18n-router"
import { State, deserialize } from "wagmi"

import { getSignedServiceAgreement } from "@/app/api/sla/[address]/services"
import { shouldRedirectSA } from "@/providers/AuthProvider/utils/shouldRedirectSA"

import i18nConfig from "../i18nConfig"

export async function middleware(request: NextRequest) {
  const wagmiStoreCookie = request.cookies.get("wagmi.store")
  let wagmiState: State | undefined

  if (wagmiStoreCookie) {
    wagmiState = deserialize<{ state: State }>(wagmiStoreCookie.value).state
  }

  let connectedAddress: `0x${string}` | undefined
  let isSigned: boolean = false

  if (wagmiState?.current) {
    const currentConnection = wagmiState.current
    connectedAddress =
      wagmiState.connections.get(currentConnection)?.accounts[0]

    if (connectedAddress) {
      isSigned = await getSignedServiceAgreement(connectedAddress)
    }
  }

  const redirectionSAResult = shouldRedirectSA(
    connectedAddress,
    request.nextUrl.pathname,
    isSigned,
  )

  if (redirectionSAResult) {
    const url = request.nextUrl.clone()
    url.pathname = redirectionSAResult
    return NextResponse.redirect(url)
  }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
