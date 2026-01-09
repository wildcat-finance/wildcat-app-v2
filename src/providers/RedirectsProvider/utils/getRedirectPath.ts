import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { ROUTES } from "@/routes"

// Undefined is for cases where should be no redirects
export type RedirectToPath =
  | typeof ROUTES.agreement
  | typeof ROUTES.borrower.root
  | typeof ROUTES.lender.root
  | "/"
  | null

const NO_WALLET_RESTRICTED_PATHS = [
  ROUTES.agreement,
  ROUTES.borrower.createMarket,
  ROUTES.borrower.market,
  ROUTES.borrower.lendersList,
]

const isNotPublicPath = (pathname: string) => {
  if (pathname.startsWith(ROUTES.borrower.market)) {
    return true
  }
  return NO_WALLET_RESTRICTED_PATHS.includes(pathname)
}

const getRoleRootPath = (pathname: string) => {
  if (pathname.startsWith(ROUTES.borrower.root)) {
    return ROUTES.borrower.root
  }
  if (pathname.startsWith(ROUTES.lender.root)) {
    return ROUTES.lender.root
  }
  return "/"
}

// Returns undefined when no redirect needed
export const getRedirectPath = (params: {
  connectedAddress: `0x${string}` | undefined
  pathname: string
  isSignedSA: boolean
  targetChainId: SupportedChainId
  currentChainId: SupportedChainId | undefined
}): RedirectToPath => {
  const {
    connectedAddress,
    pathname,
    isSignedSA,
    targetChainId,
    currentChainId,
  } = params
  const isWrongNetwork = currentChainId !== targetChainId
  const isAgreementPath = pathname === ROUTES.agreement

  // If wallet is NOT CONNECTED or WRONG NETWORK
  // Redirect from restricted pages to role root url
  if ((!connectedAddress || isWrongNetwork) && isNotPublicPath(pathname)) {
    return getRoleRootPath(pathname)
  }

  // If wallet CONNECTED and SIGNED SA
  // Redirect from Agreement page to role root url
  if (isAgreementPath && isSignedSA) {
    return getRoleRootPath(pathname)
  }

  // If wallet CONNECTED and NOT SIGNED SA
  // Redirect to Agreement page
  if (!isAgreementPath && connectedAddress && !isSignedSA) {
    if (isWrongNetwork) {
      return getRoleRootPath(pathname)
    }

    return ROUTES.agreement
  }

  return null
}
