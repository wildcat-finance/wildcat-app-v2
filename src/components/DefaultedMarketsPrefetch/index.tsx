"use client"

import { useEffect, useLayoutEffect } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import {
  prefetchDefaultedMarkets,
  seedDefaultedMarkets,
} from "@/hooks/useDefaultedMarkets"
import {
  useIsSelectedNetworkRehydrated,
  useSelectedNetwork,
} from "@/hooks/useSelectedNetwork"

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

export const DefaultedMarketsPrefetch = () => {
  const queryClient = useQueryClient()
  const { chainId } = useSelectedNetwork()
  const isNetworkRehydrated = useIsSelectedNetworkRehydrated()

  useIsomorphicLayoutEffect(() => {
    seedDefaultedMarkets(queryClient)
  }, [queryClient])

  useEffect(() => {
    if (!isNetworkRehydrated) return
    prefetchDefaultedMarkets(queryClient, chainId as SupportedChainId)
  }, [queryClient, chainId, isNetworkRehydrated])

  return null
}
