import {
  ApolloClient,
  DocumentNode,
  NormalizedCacheObject,
} from "@apollo/client"

type PageVariables = {
  first: number
  skip: number
}

type FetchAllPagesArgs<
  TData,
  TVariables extends Record<string, unknown>,
  TItem,
> = {
  client: ApolloClient<NormalizedCacheObject>
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
    const result = await client.query<TData, TVariables & PageVariables>({
      query,
      variables: {
        ...variables,
        first: pageSize,
        skip,
      } as TVariables & PageVariables,
    })
    const pageItems = getItems(result.data)

    if (pageItems.length < pageSize) return pageItems
    return pageItems.concat(await fetchPage(skip + pageSize))
  }

  return fetchPage(0)
}
