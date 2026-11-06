"use client"

import { useEffect, useLayoutEffect } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import {
  defaultedMarketsQueryOptions,
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
    queryClient.prefetchQuery(
      defaultedMarketsQueryOptions(chainId as SupportedChainId, queryClient),
    )
  }, [queryClient, chainId, isNetworkRehydrated])

  return null
}
