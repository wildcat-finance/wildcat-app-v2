"use client"

import { useEffect, useRef } from "react"

import {
  usePathname,
  useRouter,
  useSelectedLayoutSegments,
} from "next/navigation"

import { useNetworkGate } from "@/hooks/useNetworkGate"
import { GenericProviderProps } from "@/providers/interface"
import { ROUTES } from "@/routes"
import { withReturnTarget } from "@/utils/returnTarget"

export const RedirectsProvider = ({ children }: GenericProviderProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const { redirectPath, isRedirectLoading, selectedChainId, walletChainId } =
    useNetworkGate({ pathname })
  const segments = useSelectedLayoutSegments()

  const previousNetworkRef = useRef({
    selectedChainId,
    walletChainId,
  })

  const [role, secondSegment] = segments

  useEffect(() => {
    if (redirectPath && !isRedirectLoading) {
      // Carry the page being left, so the agreement page can return there
      // instead of relying on browser history it does not own.
      router.push(withReturnTarget(redirectPath, pathname))
    }
  }, [router, redirectPath, isRedirectLoading, pathname])

  useEffect(() => {
    const prev = previousNetworkRef.current

    // detect whether the target and connected networks
    // actually changed eg (not initial render or disconnect)
    const networkChanged =
      (prev.selectedChainId &&
        selectedChainId &&
        prev.selectedChainId !== selectedChainId) ||
      (prev.walletChainId &&
        walletChainId &&
        prev.walletChainId !== walletChainId)

    const isBorrowerPolicyRoute =
      role === "borrower" &&
      (secondSegment === "policy" ||
        secondSegment === "edit-policy" ||
        secondSegment === "create-policy")

    if (networkChanged && isBorrowerPolicyRoute) {
      router.replace(ROUTES.borrower.root)
    }

    previousNetworkRef.current = { selectedChainId, walletChainId }
  }, [role, secondSegment, router, selectedChainId, walletChainId])

  return children
}
