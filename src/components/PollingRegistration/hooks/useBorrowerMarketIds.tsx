import { useEffect } from "react"

import { useLazyQuery } from "@apollo/client"

import { lazyQueryOptions } from "@/config/subgraph"
import { BORROWER_MARKETS } from "@/graphql/queries"

export const useBorrowerMarketIds = (
  setMarketIds: (ids: string[]) => void,
  address?: string,
) => {
  const [fetchBorrowerMarkets, { data, error }] = useLazyQuery(
    BORROWER_MARKETS,
    lazyQueryOptions,
  )

  useEffect(() => {
    if (data) {
      const ids = data.markets.map((market: { id: string }) => market.id)
      setMarketIds(ids)
    }
  }, [data])

  useEffect(() => {
    if (error) {
      console.error("Error fetching borrower market IDs: ", error)
    }
  }, [error])

  return () => {
    if (address) {
      // address = "0x1717503ee3f56e644cf8b1058e3f83f03a71b2e1" // Testing
      fetchBorrowerMarkets({
        variables: {
          where: {
            borrower: address,
          },
        },
      })
    }
  }
}
