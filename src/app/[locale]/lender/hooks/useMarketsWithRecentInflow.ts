"use client"

import { useCallback } from "react"

import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { useRecentDeposits } from "@/app/[locale]/lender/hooks/useRecentDeposits"

export const useMarketsWithRecentInflow = () => {
  // Shares the recent-deposits query rather than issuing its own windowed
  // variant of the same 1000-row fetch - the explore page mounts both hooks.
  const { data, isLoading, isError } = useRecentDeposits()

  // Qualification is strictly event-based: a market appears in explore
  // categories only if a lender deposit landed inside the window. Fail open
  // on subgraph errors so an indexer outage doesn't blank the explore page.
  const isMarketQualifying = useCallback(
    (account: MarketAccount): boolean =>
      isError ||
      data.marketsWithRecentInflow.has(account.market.address.toLowerCase()),
    [data, isError],
  )

  return { isMarketQualifying, isLoading, isError }
}
