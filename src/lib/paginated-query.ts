import { DocumentNode } from "@apollo/client"

type PageVariables = {
  first: number
  skip: number
}

// Structural client type: the SDK's getSubgraphClient returns an ApolloClient
// from the SDK's own @apollo/client copy, which is not nominally assignable
// to the app's ApolloClient class. Only query() is needed here, and the
// method syntax keeps parameter checking bivariant so both copies fit.
type GraphqlQueryClient = {
  query(options: {
    query: DocumentNode
    variables?: Record<string, unknown>
  }): Promise<{ data?: unknown }>
}

type FetchAllPagesArgs<
  TData,
  TVariables extends Record<string, unknown>,
  TItem,
> = {
  client: GraphqlQueryClient
  query: DocumentNode
  variables: TVariables
  getItems: (data: TData) => TItem[]
  pageSize?: number
}

export const DEFAULT_ANALYTICS_PAGE_SIZE = 1000

export const fetchAllGraphqlPages = async <
  TData,
  TVariables extends Record<string, unknown>,
  TItem,
>({
  client,
  query,
  variables,
  getItems,
  pageSize = DEFAULT_ANALYTICS_PAGE_SIZE,
}: FetchAllPagesArgs<TData, TVariables, TItem>): Promise<TItem[]> => {
  const fetchPage = async (skip: number): Promise<TItem[]> => {
    const result = await client.query({
      query,
      variables: {
        ...variables,
        first: pageSize,
        skip,
      } as TVariables & PageVariables,
    })
    const pageItems = getItems(result.data as TData)

    if (pageItems.length < pageSize) return pageItems
    return pageItems.concat(await fetchPage(skip + pageSize))
  }

  return fetchPage(0)
}
