import { i18nRouter } from "next-i18n-router"
import { NextRequest, NextResponse } from "next/server"
import { State, deserialize } from "wagmi"

import i18nConfig from "../i18nConfig"

const AGREEMENT_PATH = "/agreement"

async function getSignedServiceAgreement(address: `0x${string}`) {
  let signed: boolean

  try {
    const { data: isSigned } = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/sla/${address.toLowerCase()}`,
    ).then((res) => res.json())

    signed = Boolean(isSigned)
  } catch {
    signed = false
  }

  return signed
}

export async function middleware(request: NextRequest) {
  const wagmiStoreCookie = request.cookies.get("wagmi.store")
  let wagmiState: State | undefined

  if (wagmiStoreCookie) {
    wagmiState = deserialize<{ state: State }>(wagmiStoreCookie.value).state
  }

  const isAgreementPath = request.nextUrl.pathname === AGREEMENT_PATH

  if (wagmiState?.current && !isAgreementPath) {
    const currentConnection = wagmiState.current
    const currentAddress =
      wagmiState.connections.get(currentConnection)?.accounts[0]

    if (currentAddress) {
      const isSigned = await getSignedServiceAgreement(currentAddress)

      if (!isSigned) {
        const url = request.nextUrl.clone()
        url.pathname = "/agreement"
        return NextResponse.redirect(url)
      }
    }
  }

  return i18nRouter(request, i18nConfig)
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
