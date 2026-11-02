import { useMemo } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"

import { guardSafeSdk } from "@/utils/sanctionsAccess"

/** Guard direct Safe SDK proposals as well as the ethers wallet transport. */
export function useScreenedSafeAppsSDK() {
  const context = useSafeAppsSDK()
  const { sdk, safe } = context
  const guarded = useMemo(
    () => guardSafeSdk(sdk, safe.safeAddress, safe.chainId),
    [sdk, safe.safeAddress, safe.chainId],
  )
  return { ...context, sdk: guarded }
}
