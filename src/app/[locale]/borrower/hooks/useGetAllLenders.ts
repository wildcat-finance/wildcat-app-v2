import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  GetAllAuthorizedLendersDocument,
  SubgraphGetAllAuthorizedLendersQuery,
  SubgraphGetAllAuthorizedLendersQueryVariables,
  SubgraphAllAuthorizedLendersViewFragment,
  SubgraphLenderHooksAccessDataFragment,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { useAccount } from "wagmi"

import { POLLING_INTERVAL } from "@/config/polling"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import {
  SubgraphClientType,
  useSubgraphClient,
} from "@/providers/SubgraphProvider"

export const GET_ALL_LENDERS = "GET_ALL_LENDERS"

export type AllLendersData = {
  addresses: string[]
  lenders: {
    [address: string]: SubgraphAllAuthorizedLendersViewFragment & {
      markets: {
        marketIds: string[]
        markets: {
          [address: string]: {
            id: string
            name: string
            controller?: {
              __typename: "Controller"
              authorizedLenders: SubgraphAllAuthorizedLendersViewFragment[]
            }
            hooks?: {
              __typename: "HooksInstance"
              lenders: SubgraphLenderHooksAccessDataFragment[]
            }
          }
        }
      }
    }
  }
}

export const getAllLenders = async (
  subgraphClient: SubgraphClientType,
  address: string,
) => {
  const { data } = await subgraphClient.query<
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
    market.controller?.authorizedLenders.forEach((lender) => {
      const lenderAddress = lender.lender.toLowerCase()

      if (!allLenders.lenders[lenderAddress]) {
        allLenders.addresses.push(lenderAddress)

        allLenders.lenders[lenderAddress] = {
          ...lender,
          markets: {
            marketIds: [market.id],
            markets: {
              [market.id]: {
                id: market.id,
                name: market.name,
                controller: market.controller || undefined,
                hooks: market.hooks || undefined,
              },
            },
          },
        }
      }

      const lenderItem = allLenders.lenders[lenderAddress]

      if (!lenderItem.markets.markets[market.id]) {
        lenderItem.markets.marketIds.push(market.id)
        lenderItem.markets.markets[market.id] = {
          id: market.id,
          name: market.name,
          controller: market.controller || undefined,
          hooks: market.hooks || undefined,
        }
      }
    })
  })

  return allLenders
}

export const useGetAllLenders = () => {
  const { chainId, isWrongNetwork } = useCurrentNetwork()
  const { address } = useAccount()
  const subgraphClient = useSubgraphClient()

  return useQuery({
    queryKey: [GET_ALL_LENDERS, chainId],
    queryFn: () => getAllLenders(subgraphClient, address!),
    refetchInterval: POLLING_INTERVAL,
    enabled: address && !isWrongNetwork,
    placeholderData: keepPreviousData,
  })
}
