import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"

import { lazyQueryOptions } from "@/config/subgraph"
import { LENDER_MARKETS } from "@/graphql/queries"

export const useLenderMarketIds = (
  setMarketIds: (ids: string[]) => void,
  address?: string,
) => {
  const [fetchLenderMarkets, { data, error }] = useLazyQuery(
    LENDER_MARKETS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      const ids = data.markets.map((market: { id: string }) => market.id)
      setMarketIds(ids)
    }
  }, [data, setMarketIds])

  useEffect(() => {
    if (error) {
      // console.error("Error fetching lender market IDs: ", error)
    }
  }, [error])

  return () => {
    if (address) {
      // address = "0x1717503ee3f56e644cf8b1058e3f83f03a71b2e1" // Testing
      fetchLenderMarkets({
        variables: {
          where: {
            borrower: address,
          },
        },
      })
    }
  }
}
