import * as React from "react"

import { useQueryClient } from "@tanstack/react-query"

import { BorrowerProfile } from "@/app/api/profiles/interface"
import { QueryKeys } from "@/config/query-keys"
import { fetchMarketSummary } from "@/hooks/useMarketSummary"

const METADATA_STALE_TIME = 5 * 60 * 1000

type MarketDetailPrefetchInput = {
  marketAddress?: string
  borrowerAddress?: string
  chainId?: number
}

export type MarketRowPrefetchTarget = {
  id: string
  borrowerAddress?: string
  chainId?: number
}

const fetchBorrowerProfileForPrefetch = async (
  address: string,
  chainId: number,
): Promise<BorrowerProfile | undefined> => {
  const normalizedAddress = address.toLowerCase() as `0x${string}`
  const response = await fetch(
    `/api/profiles/${normalizedAddress}?chainId=${chainId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  )

  if (response.status === 404) {
    return undefined
  }

  if (!response.ok) {
    throw new Error("Failed to fetch profile")
  }

  const data = await response.json()
  return data.profile ? (data.profile as BorrowerProfile) : undefined
}

const getRowMarketAddress = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return undefined
  }

  return target.closest("[data-id]")?.getAttribute("data-id")?.toLowerCase()
}

export const usePrefetchMarketDetailMetadata = () => {
  const queryClient = useQueryClient()

  return React.useCallback(
    ({
      marketAddress,
      borrowerAddress,
      chainId,
    }: MarketDetailPrefetchInput) => {
      if (!chainId) {
        return
      }

      const normalizedMarket = marketAddress?.toLowerCase()
      if (normalizedMarket) {
        queryClient
          .prefetchQuery({
            queryKey: QueryKeys.Markets.GET_MARKET_SUMMARY(
              chainId,
              normalizedMarket,
            ),
            queryFn: () => fetchMarketSummary(normalizedMarket, chainId),
            staleTime: METADATA_STALE_TIME,
          })
          .catch(() => undefined)
      }

      const normalizedBorrower = borrowerAddress?.toLowerCase()
      if (normalizedBorrower) {
        queryClient
          .prefetchQuery({
            queryKey: QueryKeys.Borrower.GET_PROFILE(
              chainId,
              normalizedBorrower,
            ),
            queryFn: () =>
              fetchBorrowerProfileForPrefetch(normalizedBorrower, chainId),
            staleTime: METADATA_STALE_TIME,
          })
          .catch(() => undefined)
      }
    },
    [queryClient],
  )
}

export const useMarketRowPrefetchHandlers = <T extends MarketRowPrefetchTarget>(
  rows: readonly T[],
) => {
  const prefetchMarketDetailMetadata = usePrefetchMarketDetailMetadata()
  const rowByMarketAddress = React.useMemo(
    () => new Map(rows.map((row) => [row.id.toLowerCase(), row] as const)),
    [rows],
  )

  const prefetchFromEventTarget = React.useCallback(
    (target: EventTarget | null) => {
      const marketAddress = getRowMarketAddress(target)
      if (!marketAddress) {
        return
      }

      const row = rowByMarketAddress.get(marketAddress)
      if (!row) {
        return
      }

      prefetchMarketDetailMetadata({
        marketAddress: row.id,
        borrowerAddress: row.borrowerAddress,
        chainId: row.chainId,
      })
    },
    [prefetchMarketDetailMetadata, rowByMarketAddress],
  )

  return React.useMemo(
    () => ({
      onMouseOver: (event: React.MouseEvent<HTMLElement>) => {
        prefetchFromEventTarget(event.target)
      },
      onFocusCapture: (event: React.FocusEvent<HTMLElement>) => {
        prefetchFromEventTarget(event.target)
      },
    }),
    [prefetchFromEventTarget],
  )
}
