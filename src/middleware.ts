import { NextRequest } from "next/server"
import { i18nRouter } from "next-i18n-router"
// import { State, deserialize } from "wagmi"
//
// import { getSignedServiceAgreement } from "@/app/api/sla/[address]/services"
// import { getRedirectPath } from "@/providers/RedirectsProvider/utils/getRedirectPath"

import i18nConfig from "../i18nConfig"

export async function middleware(request: NextRequest) {
  // const wagmiStoreCookie = request.cookies.get("wagmi.store")
  // let wagmiState: State | undefined
  //
  // if (wagmiStoreCookie) {
  //   wagmiState = deserialize<{ state: State }>(wagmiStoreCookie.value).state
  // }
  //
  // let connectedAddress: `0x${string}` | undefined
  // let isSigned: boolean = false
  //
  // if (wagmiState?.current) {
  //   const currentConnection = wagmiState.current
  //   connectedAddress =
  //     wagmiState.connections.get(currentConnection)?.accounts[0]
  //
  //   if (connectedAddress) {
  //     isSigned = await getSignedServiceAgreement(connectedAddress)
  //   }
  // }
  //
  // const redirectPath = getRedirectPath({
  //   connectedAddress,
  //   pathname: request.nextUrl.pathname,
  //   isSignedSA: isSigned,
  //   currentChainId: wagmiState?.chainId,
  // })
  //
  // if (redirectPath) {
  //   const url = request.nextUrl.clone()
  //   url.pathname = redirectPath
  //   return NextResponse.redirect(url)
  // }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
