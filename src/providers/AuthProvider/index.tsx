"use client"

import { useEffect } from "react"

import { useRouter, usePathname } from "next/navigation"
import { usePrevious } from "react-use"
import { useAccount } from "wagmi"

import { shouldRedirectSA } from "@/providers/AuthProvider/utils/shouldRedirectSA"
import { GenericProviderProps } from "@/providers/interface"

import { useHasSignedSla } from "./hooks/useHasSignedSla"

async function handleSLAStatus(
  address: `0x${string}` | undefined,
  pathname: string,
  refetch: ReturnType<typeof useHasSignedSla>["refetch"],
) {
  const { data } = await refetch()

  return shouldRedirectSA(address, pathname, Boolean(data?.isSigned))
}

export const AuthProvider = ({ children }: GenericProviderProps) => {
  const { replace } = useRouter()
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const previousAddress = usePrevious(address)
  const { refetch } = useHasSignedSla(address)

  useEffect(() => {
    const checkSARedirection = async () => {
      const redirectionSAResult = await handleSLAStatus(
        address,
        pathname,
        refetch,
      )
      if (redirectionSAResult) {
        replace(redirectionSAResult)
      }
    }

    if (address !== previousAddress) {
      checkSARedirection()
    }
  }, [address, isConnected, previousAddress, refetch])

  return children
}
