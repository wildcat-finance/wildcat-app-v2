import { NextRequest, NextResponse } from "next/server"
import { State, deserialize } from "wagmi"

import { getSignedServiceAgreement } from "@/app/api/sla/[address]/services"
import { ROUTES } from "@/routes"

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
  const isAgreementPath = request.nextUrl.pathname === ROUTES.agreement
  if (isAgreementPath && (isSigned || !connectedAddress)) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Redirect to agreement page if wallet connected but not signed SA
  if (!isAgreementPath && connectedAddress && !isSigned) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.agreement
    return NextResponse.redirect(url)
  }

  return
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
