"use client"

import { useCallback } from "react"

import { usePathname } from "next/navigation"

import {
  BorrowerProfileOrigin,
  buildBorrowerProfileHref,
} from "@/utils/formatters"
import { lenderMarketOriginOf } from "@/utils/lenderMarketOrigin"

/**
 * Profile links from a lender list carry that list, so Back on the profile
 * returns to it - including from a new tab or after a reload. An explicit
 * `from` (the borrower dashboard) takes precedence.
 */
export const useBorrowerProfileHref = () => {
  const origin = lenderMarketOriginOf(usePathname())

  return useCallback(
    (borrowerAddress: string, chainId?: number, from?: BorrowerProfileOrigin) =>
      buildBorrowerProfileHref(borrowerAddress, chainId, from ?? origin),
    [origin],
  )
}
