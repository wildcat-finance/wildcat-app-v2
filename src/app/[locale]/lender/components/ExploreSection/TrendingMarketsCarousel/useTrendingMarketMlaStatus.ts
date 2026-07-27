import { useQuery } from "@tanstack/react-query"

import { LenderMlaStatusResponse } from "@/app/api/mla/lender-status/interface"
import { QueryKeys } from "@/config/query-keys"

export const useTrendingMarketMlaStatus = (
  chainId: number,
  marketAddresses: string[],
  lenderAddress?: string,
) =>
  useQuery({
    queryKey: QueryKeys.Lender.GET_MLA_SIGNATURE_REQUIREMENTS(
      chainId,
      lenderAddress,
      marketAddresses,
    ),
    queryFn: async () => {
      const searchParams = new URLSearchParams({ chainId: chainId.toString() })
      marketAddresses.forEach((market) => searchParams.append("market", market))
      if (lenderAddress) {
        searchParams.set("lenderAddress", lenderAddress)
      }

      const response = await fetch(`/api/mla/lender-status?${searchParams}`)
      if (!response.ok) throw new Error("Failed to fetch lender MLA status")
      return (await response.json()) as LenderMlaStatusResponse
    },
    enabled: marketAddresses.length > 0,
  })
