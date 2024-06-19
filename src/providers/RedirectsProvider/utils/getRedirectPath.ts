import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { checkIsWrongNetwork } from "@/hooks/useCurrentNetwork"
import { ROUTES } from "@/routes"

// Undefined is for cases where should be no redirects
export type RedirectToPath = typeof ROUTES.agreement | "/" | undefined

const NO_WALLET_RESTRICTED_PATHS = [ROUTES.agreement, ROUTES.borrower.newMarket]

// Returns undefined when no redirect needed
export const getRedirectPath = (params: {
  connectedAddress: `0x${string}` | undefined
  pathname: string
  isSignedSA: boolean
  currentChainId: SupportedChainId | undefined
}): RedirectToPath => {
  const { connectedAddress, pathname, isSignedSA, currentChainId } = params

  // If wallet is NOT CONNECTED or WRONG NETWORK
  // Redirect from restricted pages to root
  const isWrongNetwork = checkIsWrongNetwork(currentChainId)
  if (
    (!connectedAddress || isWrongNetwork) &&
    NO_WALLET_RESTRICTED_PATHS.includes(pathname)
  ) {
    return "/"
  }

  const isAgreementPath = pathname === ROUTES.agreement

  // If wallet CONNECTED and SIGNED SA
  // Redirect from Agreement page to Root url
  if (isAgreementPath && isSignedSA) {
    return "/"
  }

  // If wallet CONNECTED and NOT SIGNED SA
  // Redirect to Agreement page
  if (!isAgreementPath && connectedAddress && !isSignedSA) {
    return ROUTES.agreement
  }

  return undefined
}
