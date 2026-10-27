import { useQuery } from "@tanstack/react-query"

// Client side of the Glass Door read API (src/lib/glassdoor/read.ts). Every
// response comes from one publication, so a page's figures share one block.

export type MetricValue = number | string | null
export type MetricValues = Record<string, MetricValue>

export type Comparison = {
  median: number
  /** Graded members (90+ days of record) with a value for this metric. */
  population: number
  /** How many of them this one is better than, when it is graded itself. */
  betterThan?: number
}

export type ProtocolCounts = {
  markets: number
  openMarkets: number
  lateNow: number
  gradedMarkets: number
  borrowers: number
  gradedBorrowers: number
  completedFacilities: number
}

export type Publication = {
  id: string
  kind: "Intraday" | "DayClose"
  day: string | null
  publishedAt: string | null
  cut: { block: number; hash: string; timestamp: number } | null
}

export type EntityState = "Ok" | "UnderReview" | "Preparing"

export type MarketAnalytics = {
  publication: Publication
  market: {
    chainId: number
    address: string
    name: string | null
    symbol: string | null
  }
  state: EntityState
  reason: string | null
  values: MetricValues
  comparisons: Record<string, Comparison>
  protocol: ProtocolCounts | null
  flags: { borrower?: string }
}

export type BorrowerMarketRow = {
  address: string
  name: string | null
  symbol: string | null
  state: EntityState
  values: MetricValues
}

export type BorrowerAnalytics = {
  publication: Publication
  borrower: { chainId: number; address: string }
  state: EntityState
  reason: string | null
  partial: boolean
  values: MetricValues
  comparisons: Record<string, Comparison>
  protocol: ProtocolCounts | null
  markets: BorrowerMarketRow[]
}

export type AnalyticsResult<T> =
  | { status: "ok"; data: T }
  | { status: "preparing" }
  | { status: "unavailable" }

async function read<T>(path: string): Promise<AnalyticsResult<T>> {
  const response = await fetch(path)
  if (response.ok) return { status: "ok", data: (await response.json()) as T }
  if (response.status === 404) {
    const body = (await response.json().catch(() => ({}))) as {
      state?: string
    }
    return body.state === "Preparing"
      ? { status: "preparing" }
      : { status: "unavailable" }
  }
  throw new Error(`Glass Door ${path} answered ${response.status}`)
}

// Publications change every five minutes at most.
const STALE_MS = 60_000

export const useMarketAnalytics = (chainId?: number, address?: string) =>
  useQuery({
    queryKey: ["glassdoor", "market", chainId, address?.toLowerCase()],
    queryFn: () =>
      read<MarketAnalytics>(
        `/api/glassdoor/v1/market/${chainId}/${address!.toLowerCase()}`,
      ),
    enabled: !!chainId && !!address,
    staleTime: STALE_MS,
    retry: 1,
  })

export const useBorrowerAnalytics = (chainId?: number, address?: string) =>
  useQuery({
    queryKey: ["glassdoor", "borrower", chainId, address?.toLowerCase()],
    queryFn: () =>
      read<BorrowerAnalytics>(
        `/api/glassdoor/v1/borrower/${chainId}/${address!.toLowerCase()}`,
      ),
    enabled: !!chainId && !!address,
    staleTime: STALE_MS,
    retry: 1,
  })
