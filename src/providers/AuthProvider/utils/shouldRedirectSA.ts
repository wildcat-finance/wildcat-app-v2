import { ROUTES } from "@/routes"

export type RedirectSAResult = typeof ROUTES.agreement | "/" | undefined
export const shouldRedirectSA = (
  connectedAddress: `0x${string}` | undefined,
  pathname: string,
  isSignedSA: boolean,
): RedirectSAResult => {
  const isAgreementPath = pathname === ROUTES.agreement

  // Redirect from Agreement page to Root url
  // if Wallet connected & signed SA OR if Wallet is not connected
  if (isAgreementPath && (isSignedSA || !connectedAddress)) {
    return "/"
  }

  // Redirect to Agreement page if wallet connected but not signed SA
  if (!isAgreementPath && connectedAddress && !isSignedSA) {
    return ROUTES.agreement
  }

  return undefined
}
