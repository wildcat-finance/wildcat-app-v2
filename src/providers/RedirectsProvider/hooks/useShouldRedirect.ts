import { useQuery } from "@tanstack/react-query"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { usePathname } from "next/navigation"
import { useAccount } from "wagmi"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { getRedirectPath } from "@/providers/RedirectsProvider/utils/getRedirectPath"

export const SHOULD_REDIRECT_KEY = "should-redirect"

type Response = {
  isSigned: boolean
}

const fetchSLARedirectStatus = async (
  address: `0x${string}` | undefined,
  pathname: string,
  targetChainId: SupportedChainId,
  currentChainId: SupportedChainId | undefined,
) => {
  let isSignedResult = false
  if (address) {
    const { isSigned }: Response = await fetch(`/api/sla/${address}?chainId=${targetChainId}`).then(
      (res) => res.json(),
    )

    isSignedResult = isSigned
  }

  return getRedirectPath({
    connectedAddress: address,
    pathname,
    isSignedSA: isSignedResult,
    currentChainId,
    targetChainId,
  })
}

export const useShouldRedirect = () => {
  const { address, isReconnecting, isConnecting } = useAccount()
  const { chainId, targetChainId } = useCurrentNetwork()
  const pathname = usePathname()

  return useQuery({
    queryKey: [SHOULD_REDIRECT_KEY, address, pathname, chainId],
    enabled: !isReconnecting && !isConnecting,
    queryFn: () =>
      fetchSLARedirectStatus(address, pathname, targetChainId, chainId),
  })
}
