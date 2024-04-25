"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { usePrevious } from "react-use"

import { GenericProviderProps } from "@/providers/interface"

// TODO: Remove when sure that NextJS middleware redirect works fine
// TODO: Also remove hook useHasSignedSla
// async function handleSLAStatus(
//   refetch: ReturnType<typeof useHasSignedSla>["refetch"],
//   path: string,
//   push: ReturnType<typeof useRouter>["push"],
// ) {
//   const { data } = await refetch()
//
//   if (data) {
//     const { isSigned } = data
//
//     // Do not show agreement page if Wallet connected & signed SA
//     // or if Wallet is not connected
//     const isAgreementPath = path === AGREEMENT_PATH
//     if (isSigned && isAgreementPath) {
//       push("/")
//     }
//
//     // Redirect to agreement page if wallet connected but not signed SA
//     if (!isSigned) {
//       push(AGREEMENT_PATH)
//     }
//   }
// }

export const AuthProvider = ({ children }: GenericProviderProps) => {
  const { refresh } = useRouter()
  const { address, isConnected } = useAccount()
  const previousAddress = usePrevious(address)

  useEffect(() => {
    // Don't check SA on initial render, because it's handled by
    // NextJS router when hitting the url
    const isInitialRender = isConnected && !previousAddress

    if (!isInitialRender && address && address !== previousAddress) {
      refresh()
    }
  }, [address, isConnected])

  return children
}
