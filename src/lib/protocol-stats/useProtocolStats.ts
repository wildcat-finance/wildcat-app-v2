import { useQuery } from "@tanstack/react-query"

import { aggregateChainStats, ProtocolStats } from "./aggregate"
import { fetchEthereumMainnetStats, fetchPlasmaMainnetStats } from "./queries"

const STALE_TIME_MS = 5 * 60 * 1000

export function useProtocolStats() {
  return useQuery<ProtocolStats>({
    queryKey: ["protocol-stats"],
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
