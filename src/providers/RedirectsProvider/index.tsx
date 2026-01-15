"use client"

import { useEffect, useRef } from "react"

import { useRouter, useSelectedLayoutSegments } from "next/navigation"

import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { GenericProviderProps } from "@/providers/interface"
import { ROUTES } from "@/routes"

import { useShouldRedirect } from "./hooks/useShouldRedirect"

const MARKET_ROLE_TO_ROUTE = {
  lender: ROUTES.lender.root,
  borrower: ROUTES.borrower.root,
} as const

export const RedirectsProvider = ({ children }: GenericProviderProps) => {
  const router = useRouter()
  const { data: redirectPath, isFetching } = useShouldRedirect()
  const { targetChainId, chainId: activeChainId } = useCurrentNetwork()
  const segments = useSelectedLayoutSegments()

  const previousNetworkRef = useRef({ targetChainId, activeChainId })

  const [role, secondSegment, marketAddress] = segments
  const isMarketRoute =
    role in MARKET_ROLE_TO_ROUTE &&
    secondSegment === "market" &&
    Boolean(marketAddress)

  useEffect(() => {
    if (redirectPath && !isFetching) {
      router.push(redirectPath)
    }
  }, [router, redirectPath, isFetching])

  useEffect(() => {
    const prev = previousNetworkRef.current

    // detect whether the target and connected networks
    // actually changed eg (not initial render or disconnect)
    const networkChanged =
      (prev.targetChainId &&
        targetChainId &&
        prev.targetChainId !== targetChainId) ||
      (prev.activeChainId &&
        activeChainId &&
        prev.activeChainId !== activeChainId)

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

    previousNetworkRef.current = { targetChainId, activeChainId }
  }, [activeChainId, targetChainId, isMarketRoute, role, router])

  return children
}
