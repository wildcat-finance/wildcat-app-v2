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

const MARKET_ROLE_TO_ROUTE = {
  lender: ROUTES.lender.root,
  borrower: ROUTES.borrower.root,
} as const

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

  const [role, secondSegment, marketAddress] = segments
  const isMarketRoute =
    role in MARKET_ROLE_TO_ROUTE &&
    secondSegment === "market" &&
    Boolean(marketAddress)

  useEffect(() => {
    if (redirectPath && !isRedirectLoading) {
      router.push(redirectPath)
    }
  }, [router, redirectPath, isRedirectLoading])

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

    if (
      networkChanged &&
      isMarketRoute &&
      role in MARKET_ROLE_TO_ROUTE &&
      role !== "lender"
    ) {
      router.replace(
        MARKET_ROLE_TO_ROUTE[role as keyof typeof MARKET_ROLE_TO_ROUTE],
      )
    }

    previousNetworkRef.current = { selectedChainId, walletChainId }
  }, [isMarketRoute, role, router, selectedChainId, walletChainId])

  return children
}
