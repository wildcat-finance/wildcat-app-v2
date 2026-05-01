import { useQuery } from "@tanstack/react-query"

import {
  aggregateChainStats,
  LandingStats,
} from "@/lib/landing-stats/aggregate"
import {
  fetchEthereumMainnetStats,
  fetchPlasmaMainnetStats,
} from "@/lib/landing-stats/queries"

const STALE_TIME_MS = 5 * 60 * 1000

export function useLandingStats() {
  return useQuery<LandingStats>({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [ethereum, plasma] = await Promise.all([
        fetchEthereumMainnetStats(),
        fetchPlasmaMainnetStats(),
      ])
      return aggregateChainStats([ethereum, plasma])
    },
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
  })
}
