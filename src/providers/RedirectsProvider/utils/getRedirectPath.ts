import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { match } from "ts-pattern"

import { checkIsWrongNetwork } from "@/hooks/useCurrentNetwork"
import { ROUTES } from "@/routes"
import { isNotPublicPath } from "@/utils/paths"

type RedirectToPath = string | null

// Returns undefined when no redirect needed
export const getRedirectPath = (params: {
  connectedAddress: `0x${string}` | undefined
  pathname: string
  isSignedSA: boolean
  currentChainId: SupportedChainId | undefined
}): RedirectToPath => {
  const { connectedAddress, pathname, isSignedSA, currentChainId } = params
  const isWrongNetwork = checkIsWrongNetwork(currentChainId)
  const isAgreementPath = pathname === ROUTES.agreement
  const isRestrictedPath = isNotPublicPath(pathname)

  return match({
    hasWallet: !!connectedAddress,
    isWrongNetwork,
    isAgreementPath,
    isSignedSA,
    isRestrictedPath,
  })
    .with(
      {
        hasWallet: false,
        isRestrictedPath: true,
      },
      () => "/" as const,
    )
    .with(
      {
        isWrongNetwork: true,
        isRestrictedPath: true,
      },
      () => "/" as const,
    )
    .with(
      {
        isAgreementPath: true,
        isSignedSA: true,
      },
      () => "/" as const,
    )
    .with(
      {
        hasWallet: true,
        isAgreementPath: false,
        isSignedSA: false,
      },
      ({ isWrongNetwork: wrongNetwork }) =>
        wrongNetwork ? "/" : ROUTES.agreement,
    )
    .otherwise(() => null)
}
