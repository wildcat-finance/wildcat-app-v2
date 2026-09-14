"use client"

import { useCallback } from "react"

import { usePathname } from "next/navigation"

import { buildMarketHref } from "@/utils/formatters"
import { lenderMarketOriginOf } from "@/utils/lenderMarketOrigin"

/** Build the destination before a click, including native new-tab navigation. */
export const useMarketHref = () => {
  const from = lenderMarketOriginOf(usePathname())

  return useCallback(
    (marketAddress: string, chainId?: number, baseRoute?: string) =>
      buildMarketHref(marketAddress, chainId, baseRoute, from),
    [from],
  )
}
