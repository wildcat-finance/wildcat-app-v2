import { i18nRouter } from "next-i18n-router"
import { NextRequest, NextResponse } from "next/server"
import { State, deserialize } from "wagmi"

import {
  getSignedServiceAgreement,
  AGREEMENT_PATH,
} from "@/app/api/service-agreement/[address]/route"
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

  // Do not show agreement page if Wallet connected & signed SA
  // or if Wallet is not connected
  const isAgreementPath = request.nextUrl.pathname === AGREEMENT_PATH
  if (isAgreementPath && (isSigned || !connectedAddress)) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Redirect to agreement page if wallet connected but not signed SA
  if (!isAgreementPath && connectedAddress && !isSigned) {
    const url = request.nextUrl.clone()
    url.pathname = AGREEMENT_PATH
    return NextResponse.redirect(url)
  }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
