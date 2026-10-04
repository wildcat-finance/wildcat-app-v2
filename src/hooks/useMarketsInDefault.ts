import { useQuery } from "@tanstack/react-query"
import {
  getMarketDefaultStatus,
  Market,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { QueryKeys } from "@/config/query-keys"
import { getAppSubgraphClient } from "@/lib/gateway/client"

const DEFAULT_HISTORY_REFRESH_INTERVAL = 60_000
const MAX_CONCURRENT_HISTORY_READS = 4

/** Count historical defaults only when every market's status can be established. */
export const useMarketsInDefault = (
  markets: Market[] | undefined,
  chainId: SupportedChainId,
): number | undefined => {
  // Copy the SDK inputs: live market objects can be updated during an async read.
  const snapshots = Array.from(
    new Map(
      (markets ?? []).map((market) => [
        `${market.chainId}:${market.address.toLowerCase()}`,
        {
          address: market.address.toLowerCase(),
          chainId: market.chainId,
          defaultedAt: market.defaultedAt,
          lastInterestAccruedTimestamp: market.lastInterestAccruedTimestamp,
          isClosed: market.isClosed,
          isDelinquent: market.isDelinquent,
        },
      ]),
    ).values(),
  ).sort((left, right) => left.address.localeCompare(right.address))
  const validChain = snapshots.every((market) => market.chainId === chainId)

  const query = useQuery({
    queryKey: QueryKeys.Markets.GET_DEFAULT_COUNT(
      chainId,
      snapshots.map((market) => [
        market.address,
        market.defaultedAt ?? null,
        market.isClosed,
        market.isDelinquent,
      ]),
    ),
    enabled: markets !== undefined && validChain && snapshots.length > 0,
    staleTime: DEFAULT_HISTORY_REFRESH_INTERVAL,
    refetchInterval: DEFAULT_HISTORY_REFRESH_INTERVAL,
    retry: false,
    queryFn: async ({ signal }) => {
      const client = getAppSubgraphClient(chainId)
      let nextIndex = 0
      let defaults = 0
      let unavailable = false

      // Bound borrower-wide history requests so a large profile cannot flood the proxy.
      const readNext = async (): Promise<void> => {
        if (unavailable || signal.aborted || nextIndex === snapshots.length) {
          return
        }
        const market = snapshots[nextIndex]
        nextIndex += 1
        try {
          const status = await getMarketDefaultStatus(client, {
            market,
            signal,
          })
          if (status.isDefaulted === undefined) {
            unavailable = true
            return
          }
          if (status.isDefaulted) defaults += 1
        } catch (error) {
          unavailable = true
          throw error
        }
        await readNext()
      }

      await Promise.all(
        Array.from(
          { length: Math.min(MAX_CONCURRENT_HISTORY_READS, snapshots.length) },
          readNext,
        ),
      )
      // React Query requires a defined result; null represents an unavailable count.
      return unavailable || signal.aborted ? null : defaults
    },
  })

  if (markets === undefined || !validChain || query.isError) return undefined
  if (snapshots.length === 0) return 0
  return query.data ?? undefined
}
