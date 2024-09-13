import { useQuery } from "@tanstack/react-query"
import {
  GetAllAuthorizedLendersDocument,
  SubgraphGetAllAuthorizedLendersQuery,
  SubgraphGetAllAuthorizedLendersQueryVariables,
  SubgraphAllAuthorizedLendersViewFragment,
  SubgraphAllAuthorizedLendersViewMarketInfoFragment,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { SubgraphClient } from "@/config/subgraph"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"

export const GET_ALL_LENDERS = "GET_ALL_LENDERS"

export type AllLendersData = {
  addresses: string[]
  lenders: {
    [address: string]: SubgraphAllAuthorizedLendersViewFragment & {
      markets: {
        marketIds: string[]
        markets: {
          [address: string]: SubgraphAllAuthorizedLendersViewMarketInfoFragment
        }
      }
    }
  }
}

export const getAllLenders = async (address: string) => {
  const { data } = await SubgraphClient.query<
    SubgraphGetAllAuthorizedLendersQuery,
    SubgraphGetAllAuthorizedLendersQueryVariables
  >({
    query: GetAllAuthorizedLendersDocument,
    variables: { borrower: address },
    fetchPolicy: "network-only",
  })

  const allLenders: AllLendersData = {
    addresses: [],
    lenders: {},
  }

  data?.markets.forEach((market) => {
    market.controller.authorizedLenders.forEach((lender) => {
      const lenderAddress = lender.lender.toLowerCase()

      if (!allLenders.lenders[lenderAddress]) {
        allLenders.addresses.push(lenderAddress)

        allLenders.lenders[lenderAddress] = {
          ...lender,
          markets: {
            marketIds: [market.id],
            markets: {
              [market.id]: market,
            },
          },
        }
      }

      const lenderItem = allLenders.lenders[lenderAddress]

      if (!lenderItem.markets.markets[market.id]) {
        lenderItem.markets.marketIds.push(market.id)
        lenderItem.markets.markets[market.id] = market
      }
    })
  })

  return allLenders
}

export const useGetAllLenders = () => {
  const { chainId, isWrongNetwork } = useCurrentNetwork()
  const { address } = useAccount()

  return useQuery({
    queryKey: [GET_ALL_LENDERS, chainId],
    queryFn: () => getAllLenders(address!),
    refetchInterval: POLLING_INTERVAL,
    enabled: address && !isWrongNetwork,
  })
}
