"use client"

import { useEffect } from "react"

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useRouter, usePathname } from "next/navigation"
import { usePrevious } from "react-use"
import { useAccount } from "wagmi"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { GenericProviderProps } from "@/providers/interface"

import { useHasSignedSla } from "./hooks/useHasSignedSla"
import { getRedirectPath } from "./utils/getRedirectPath"

async function handleSLAStatus(
  address: `0x${string}` | undefined,
  pathname: string,
  refetch: ReturnType<typeof useHasSignedSla>["refetch"],
  chainId: SupportedChainId | undefined,
) {
  const { data } = await refetch()

  return getRedirectPath({
    connectedAddress: address,
    pathname,
    isSignedSA: Boolean(data?.isSigned),
    currentChainId: chainId,
  })
}

export const RedirectsProvider = ({ children }: GenericProviderProps) => {
  const { replace } = useRouter()
  const pathname = usePathname()
  const { address } = useAccount()
  const { refetch } = useHasSignedSla(address)
  const { chainId } = useCurrentNetwork()
  const previousAddress = usePrevious(address)
  const previousChainId = usePrevious(chainId)

  const checkShouldRedirect = async () => {
    const redirectPath = await handleSLAStatus(
      address,
      pathname,
      refetch,
      chainId,
    )

    if (redirectPath) {
      replace(redirectPath)
    }
  }

  useEffect(() => {
    if (address !== previousAddress || previousChainId !== chainId) {
      checkShouldRedirect()
    }
  }, [address, previousAddress, previousChainId, chainId])

  useEffect(() => {
    checkShouldRedirect()
  }, [])

  return children
}
