"use client"

import { useEffect } from "react"

import { useRouter, usePathname } from "next/navigation"
import { usePrevious } from "react-use"
import { useAccount } from "wagmi"

import { GenericProviderProps } from "@/providers/interface"

import { useHasSignedSla } from "./hooks/useHasSignedSla"
import { getRedirectPath } from "./utils/getRedirectPath"

async function handleSLAStatus(
  address: `0x${string}` | undefined,
  pathname: string,
  refetch: ReturnType<typeof useHasSignedSla>["refetch"],
) {
  const { data } = await refetch()

  return getRedirectPath(address, pathname, Boolean(data?.isSigned))
}

export const RedirectsProvider = ({ children }: GenericProviderProps) => {
  const { replace } = useRouter()
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const previousAddress = usePrevious(address)
  const { refetch } = useHasSignedSla(address)

  useEffect(() => {
    const checkShouldRedirect = async () => {
      const redirectPath = await handleSLAStatus(address, pathname, refetch)

      if (redirectPath) {
        replace(redirectPath)
      }
    }

    if (address !== previousAddress) {
      checkShouldRedirect()
    }
  }, [address, isConnected, previousAddress, refetch])

  return children
}
